const { describe, it } = require("node:test");
const assert = require("node:assert");

require("../helpers/setup");

const etch = require("../../lib/index");

describe("etch.dom", () => {
  it("defaults properties to an empty object", () => {
    let props = null;

    class MyComponent {
      constructor(p) {
        props = p;
      }

      render() {
        return etch.dom("span", null);
      }

      update() {}
    }

    let owner = {
      render() {
        return etch.dom(MyComponent, null);
      },

      update() {},
    };

    etch.initialize(owner);
    assert.deepStrictEqual(props, {});
  });

  it("normalizes camel-cased property names to dash-seperated attributes for SVG tags", function () {
    let component = {
      render() {
        return etch.dom("circle", { colorProfile: "foo", colorRendering: "bar" });
      },
      update() {},
    };

    etch.initialize(component);
    assert.strictEqual(
      component.element.outerHTML,
      '<circle color-profile="foo" color-rendering="bar"></circle>',
    );
  });

  it("supports assigning innerHTML to SVG tags", function () {
    let component = {
      render() {
        return etch.dom("svg", { innerHTML: "<circle></circle>" });
      },
      update() {},
    };

    etch.initialize(component);
    assert.strictEqual(component.element.outerHTML, "<svg><circle></circle></svg>");
  });

  it("ignores nulls and false passed in the place of children, but throws an error if other invalid values are passed", () => {
    const element = etch.render(
      etch.dom("div", null, etch.dom("span", null), null, false, etch.dom("p", null)),
    );

    assert.deepStrictEqual(
      Array.from(element.children).map((c) => c.tagName),
      ["SPAN", "P"],
    );

    assert.throws(() => etch.render(etch.dom("div", null, true)), /Invalid child node: true/);

    assert.throws(
      () => etch.render(etch.dom("div", null, undefined)),
      /Invalid child node: undefined/,
    );

    assert.throws(
      () => etch.render(etch.dom("div", null, () => {})),
      /Invalid child node: \(\) => \{\}/,
    );
  });

  describe("when a component constructor is used as a tag name", () => {
    describe("on initial render", () => {
      it("constructs the component with the specified properties and children, then appends its element to the DOM", () => {
        class ChildComponent {
          constructor(properties, children) {
            this.properties = properties;
            this.children = children;
            etch.initialize(this);
          }

          render() {
            return etch.dom("div", null, this.properties.greeting, " ", this.children);
          }

          update() {}
        }

        let parentComponent = {
          render() {
            return etch.dom(
              "div",
              null,
              etch.dom(ChildComponent, { greeting: "Hello" }, etch.dom("span", null, "World")),
            );
          },

          update() {},
        };

        etch.initialize(parentComponent);
        assert.strictEqual(parentComponent.element.textContent, "Hello World");
      });
    });

    describe("on update", () => {
      describe("if the child component class is the same", () => {
        describe("if the child component defines an update() method", () => {
          it("invokes the update method with the new properties and children", async () => {
            class ChildComponent {
              constructor(properties, children) {
                this.properties = properties;
                this.children = children;
                etch.initialize(this);
              }

              render() {
                return etch.dom("div", null, this.properties.greeting, " ", this.children);
              }

              update(properties, children) {
                this.properties = properties;
                this.children = children;
                etch.update(this);
              }
            }

            let parentComponent = {
              greeting: "Hello",
              greeted: "World",
              render() {
                return etch.dom(
                  "div",
                  null,
                  etch.dom(
                    ChildComponent,
                    { greeting: this.greeting },
                    etch.dom("span", null, this.greeted),
                  ),
                );
              },

              update() {},
            };

            etch.initialize(parentComponent);
            assert.strictEqual(parentComponent.element.textContent, "Hello World");
            let initialChildElement = parentComponent.element.firstChild;

            parentComponent.greeting = "Goodnight";
            parentComponent.greeted = "Moon";
            await etch.update(parentComponent);

            assert.strictEqual(parentComponent.element.textContent, "Goodnight Moon");
            assert.strictEqual(parentComponent.element.firstChild, initialChildElement);
          });
        });

        describe("if the child component does not define an update method", () => {
          it("throws an error", async () => {
            let component = {
              render() {
                return etch.dom("div", null);
              },
            };

            assert.throws(() => etch.initialize(component), Error);
          });
        });
      });

      describe("if the component class changes", () => {
        it("builds a new component instance and replaces the previous element with its element", async () => {
          class ChildComponentA {
            constructor() {
              etch.initialize(this);
            }

            render() {
              return etch.dom("div", null, "A");
            }

            update() {}
          }

          class ChildComponentB {
            constructor() {
              etch.initialize(this);
            }

            render() {
              return etch.dom("div", null, "B");
            }

            update() {}
          }

          let parentComponent = {
            condition: true,

            render() {
              if (this.condition) {
                return etch.dom("div", null, etch.dom(ChildComponentA, null));
              } else {
                return etch.dom("div", null, etch.dom(ChildComponentB, null));
              }
            },

            update() {},
          };

          etch.initialize(parentComponent);
          assert.strictEqual(parentComponent.element.textContent, "A");
          let initialChildElement = parentComponent.element.firstChild;

          parentComponent.condition = false;
          await etch.update(parentComponent);

          assert.strictEqual(parentComponent.element.textContent, "B");
          assert.notStrictEqual(parentComponent.element.firstChild, initialChildElement);
        });
      });

      describe("if components are reordered", () => {
        it("builds a new component instance and replaces the previous element with its element", async () => {
          class ChildComponentA {
            constructor() {
              this.updateCalled = false;
              etch.initialize(this);
            }

            render() {
              return etch.dom("div", null, "A");
            }

            update() {
              this.updateCalled = true;
            }
          }

          class ChildComponentB {
            constructor() {
              this.updateCalled = false;
              etch.initialize(this);
            }

            render() {
              return etch.dom("div", null, "B");
            }

            update() {
              this.updateCalled = true;
            }
          }

          let parentComponent = {
            condition: true,

            render() {
              if (this.condition) {
                return etch.dom(
                  "div",
                  null,
                  etch.dom(ChildComponentA, { key: "a", ref: "a" }),
                  etch.dom(ChildComponentB, { key: "b", ref: "b" }),
                );
              } else {
                return etch.dom(
                  "div",
                  null,
                  etch.dom(ChildComponentB, { key: "b", ref: "b" }),
                  etch.dom(ChildComponentA, { key: "a", ref: "a" }),
                );
              }
            },

            update() {},
          };

          etch.initialize(parentComponent);
          let element = parentComponent.element;
          let childComponentA = parentComponent.refs.a;
          let childComponentB = parentComponent.refs.b;
          let childElementA = element.children[0];
          let childElementB = element.children[1];
          assert.strictEqual(childComponentA.updateCalled, false);
          assert.strictEqual(childComponentB.updateCalled, false);

          parentComponent.condition = false;
          await etch.update(parentComponent);

          assert.strictEqual(element.children[0], childElementB);
          assert.strictEqual(element.children[1], childElementA);
          assert.strictEqual(parentComponent.refs.a, childComponentA);
          assert.strictEqual(parentComponent.refs.a.element, childElementA);
          assert.strictEqual(parentComponent.refs.b, childComponentB);
          assert.strictEqual(parentComponent.refs.b.element, childElementB);
          assert.strictEqual(childComponentA.updateCalled, true);
          assert.strictEqual(childComponentB.updateCalled, true);
        });
      });
    });

    describe("when the child component constructor tag has a ref property", () => {
      it("creates a reference to the child component object on the parent component", async () => {
        class ChildComponentA {
          constructor(properties) {
            this.properties = properties;
            etch.initialize(this);
          }

          render() {
            return etch.dom("div", { ref: "self" }, "A");
          }

          update(properties) {
            this.properties = properties;
          }
        }

        class ChildComponentB {
          constructor(properties) {
            this.properties = properties;
            etch.initialize(this);
          }

          render() {
            return etch.dom("div", { ref: "self" }, "B");
          }

          update() {}
        }

        let parentComponent = {
          renderA: true,
          refName: "child",

          render() {
            if (this.renderA) {
              return etch.dom("div", null, etch.dom(ChildComponentA, { ref: this.refName }));
            } else if (this.renderB) {
              return etch.dom("div", null, etch.dom(ChildComponentB, { ref: this.refName }));
            } else {
              return etch.dom("div", null);
            }
          },

          update() {},
        };

        etch.initialize(parentComponent);

        assert.strictEqual(parentComponent.refs.child instanceof ChildComponentA, true);
        assert.strictEqual(parentComponent.refs.child.properties.ref, "child");
        assert.strictEqual(parentComponent.refs.child.refs.self.textContent, "A");

        parentComponent.refName = "kid";
        await etch.update(parentComponent);

        assert.strictEqual(parentComponent.refs.child, undefined);
        assert.strictEqual(parentComponent.refs.kid instanceof ChildComponentA, true);
        assert.strictEqual(parentComponent.refs.kid.properties.ref, "kid");
        assert.strictEqual(parentComponent.refs.kid.refs.self.textContent, "A");

        parentComponent.refName = "child";
        parentComponent.renderA = false;
        parentComponent.renderB = true;
        await etch.update(parentComponent);

        assert.strictEqual(parentComponent.refs.kid, undefined);
        assert.strictEqual(parentComponent.refs.child instanceof ChildComponentB, true);
        assert.strictEqual(parentComponent.refs.child.properties.ref, "child");
        assert.strictEqual(parentComponent.refs.child.refs.self.textContent, "B");

        parentComponent.renderB = false;
        await etch.update(parentComponent);
        assert.strictEqual("child" in parentComponent.refs, false);
      });

      it("does not delete a reference to a different component when a component is destroyed", async function () {
        class ChildComponentA {
          constructor() {
            etch.initialize(this);
          }

          render() {
            return etch.dom("div", null, "A");
          }

          update(_properties) {}
        }

        class ChildComponentB {
          constructor() {
            etch.initialize(this);
          }

          render() {
            return etch.dom("div", null, "B");
          }

          update() {}
        }

        let parentComponent = {
          condition: true,

          render() {
            if (this.condition) {
              return etch.dom(
                "div",
                null,
                etch.dom("div", null),
                etch.dom(ChildComponentA, { ref: "child" }),
              );
            } else {
              return etch.dom("div", null, etch.dom(ChildComponentB, { ref: "child" }));
            }
          },

          update() {},
        };

        etch.initialize(parentComponent);
        parentComponent.condition = false;
        await etch.update(parentComponent);
        assert.notStrictEqual(parentComponent.refs.child, undefined);
        assert.strictEqual(parentComponent.refs.child.constructor, ChildComponentB);
      });
    });
  });
});
