const { describe, it, afterEach } = require("node:test");
const assert = require("node:assert/strict");
require("../helpers/setup");
const etch = require("../../lib/index");

function manualScheduler() {
  const writes = [];
  const reads = [];
  let resolveFrame;
  const promise = new Promise((resolve) => (resolveFrame = resolve));
  return {
    writes,
    reads,
    updateDocument(callback) {
      writes.push(callback);
    },
    readDocument(callback) {
      reads.push(callback);
    },
    getNextUpdatePromise() {
      return promise;
    },
    drain() {
      while (writes.length) writes.shift()();
      while (reads.length) reads.shift()();
      resolveFrame();
    },
  };
}

describe("destruction with scheduled work", () => {
  afterEach(() => etch.setScheduler(null));

  it("discards queued updates and reads and destroys descendants once", async () => {
    const scheduler = manualScheduler();
    etch.setScheduler(scheduler);
    let childDestructions = 0;
    let parentRenders = 0;
    let reads = 0;
    class Child {
      constructor() {
        etch.initialize(this);
      }
      render() {
        return etch.dom("span", null, "child");
      }
      update() {}
      destroy() {
        childDestructions++;
        etch.destroySync(this);
      }
    }
    const parent = {
      render() {
        parentRenders++;
        return etch.dom("div", null, etch.dom(Child));
      },
      update() {},
      readAfterUpdate() {
        reads++;
      },
    };
    etch.initialize(parent);
    document.body.appendChild(parent.element);
    etch.updateSync(parent);
    const pending = etch.update(parent);
    const rendersBeforeDestruction = parentRenders;
    etch.destroySync(parent);
    etch.destroySync(parent);
    await etch.destroy(parent);
    await etch.update(parent);
    etch.updateSync(parent);
    scheduler.drain();
    await pending;
    assert.equal(parentRenders, rendersBeforeDestruction);
    assert.equal(childDestructions, 1);
    assert.equal(reads, 0);
    assert.equal(parent.element.isConnected, false);
    assert.equal(parent.virtualNode, null);
  });

  it("suppresses an earlier update as soon as asynchronous destruction is requested", async () => {
    const scheduler = manualScheduler();
    etch.setScheduler(scheduler);
    let renders = 0;
    const component = {
      render() {
        renders++;
        return etch.dom("div");
      },
      update() {},
    };
    etch.initialize(component);
    etch.update(component);
    const destruction = etch.destroy(component);
    assert.equal(etch.destroy(component), destruction);
    scheduler.drain();
    await destruction;
    assert.equal(renders, 1);
    assert.equal(component.virtualNode, null);
  });

  it("does not apply an old generation's callback to a reinitialized instance", async () => {
    const scheduler = manualScheduler();
    etch.setScheduler(scheduler);
    let renders = 0;
    const component = {
      render() {
        renders++;
        return etch.dom("div", null, String(renders));
      },
      update() {},
    };
    etch.initialize(component);
    const oldUpdate = etch.update(component);
    etch.destroySync(component);
    etch.initialize(component);
    scheduler.drain();
    await oldUpdate;
    assert.equal(renders, 2);
    assert.equal(component.element.textContent, "2");
    etch.destroySync(component);
  });
});
