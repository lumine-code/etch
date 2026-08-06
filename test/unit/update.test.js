const { describe, it } = require("node:test");
const assert = require("node:assert");

require("../helpers/setup");

const etch = require("../../lib/index");

describe("etch.update(component)", () => {
  it("schedules an update of the element associated with the component", async () => {
    let component = {
      greeting: "Hello",

      render() {
        return etch.dom("div", null, this.greeting, " World");
      },

      update() {},
    };

    etch.initialize(component);
    assert.strictEqual(component.element.textContent, "Hello World");

    component.greeting = "Goodbye";

    await etch.update(component);

    assert.strictEqual(component.element.textContent, "Goodbye World");
  });

  it("updates individual compontents no more than once in a given update cycle", async () => {
    let componentA = {
      renderCount: 0,

      render() {
        this.renderCount++;
        return etch.dom("div", null);
      },

      update() {},
    };

    let componentB = {
      renderCount: 0,

      render() {
        this.renderCount++;
        return etch.dom("div", null);
      },

      update() {},
    };

    etch.initialize(componentA);
    etch.initialize(componentB);

    etch.update(componentA);
    etch.update(componentB);
    etch.update(componentA);
    await etch.update(componentB);

    assert.strictEqual(componentA.renderCount, 2);
    assert.strictEqual(componentB.renderCount, 2);
  });

  it("updates references to DOM elements", async () => {
    let component = {
      condition: true,

      render() {
        if (this.condition) {
          return etch.dom("div", null, etch.dom("span", { ref: "greeting" }, "Hello"));
        } else {
          return etch.dom("div", null, etch.dom("span", { ref: "greeted" }, "World"));
        }
      },

      update() {},
    };
    etch.initialize(component);

    assert.strictEqual(component.refs.greeting.textContent, "Hello");
    assert.strictEqual(component.refs.greeted, undefined);

    component.condition = false;
    await etch.update(component);

    assert.strictEqual(component.refs.greeted.textContent, "World");
    assert.strictEqual(component.refs.greeting, undefined);
  });

  it("calls the destroy method on removed child components if it is present", async () => {
    let destroyCalls = [];

    class ParentComponent {
      constructor() {
        this.renderChildren = true;
        etch.initialize(this);
      }

      render() {
        if (this.renderChildren) {
          return etch.dom(
            "div",
            null,
            etch.dom(ChildComponent, { ref: "child" }),
            etch.dom(ChildComponentWithNoDestroyMethod, { ref: "childWithNoDestroyMethod" }),
          );
        } else {
          return etch.dom("div", null);
        }
      }

      update() {}

      // this method should not be called when we call etch.destroy with this component
      destroy() {
        etch.destroy(this);
        destroyCalls.push(this);
      }
    }

    class ChildComponent {
      constructor() {
        etch.initialize(this);
      }

      render() {
        return etch.dom("div", null, etch.dom(GrandchildComponent, { ref: "grandchild" }));
      }

      update() {}

      destroy() {
        etch.destroy(this);
        destroyCalls.push(this);
      }
    }

    class GrandchildComponent {
      constructor() {
        etch.initialize(this);
      }

      render() {
        return etch.dom("div", null);
      }

      update() {}

      destroy() {
        etch.destroy(this);
        destroyCalls.push(this);
      }
    }

    class ChildComponentWithNoDestroyMethod {
      constructor() {
        etch.initialize(this);
      }

      update() {}

      render() {
        return etch.dom("div", null);
      }
    }

    let parent = new ParentComponent();
    let child = parent.refs.child;
    let grandchild = child.refs.grandchild;

    parent.renderChildren = false;
    await etch.update(parent);

    assert.deepStrictEqual(destroyCalls, [grandchild, child]);
    assert.strictEqual(parent.element.innerHTML, "");
  });

  it("replaces the DOM node when the top-level node type is changed during render", () => {
    class Component {
      constructor() {
        this.renderDiv = true;
        etch.initialize(this);
      }

      render() {
        if (this.renderDiv) {
          return etch.dom("div", null);
        } else {
          return etch.dom("span", null);
        }
      }

      update({ renderDiv }) {
        this.renderDiv = renderDiv;
        etch.updateSync(this);
      }
    }

    const component = new Component();
    const parent = document.createElement("div");
    parent.appendChild(component.element);

    assert.strictEqual(component.element.tagName, "DIV");
    assert.strictEqual(parent.firstChild, component.element);

    component.update({ renderDiv: false });
    assert.strictEqual(component.element.tagName, "SPAN");
    assert.strictEqual(parent.firstChild, component.element);
  });

  describe("when passing false as the second argument", () => {
    it("throws when attempting to change the top-level node type", () => {
      class Component {
        constructor() {
          this.renderDiv = true;
          etch.initialize(this);
        }

        render() {
          if (this.renderDiv) {
            return etch.dom("div", null);
          } else {
            return etch.dom("span", null);
          }
        }

        update() {}
      }

      let component = new Component();
      component.renderDiv = false;

      assert.throws(() => {
        etch.updateSync(component, false);
      }, /root node type/);
    });
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

    await etch.update(parent);

    assert.deepStrictEqual(events, ["child-write", "parent-write", "child-read", "parent-read"]);
  });
});
