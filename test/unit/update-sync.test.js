const { describe, it } = require("node:test");
const assert = require("node:assert");

require("../helpers/setup");

const etch = require("../../lib/index");

describe("etch.updateSync(component)", () => {
  it("performs an update of the component's element and any resulting child updates synchronously", () => {
    class ParentComponent {
      constructor() {
        this.greeting = "Hello";
        this.greeted = "World";
        etch.initialize(this);
      }

      render() {
        return etch.dom(
          "div",
          null,
          etch.dom(ChildComponent, { greeting: this.greeting }),
          " ",
          etch.dom("span", null, this.greeted),
        );
      }

      update() {}
    }

    class ChildComponent {
      constructor({ greeting }) {
        this.greeting = greeting;
        etch.initialize(this);
      }

      render() {
        return etch.dom("span", null, this.greeting);
      }

      update({ greeting }) {
        this.greeting = greeting;
        etch.update(this);
      }
    }

    let component = new ParentComponent();
    assert.strictEqual(component.element.textContent, "Hello World");
    component.greeting = "Goodnight";
    component.greeted = "Moon";
    etch.updateSync(component);
    assert.strictEqual(component.element.textContent, "Goodnight Moon");
  });

  it("calls writeAfterUpdate and readAfterUpdate hooks at the appropriate times", async () => {
    let events = [];

    class ParentComponent {
      constructor() {
        etch.initialize(this);
      }

      render() {
        return etch.dom("div", null, etch.dom(ChildComponent, null));
      }

      update() {
        etch.update(this);
      }

      writeAfterUpdate() {
        events.push("parent-write");
      }

      readAfterUpdate() {
        events.push("parent-read");
      }
    }

    class ChildComponent {
      constructor() {
        etch.initialize(this);
      }

      render() {
        return etch.dom("div", null);
      }

      update() {
        etch.update(this);
      }

      writeAfterUpdate() {
        events.push("child-write");
      }

      readAfterUpdate() {
        events.push("child-read");
      }
    }

    let parent = new ParentComponent();
    assert.deepStrictEqual(events, []);

    etch.updateSync(parent);

    assert.deepStrictEqual(events, ["child-write", "parent-write"]);

    // reads are deferred until the next frame to avoid DOM thrash
    await new Promise(requestAnimationFrame);

    assert.deepStrictEqual(events, ["child-write", "parent-write", "child-read", "parent-read"]);
  });

  it("relays updates to non-etch child components", function () {
    class ParentComponent {
      constructor({ greeting }) {
        this.greeting = greeting;
        etch.initialize(this);
      }

      render() {
        return etch.dom("div", null, etch.dom(ChildComponent, { greeting: this.greeting }));
      }

      update({ greeting }) {
        this.greeting = greeting;
        etch.updateSync(this);
      }
    }

    class ChildComponent {
      constructor({ greeting }) {
        this.element = document.createElement("div");
        this.element.textContent = greeting;
      }

      update({ greeting }) {
        this.element.textContent = greeting;
      }
    }

    let component = new ParentComponent({ greeting: "Hello" });
    assert.strictEqual(component.element.textContent, "Hello");

    component.update({ greeting: "Goodbye" });
    assert.strictEqual(component.element.textContent, "Goodbye");
  });

  it("allows non-etch child components to change their element during updates", function () {
    class ParentComponent {
      constructor({ childNodeType }) {
        this.childNodeType = childNodeType;
        etch.initialize(this);
      }

      render() {
        return etch.dom("div", null, etch.dom(ChildComponent, { nodeType: this.childNodeType }));
      }

      update({ childNodeType }) {
        this.childNodeType = childNodeType;
        etch.updateSync(this);
      }
    }

    class ChildComponent {
      constructor({ nodeType }) {
        this.element = document.createElement(nodeType);
      }

      update({ nodeType }) {
        this.element = document.createElement(nodeType);
      }
    }

    let component = new ParentComponent({ childNodeType: "div" });
    assert.strictEqual(component.element.firstChild.tagName, "DIV");

    component.update({ childNodeType: "span" });
    assert.strictEqual(component.element.firstChild.tagName, "SPAN");
  });

  it("throws a generic exception if undefined is returned from render in a component that is not a class instance", () => {
    let renderItem = true;
    let component = {
      render() {
        return renderItem && etch.dom("div", null);
      },

      update() {},
    };

    etch.initialize(component);
    renderItem = false;
    assert.throws(function () {
      etch.updateSync(component);
    }, /invalid falsy value/);
  });

  it("throws a class-specific exception if undefined is returned from render in a component that is a class instance", () => {
    let renderItem = true;
    class MyComponent {
      render() {
        return renderItem && etch.dom("div", null);
      }

      update() {}
    }

    let component = new MyComponent();
    etch.initialize(component);
    renderItem = false;
    assert.throws(function () {
      etch.updateSync(component);
    }, /invalid falsy value.*in MyComponent/);
  });

  it("throws a class-specific exception if the component instance does not have a valid virtualNode property", () => {
    class MyComponent {
      render() {
        return etch.dom("div", null);
      }
      update() {}
    }

    const component = new MyComponent();

    assert.throws(function () {
      etch.updateSync(component);
    }, /MyComponent instance is not associated with a valid virtualNode/);
  });

  it("throws a class-specific exception if the component instance does not have an element property", () => {
    class MyComponent {
      render() {
        return etch.dom("div", null);
      }
      update() {}
    }

    const component = new MyComponent();
    etch.initialize(component);
    component.element = null;

    assert.throws(function () {
      etch.updateSync(component);
    }, /MyComponent instance is not associated with a DOM element/);
  });

  it("calls destroy on a replaced component", () => {
    let updated = false;
    let destroyed = false;
    class ComponentA {
      constructor() {
        etch.initialize(this);
      }

      update() {}

      render() {
        return etch.dom("div", null, "A");
      }

      destroy() {
        destroyed = true;
        etch.destroy(this);
      }
    }

    class ComponentB {
      constructor() {
        etch.initialize(this);
      }

      update() {}

      render() {
        return etch.dom("div", null, "B");
      }
    }

    let component = {
      render() {
        if (updated) {
          return etch.dom(ComponentB, null);
        } else {
          return etch.dom(ComponentA, null);
        }
      },

      update() {},
    };

    etch.initialize(component);
    assert.strictEqual(component.element.textContent, "A");
    assert.strictEqual(destroyed, false);
    updated = true;
    etch.updateSync(component);
    assert.strictEqual(component.element.textContent, "B");
    assert.strictEqual(destroyed, true);
  });
});
