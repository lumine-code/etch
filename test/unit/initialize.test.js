const { describe, it } = require("node:test");
const assert = require("node:assert");

require("../helpers/setup");

const etch = require("../../lib/index");

describe("etch.initialize(component)", () => {
  it("returns an element with content based on the render method of the given component", () => {
    let component = {
      render() {
        return etch.dom("div", null, "Hello World");
      },

      update() {},
    };
    etch.initialize(component);

    assert.strictEqual(component.element.textContent, "Hello World");
  });

  it("creates references to DOM elements", () => {
    let component = {
      render() {
        return etch.dom(
          "div",
          null,
          etch.dom("span", { ref: "greeting" }, "Hello"),
          " ",
          etch.dom("span", { ref: "greeted" }, "World"),
        );
      },

      update() {},
    };
    etch.initialize(component);

    assert.strictEqual(component.refs.greeting.textContent, "Hello");
    assert.strictEqual(component.refs.greeted.textContent, "World");
  });

  it("updates references to DOM elements", async () => {
    let componentIndexWithRef = 1;
    let component = {
      render() {
        let firstElementProperties = componentIndexWithRef === 0 ? { ref: "selected" } : {};
        let secondElementProperties = componentIndexWithRef === 1 ? { ref: "selected" } : {};
        return etch.dom(
          "ul",
          null,
          etch.dom("li", firstElementProperties, "one"),
          etch.dom("li", secondElementProperties, "two"),
        );
      },

      update() {},
    };
    etch.initialize(component);
    assert.strictEqual(component.refs.selected.textContent, "two");

    componentIndexWithRef = 0;
    await etch.update(component);
    assert.strictEqual(component.refs.selected.textContent, "one");
  });

  it("nests references correctly", async () => {
    class Component {
      constructor(props, children) {
        this.children = children;
        etch.initialize(this);
      }

      update() {}

      render() {
        return etch.dom("div", null, this.children);
      }
    }

    class TestHarness {
      constructor() {
        etch.initialize(this);
      }

      update() {}

      render() {
        return etch.dom(
          Component,
          { ref: "outer" },
          etch.dom(Component, { ref: "middle" }, etch.dom("div", { ref: "inner" })),
        );
      }
    }

    const harness = new TestHarness();
    assert.ok(harness.refs.outer);
    assert.ok(harness.refs.middle);
    assert.ok(harness.refs.inner);
    assert.strictEqual(harness.refs.outer.refs.middle, undefined);
  });

  it("throws an exception if undefined is returned from render", () => {
    let component = {
      render() {},

      update() {},
    };

    assert.throws(function () {
      etch.initialize(component);
    }, /invalid falsy value/);
  });
});
