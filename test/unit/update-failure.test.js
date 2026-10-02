const { describe, it, afterEach } = require("node:test");
const assert = require("node:assert/strict");
require("../helpers/setup");
const etch = require("../../lib/index");

describe("asynchronous update failures", () => {
  afterEach(() => etch.setScheduler(null));

  it("rejects only the failed component, drains peers and recovers on its next update", async () => {
    const writers = [];
    const readers = [];
    let finishFrame;
    const framePromise = new Promise((resolve) => (finishFrame = resolve));
    etch.setScheduler({
      updateDocument(fn) {
        writers.push(fn);
      },
      readDocument(fn) {
        readers.push(fn);
      },
      getNextUpdatePromise() {
        return framePromise;
      },
    });
    const failure = new Error("renderer failed");
    const events = [];
    const broken = {
      failing: false,
      render() {
        if (this.failing) throw failure;
        return etch.dom("div", null, "valid");
      },
      update() {},
    };
    const healthy = {
      value: "before",
      render() {
        return etch.dom("span", null, this.value);
      },
      update() {},
      readAfterUpdate() {
        events.push("healthy read");
      },
    };
    etch.initialize(broken);
    etch.initialize(healthy);
    broken.failing = true;
    healthy.value = "after";
    const rejected = etch.update(broken);
    assert.equal(etch.update(broken), rejected);
    const failureAssertion = assert.rejects(rejected, failure);
    const success = etch.update(healthy).then(() => events.push("healthy settled"));
    while (writers.length) writers.shift()();
    while (readers.length) readers.shift()();
    finishFrame();
    await failureAssertion;
    await success;
    assert.equal(healthy.element.textContent, "after");
    assert.deepEqual(events, ["healthy read", "healthy settled"]);
    assert.equal(broken.element.textContent, "valid");
    broken.failing = false;
    const recovery = etch.update(broken);
    while (writers.length) writers.shift()();
    await recovery;
    assert.equal(broken.element.textContent, "valid");
    etch.destroySync(broken);
    etch.destroySync(healthy);
  });

  it("names a component whose constructor fails to initialize its element", () => {
    class UninitializedComponent {
      update() {}
    }
    const parent = {
      render() {
        return etch.dom("div", null, etch.dom(UninitializedComponent));
      },
      update() {},
    };
    assert.throws(
      () => etch.initialize(parent),
      /UninitializedComponent constructor must initialize a DOM element/,
    );
    etch.destroySync(parent);
  });

  it("rejects a failed scheduled read while finishing healthy reads and the frame", async () => {
    const writers = [];
    const readers = [];
    let finishFrame;
    const framePromise = new Promise((resolve) => (finishFrame = resolve));
    etch.setScheduler({
      updateDocument(fn) {
        writers.push(fn);
      },
      readDocument(fn) {
        readers.push(fn);
      },
      getNextUpdatePromise() {
        return framePromise;
      },
    });
    const failure = new Error("read hook failed");
    let healthyReads = 0;
    const broken = {
      fail: true,
      render() {
        return etch.dom("div");
      },
      update() {},
      readAfterUpdate() {
        if (this.fail) throw failure;
      },
    };
    const healthy = {
      render() {
        return etch.dom("span");
      },
      update() {},
      readAfterUpdate() {
        healthyReads++;
      },
    };
    etch.initialize(broken);
    etch.initialize(healthy);
    const rejected = assert.rejects(etch.update(broken), failure);
    const successful = etch.update(healthy);
    while (writers.length) writers.shift()();
    while (readers.length) readers.shift()();
    finishFrame();
    await rejected;
    await successful;
    assert.equal(healthyReads, 1);
    broken.fail = false;
    const recovery = etch.update(broken);
    while (writers.length) writers.shift()();
    while (readers.length) readers.shift()();
    await recovery;
    etch.destroySync(broken);
    etch.destroySync(healthy);
  });
});
