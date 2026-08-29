const { describe, it } = require("node:test");
const assert = require("node:assert");
const { JSDOM } = require("jsdom");

require("../helpers/setup");

const etch = require("../../lib/index");

describe("multi-document rendering", () => {
  it("creates a component tree in the explicitly selected Document", () => {
    const other = new JSDOM("<!doctype html><html><body></body></html>", {
      pretendToBeVisual: true,
    });

    class Child {
      constructor() {
        etch.initialize(this);
      }

      update() {}

      render() {
        return etch.dom("span", null, "child");
      }
    }

    class Parent {
      constructor() {
        etch.initialize(this, { document: other.window.document });
      }

      update() {}

      render() {
        return etch.dom("div", null, etch.dom(Child));
      }
    }

    const parent = new Parent();
    assert.strictEqual(parent.element.ownerDocument, other.window.document);
    assert.strictEqual(parent.element.firstChild.ownerDocument, other.window.document);
  });

  it("uses the adopted component's current ownerDocument for later patches", () => {
    const other = new JSDOM("<!doctype html><html><body></body></html>", {
      pretendToBeVisual: true,
    });
    const component = {
      expanded: false,
      update() {},
      render() {
        return etch.dom(
          "div",
          null,
          etch.dom("span", null, "existing"),
          this.expanded ? etch.dom("strong", null, "new") : null,
        );
      },
    };
    etch.initialize(component, { document: other.window.document });
    document.adoptNode(component.element);
    document.body.appendChild(component.element);

    component.expanded = true;
    etch.updateSync(component);

    assert.strictEqual(component.element.querySelector("strong").ownerDocument, document);
  });

  it("selects a scheduler by the component's current Document", async () => {
    const other = new JSDOM("<!doctype html><html><body></body></html>", {
      pretendToBeVisual: true,
    });
    const writes = [];
    const scheduler = {
      updateDocument(callback) {
        writes.push(callback);
      },
      getNextUpdatePromise() {
        return Promise.resolve();
      },
      readDocument(callback) {
        callback();
      },
    };
    etch.setSchedulerForDocument(other.window.document, scheduler);
    const component = {
      value: "before",
      update() {},
      render() {
        return etch.dom("div", null, this.value);
      },
    };
    etch.initialize(component, { document: other.window.document });
    component.value = "after";
    await etch.update(component);
    assert.strictEqual(writes.length, 1);
    writes.shift()();
    assert.strictEqual(component.element.textContent, "after");
    etch.setSchedulerForDocument(other.window.document, null);
  });

  it("asks a global scheduler for its document-scoped adapter", async () => {
    const other = new JSDOM("<!doctype html><html><body></body></html>", {
      pretendToBeVisual: true,
    });
    const writes = [];
    const documentScheduler = {
      updateDocument(callback) {
        writes.push(callback);
      },
      getNextUpdatePromise: () => Promise.resolve(),
    };
    const globalScheduler = {
      forDocument: (document) => {
        assert.strictEqual(document, other.window.document);
        return documentScheduler;
      },
    };
    etch.setScheduler(globalScheduler);
    const component = {
      value: "before",
      update() {},
      render() {
        return etch.dom("div", null, this.value);
      },
    };
    etch.initialize(component, { document: other.window.document });
    component.value = "after";
    await etch.update(component);
    writes.shift()();
    assert.strictEqual(component.element.textContent, "after");
    etch.setScheduler(null);
  });

  it("destroys synchronously after its iframe Document loses its Window", async () => {
    const frame = document.createElement("iframe");
    document.body.appendChild(frame);
    const frameDocument = frame.contentDocument;
    const component = {
      update() {},
      render() {
        return etch.dom("div", null, "detached");
      },
    };
    etch.initialize(component, { document: frameDocument });
    frameDocument.body.appendChild(component.element);
    frame.remove();

    // Chromium clears this when the iframe/native surface is destroyed. JSDOM
    // keeps the old Window alive, so reproduce the observable dead-Document
    // state after removing the iframe.
    Object.defineProperty(frameDocument, "defaultView", {
      configurable: true,
      value: null,
    });
    let schedulerRequested = false;
    etch.setScheduler({
      forDocument() {
        schedulerRequested = true;
        throw new Error("A dead Document has no scheduler");
      },
    });

    await etch.destroy(component);

    assert.strictEqual(schedulerRequested, false);
    assert.strictEqual(component.element.parentNode, null);
    etch.setScheduler(null);
  });
});
