// Focused regression tests for defects fixed in the @lumine-code/etch fork.
const { describe, it } = require("node:test");
const assert = require("node:assert");

require("../helpers/setup");

const etch = require("../../lib/index");
const dom = require("../../lib/dom");
const render = require("../../lib/render");
const patch = require("../../lib/patch");
const DefaultScheduler = require("../../lib/default-scheduler");

describe("regressions", () => {
  it("unregisters the attached bound listener after the listener was stable across an update", () => {
    const listenerContext = {};
    const calls = [];
    function listenerA() {
      calls.push(["a", this]);
    }
    function listenerB() {
      calls.push(["b", this]);
    }

    // Initial render binds listenerA to the context and attaches the bound copy.
    const virtualNode1 = dom("div", { on: { evt: listenerA } });
    const element = render(virtualNode1, { listenerContext });

    // An update with an identical listener must carry the bound copy forward...
    const virtualNode2 = dom("div", { on: { evt: listenerA } });
    patch(virtualNode1, virtualNode2, { listenerContext });

    // ...so that a later replacement can unregister the function actually attached.
    const virtualNode3 = dom("div", { on: { evt: listenerB } });
    patch(virtualNode2, virtualNode3, { listenerContext });

    element.dispatchEvent(new CustomEvent("evt"));
    assert.deepStrictEqual(calls, [["b", listenerContext]]);
  });

  it("removes the attached bound listener when the listener is removed after a stable update", () => {
    const listenerContext = {};
    const calls = [];
    function listener() {
      calls.push(this);
    }

    const virtualNode1 = dom("div", { on: { evt: listener } });
    const element = render(virtualNode1, { listenerContext });
    const virtualNode2 = dom("div", { on: { evt: listener } });
    patch(virtualNode1, virtualNode2, { listenerContext });
    const virtualNode3 = dom("div", null);
    patch(virtualNode2, virtualNode3, { listenerContext });

    element.dispatchEvent(new CustomEvent("evt"));
    assert.deepStrictEqual(calls, []);
  });

  it("does not reinsert a removed DOM node when a keyed child changes tag", () => {
    const oldVirtualNode = dom(
      "div",
      null,
      dom("span", { key: "a" }, "a"),
      dom("span", { key: "b" }, "b"),
    );
    const element = render(oldVirtualNode);
    const oldSpanB = oldVirtualNode.children[1].domNode;

    // Matching key 'b' via the keyed lookup, but with a different tag, forces
    // patch to replace the node mid-move.
    const newVirtualNode = dom(
      "div",
      null,
      dom("div", { key: "b" }, "b!"),
      dom("span", { key: "c" }, "c"),
    );
    patch(oldVirtualNode, newVirtualNode);

    assert.strictEqual(
      element.outerHTML,
      render(dom("div", null, dom("div", { key: "b" }, "b!"), dom("span", { key: "c" }, "c")))
        .outerHTML,
    );
    assert.strictEqual(oldSpanB.parentNode, null);
  });

  it("keeps scheduling updates after an update request throws", () => {
    const scheduler = new DefaultScheduler();
    const events = [];
    const frames = [];
    const realRequestAnimationFrame = window.requestAnimationFrame;
    window.requestAnimationFrame = (fn) => frames.push(fn);
    try {
      scheduler.updateDocument(() => {
        throw new Error("boom");
      });
      scheduler.updateDocument(() => events.push("queued before the throw"));
      assert.strictEqual(frames.length, 1);

      // The update throws inside the animation frame.
      assert.throws(() => frames.shift()(), /boom/);

      // The request queued behind the throwing one must be drained on a fresh
      // frame rather than dropped.
      assert.strictEqual(frames.length, 1);
      frames.shift()();
      assert.deepStrictEqual(events, ["queued before the throw"]);

      // The stale frame handle must not block future scheduling.
      scheduler.updateDocument(() => events.push("queued after the throw"));
      assert.strictEqual(frames.length, 1);
      frames.shift()();
      assert.deepStrictEqual(events, ["queued before the throw", "queued after the throw"]);
    } finally {
      window.requestAnimationFrame = realRequestAnimationFrame;
    }
  });

  it("does not treat props named after Object.prototype members as event listeners", () => {
    const virtualNode = dom("div", { constructor: "x", toString: "y" });
    assert.strictEqual(virtualNode.props.on, undefined);

    const element = render(virtualNode);
    assert.strictEqual(element.constructor, "x");
    assert.strictEqual(element.toString, "y");
  });

  it("does not assign the value of a textarea when it is unchanged", () => {
    const virtualNode1 = dom("textarea", { value: "pig" });
    const element = render(virtualNode1);

    // Assume the user typed an additional character.
    element.value = "ping";

    // Count value assignments: browsers may reset the cursor position on any
    // assignment, even one that does not change the value.
    let assignments = 0;
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value");
    Object.defineProperty(element, "value", {
      configurable: true,
      get() {
        return descriptor.get.call(this);
      },
      set(newValue) {
        assignments++;
        descriptor.set.call(this, newValue);
      },
    });

    const virtualNode2 = dom("textarea", { value: "ping" });
    patch(virtualNode1, virtualNode2);
    assert.strictEqual(assignments, 0);
    assert.strictEqual(element.value, "ping");
  });

  it("does not write to a text node whose content is unchanged", () => {
    const virtualNode1 = dom("div", null, "hello");
    const element = render(virtualNode1);
    const textNode = element.firstChild;

    const observer = new window.MutationObserver(() => {});
    observer.observe(textNode, { characterData: true });

    const virtualNode2 = dom("div", null, "hello");
    patch(virtualNode1, virtualNode2);
    assert.strictEqual(observer.takeRecords().length, 0);

    const virtualNode3 = dom("div", null, "goodbye");
    patch(virtualNode2, virtualNode3);
    assert.strictEqual(element.textContent, "goodbye");
    assert.ok(observer.takeRecords().length > 0);

    observer.disconnect();
  });

  it("stays in asynchronous update mode after updateSync throws on a root node type change", async () => {
    class ThrowingComponent {
      constructor() {
        this.renderDiv = true;
        etch.initialize(this);
      }
      render() {
        return this.renderDiv ? dom("div", null) : dom("span", null);
      }
      update() {}
    }

    const throwing = new ThrowingComponent();
    throwing.renderDiv = false;
    assert.throws(() => etch.updateSync(throwing, false), /root node type/);

    // The failed synchronous update must not leak its in-progress counter:
    // a subsequent etch.update must run asynchronously with read hooks
    // completing before its promise resolves.
    const events = [];
    const component = {
      render() {
        return dom("div", null);
      },
      update() {},
      writeAfterUpdate() {
        events.push("write");
      },
      readAfterUpdate() {
        events.push("read");
      },
    };
    etch.initialize(component);
    await etch.update(component);
    assert.deepStrictEqual(events, ["write", "read"]);
  });
});
