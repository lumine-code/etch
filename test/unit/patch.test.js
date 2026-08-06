const { describe, it } = require("node:test");
const assert = require("node:assert");

require("../helpers/setup");

const dom = require("../../lib/dom");
const render = require("../../lib/render");
const patch = require("../../lib/patch");

describe("patch (oldVirtualNode, newVirtualNode)", () => {
  describe("properties", function () {
    it("can add, remove, and update properties", function () {
      assertValidPatch(dom("div", { a: "1", b: "2" }), dom("div", { b: "3", c: "4" }));
    });

    it("can update from no properties to some properties and vice versa", function () {
      assertValidPatch(dom("div", null), dom("div", { a: "1" }));
      assertValidPatch(dom("div", { a: "1" }), dom("div", null));
    });

    it("correctly updates the `dataset` property", function () {
      assertValidPatch(dom("div", null), dom("div", { dataset: { a: 1, b: 2 } }));
      assertValidPatch(
        dom("div", { dataset: { a: 1, b: 2 } }),
        dom("div", { dataset: { b: 4, c: 6 } }),
      );
    });

    it("correctly updates the `style` property", function () {
      assertValidPatch(dom("div", null), dom("div", { style: { display: "none", color: "red" } }));
      assertValidPatch(
        dom("div", { style: { display: "none", color: "red" } }),
        dom("div", { style: { color: "blue", fontFamily: "monospace" } }),
      );
      assertValidPatch(
        dom("div", { style: { display: "none", color: "red" } }),
        dom("div", { style: "color: 'blue'; fontFamily: 'monospace'" }),
      );
      assertValidPatch(
        dom("div", { style: "color: blue; font-family: monospace;" }),
        dom("div", { style: { display: "none", color: "red" } }),
      );
    });

    it("correctly updates the `className` property", function () {
      assertValidPatch(dom("div", null), dom("div", { className: "a" }));
      assertValidPatch(dom("div", { className: "a" }), dom("div", { className: "b" }));

      const oldVirtualNode = dom("div", { className: "b" });
      const oldNode = render(oldVirtualNode);
      patch(oldVirtualNode, dom("div", null));
      assert(!oldNode.className);
    });

    it("correctly updates the `input.value` property", function () {
      const virtualNode1 = dom("input", { type: "text", value: "pig" });
      const element = render(virtualNode1);

      // Assume the user changed the value to `ping` by
      // moving the cursor after the `i` and adding `n`.
      // The new value is now `ping` and the cursor
      // position is after the `n` on index 3
      element.value = "ping";
      element.selectionStart = 3;
      element.selectionEnd = 3;

      // Assume that the input is a "controlled" input so
      // it updates the virtual node with the same value
      const virtualNode2 = dom("input", { type: "text", value: "ping" });
      patch(virtualNode1, virtualNode2);

      // the selection should have stayed in the same position
      assert.equal(element.selectionStart, 3);
      assert.equal(element.selectionEnd, 3);
    });

    it("allows attributes to be updated via the special `attributes` property", () => {
      const virtualNode1 = dom("div", { attributes: { a: 1, b: 2 } });
      const element = render(virtualNode1);
      assert.equal(element.getAttribute("a"), "1");
      assert.equal(element.getAttribute("b"), "2");

      const virtualNode2 = dom("div", { attributes: { b: 3, c: 4 } });
      patch(virtualNode1, virtualNode2);
      assert(!element.hasAttribute("a"));
      assert.equal(element.getAttribute("b"), "3");
      assert.equal(element.getAttribute("c"), "4");
    });
  });

  describe("keyed children", function () {
    it("can add and remove children at the end", function () {
      assertValidPatch(
        dom("div", null, keyedSpans("a", "b")),
        dom("div", null, keyedSpans("a", "b", "c", "d")),
      );
      assertValidPatch(
        dom("div", null, keyedSpans("a", "b", "c", "d")),
        dom("div", null, keyedSpans("a", "b")),
      );
    });

    it("can add and remove children at the beginning", function () {
      assertValidPatch(
        dom("div", null, keyedSpans("c", "d")),
        dom("div", null, keyedSpans("a", "b", "c", "d")),
      );
      assertValidPatch(
        dom("div", null, keyedSpans("a", "b", "c", "d")),
        dom("div", null, keyedSpans("c", "d")),
      );
    });

    it("can add and remove in the middle of existing children", function () {
      assertValidPatch(
        dom("div", null, keyedSpans("a", "d")),
        dom("div", null, keyedSpans("a", "b", "c", "d")),
      );
      assertValidPatch(
        dom("div", null, keyedSpans("a", "b", "c", "d")),
        dom("div", null, keyedSpans("a", "d")),
      );
    });

    it("can add and remove children at both ends", function () {
      assertValidPatch(
        dom("div", null, keyedSpans("c", "d")),
        dom("div", null, keyedSpans("a", "b", "c", "d", "e", "f")),
      );
      assertValidPatch(
        dom("div", null, keyedSpans("a", "b", "c", "d", "e", "f")),
        dom("div", null, keyedSpans("c", "d")),
      );
    });

    it("can add children to an empty parent and remove all children", function () {
      assertValidPatch(dom("div", null), dom("div", null, keyedSpans("a", "b")));
      assertValidPatch(dom("div", null, keyedSpans("a", "b")), dom("div", null));
    });

    it("can move children to the right and left", function () {
      assertValidPatch(
        dom("div", null, keyedSpans("a", "b", "c", "d")),
        dom("div", null, keyedSpans("b", "c", "a", "d")),
      );
      assertValidPatch(
        dom("div", null, keyedSpans("a", "b", "c", "d")),
        dom("div", null, keyedSpans("a", "d", "b", "c")),
      );
    });

    it("can move children to the start and end", function () {
      assertValidPatch(
        dom("div", null, keyedSpans("a", "b", "c", "d")),
        dom("div", null, keyedSpans("a", "c", "d", "b")),
      );
      assertValidPatch(
        dom("div", null, keyedSpans("a", "b", "c", "d")),
        dom("div", null, keyedSpans("c", "a", "b", "d")),
      );
    });

    it("can swap the first and last child", function () {
      assertValidPatch(
        dom("div", null, keyedSpans("a", "b", "c", "d")),
        dom("div", null, keyedSpans("d", "c", "d", "a")),
      );
    });

    it("can update to randomized reorderings of children", function () {
      for (let i = 0; i < 20; i++) {
        const seed = Date.now();
        const randomGenerator = createRandom(seed);
        assertValidPatch(
          dom("div", null, keyedSpans(...randomLetters(randomGenerator))),
          dom("div", null, keyedSpans(...randomLetters(randomGenerator))),
          seed,
        );
      }
    });

    it("allows arbitrary objects to be used as keys", () => {
      const keyA = { key: "a" };
      const keyB = { key: "b" };
      const keyC = { key: "c" };
      const keyD = { key: "c" };

      class ChildComponent {
        constructor(props) {
          this.element = document.createElement("div");
          this.element.textContent = props.text;
        }

        update(props) {
          this.element.textContent = props.text;
        }
      }

      const virtualNode1 = dom(
        "div",
        null,
        dom(ChildComponent, { key: keyA, text: "a" }),
        dom(ChildComponent, { key: keyB, text: "b" }),
      );

      const element = render(virtualNode1);
      const [elementA, elementB] = element.children;

      const virtualNode2 = dom(
        "div",
        null,
        dom(ChildComponent, { key: keyB, text: "d" }),
        dom(ChildComponent, { key: keyD, text: "y" }),
        dom(ChildComponent, { key: keyA, text: "c" }),
        dom(ChildComponent, { key: keyC, text: "x" }),
      );

      patch(virtualNode1, virtualNode2);

      assert.equal(element.children[0], elementB);
      assert.equal(element.children[2], elementA);
      assert.equal(elementA.textContent, "c");
      assert.equal(elementB.textContent, "d");
    });
  });

  describe("unkeyed children", function () {
    it("can append nodes", function () {
      assertValidPatch(
        dom("div", null, dom("span", null, "Hello")),
        dom("div", null, dom("span", null, "Hello"), dom("span", null, "World")),
      );
      assertValidPatch(
        dom("div", null, dom("span", null, "Hello")),
        dom("div", null, dom("span", null, "Hello"), dom("div", null, "World")),
      );
    });

    it("can prepend nodes", function () {
      assertValidPatch(
        dom("div", null, dom("span", null, "World")),
        dom("div", null, dom("span", null, "Hello"), dom("span", null, "World")),
      );
      assertValidPatch(
        dom("div", null, dom("div", null, "World")),
        dom("div", null, dom("span", null, "Hello"), dom("div", null, "World")),
      );
    });

    it("can change text children", function () {
      assertValidPatch(
        dom("div", null, dom("span", null, "Hello"), dom("span", null, "World")),
        dom("div", null, dom("span", null, "Goodnight"), dom("span", null, "Moon")),
      );
    });

    it("can handle text children that are empty", function () {
      assertValidPatch(
        dom("div", null, dom("span", null, "Hello")),
        dom("div", null, dom("span", null, "")),
      );
      assertValidPatch(
        dom("div", null, dom("span", null, "")),
        dom("div", null, dom("span", null, "Hello")),
      );
    });

    it("can replace a child with a text child and vice versa", function () {
      assertValidPatch(
        dom("div", null, dom("span", null, "Hello"), dom("span", null, "World")),
        dom("div", null, "Goodnight", dom("span", null, "World")),
      );
      assertValidPatch(
        dom("div", null, "Goodnight", dom("span", null, "World")),
        dom("div", null, dom("span", null, "Hello"), dom("span", null, "World")),
      );
      assertValidPatch(
        dom("div", null, dom("span", null, "Hello"), "World"),
        dom("div", null, "Goodnight", dom("span", null, "Moon")),
      );
    });

    it("can update to randomized reorderings of children", function () {
      for (let i = 0; i < 20; i++) {
        const seed = Date.now();
        const randomGenerator = createRandom(seed);
        assertValidPatch(
          dom("div", null, spans(...randomLetters(randomGenerator))),
          dom("div", null, spans(...randomLetters(randomGenerator))),
          seed,
        );
      }
    });
  });

  it("can replace a node with a node of a different type", function () {
    const parent = render(dom("div", null));
    const oldVirtualNode = dom("div", null, "Hello");
    const oldNode = render(oldVirtualNode);
    parent.appendChild(oldNode);
    const newNode = patch(oldVirtualNode, dom("span", null, "Goodbye"));
    assert.equal(newNode.outerHTML, "<span>Goodbye</span>");
    assert.equal(parent.children.length, 1);
    assert.strictEqual(parent.children[0], newNode);
  });

  describe("ref properties", function () {
    it("maintains references to child elements based on their `ref` property", function () {
      const refs = {};

      const virtualNode1 = dom(
        "div",
        { ref: "a", class: "a" },
        dom("div", { ref: "b", class: "b" }),
        dom("div", { ref: "c", class: "c" }, dom("div", { ref: "d", class: "d" })),
        dom("div", { ref: "e", class: "e" }),
      );

      let element1 = render(virtualNode1, { refs });

      assert.equal(refs.a, element1);
      assert.equal(refs.b, element1.querySelector(".b"));
      assert.equal(refs.c, element1.querySelector(".c"));
      assert.equal(refs.d, element1.querySelector(".d"));
      assert.equal(refs.e, element1.querySelector(".e"));

      const virtualNode2 = dom(
        "div",
        { class: "a" },
        dom("div", { ref: "e", class: "b" }),
        dom("span", { ref: "f", class: "e" }),
        dom("p", { ref: "g", class: "g" }),
      );

      patch(virtualNode1, virtualNode2, { refs });

      assert(!Object.hasOwn(refs, "a"));
      assert(!Object.hasOwn(refs, "b"));
      assert(!Object.hasOwn(refs, "c"));
      assert(!Object.hasOwn(refs, "d"));
      assert.equal(refs.e, element1.querySelector(".b"));
      assert.equal(refs.f, element1.querySelector(".e"));
      assert.equal(refs.g, element1.querySelector(".g"));

      const virtualNode3 = dom("span", { ref: "h" });
      const element2 = patch(virtualNode2, virtualNode3, { refs });
      assert(!Object.hasOwn(refs, "e"));
      assert(!Object.hasOwn(refs, "f"));
      assert(!Object.hasOwn(refs, "g"));
      assert.equal(refs.h, element2);
    });

    it("maintains references to child component instances based on their `ref` property", function () {
      class ChildComponentA {
        constructor(_props) {
          this.element = document.createElement("div");
        }

        update(_props) {}
      }

      class ChildComponentB {
        constructor(_props) {
          this.element = document.createElement("div");
        }

        update(_props) {}
      }

      const refs = {};
      const virtualNode1 = dom("div", null, dom(ChildComponentA, { ref: "child" }));
      render(virtualNode1, { refs });
      assert(refs.child instanceof ChildComponentA);

      const virtualNode2 = dom("div", null, dom(ChildComponentA, { ref: "kid" }));
      patch(virtualNode1, virtualNode2, { refs });
      assert(!refs.child, "Old ref was deleted");
      assert(refs.kid instanceof ChildComponentA);

      const virtualNode3 = dom("div", null, dom(ChildComponentB, { ref: "child" }));
      patch(virtualNode2, virtualNode3, { refs });
      assert(!refs.kid, "Old ref was deleted");
      assert(refs.child instanceof ChildComponentB);

      const virtualNode4 = dom("div", null, dom(ChildComponentA, { ref: "child" }));
      patch(virtualNode3, virtualNode4, { refs });
      assert(refs.child instanceof ChildComponentA);
    });
  });

  describe("event handlers", function () {
    it("registers event handlers from the `on` property", function () {
      let listenerCalls = [];
      function recordEvent(event) {
        listenerCalls.push({ context: this, event });
      }

      const virtualNode1 = dom("div", {
        on: {
          a: recordEvent,
          b: recordEvent,
        },
      });
      const element = render(virtualNode1);

      element.dispatchEvent(new CustomEvent("a"));
      element.dispatchEvent(new CustomEvent("b"));
      assert.equal(listenerCalls.length, 2);
      assert.equal(listenerCalls[0].context, element);
      assert.equal(listenerCalls[0].event.type, "a");
      assert.equal(listenerCalls[1].context, element);
      assert.equal(listenerCalls[1].event.type, "b");

      const virtualNode2 = dom("div", {
        on: {
          b: recordEvent,
          c: recordEvent,
        },
      });
      patch(virtualNode1, virtualNode2);

      listenerCalls = [];
      element.dispatchEvent(new CustomEvent("a"));
      element.dispatchEvent(new CustomEvent("b"));
      element.dispatchEvent(new CustomEvent("c"));
      assert.equal(listenerCalls.length, 2);
      assert.equal(listenerCalls[0].context, element);
      assert.equal(listenerCalls[0].event.type, "b");
      assert.equal(listenerCalls[1].context, element);
      assert.equal(listenerCalls[1].event.type, "c");

      const virtualNode3 = dom("div", null);
      patch(virtualNode2, virtualNode3);
      listenerCalls = [];
      element.dispatchEvent(new CustomEvent("a"));
      element.dispatchEvent(new CustomEvent("b"));
      element.dispatchEvent(new CustomEvent("c"));
      assert.equal(listenerCalls.length, 0);
    });

    it("binds event listeners with the specified `listenerContext` value, if provided", function () {
      const listenerContext = {};
      let listenerCalls = [];
      function recordEvent(event) {
        listenerCalls.push({ context: this, event });
      }

      const virtualNode1 = dom("div", { on: { a: recordEvent } });
      const element = render(virtualNode1, { listenerContext });

      element.dispatchEvent(new CustomEvent("a"));
      assert.equal(listenerCalls.length, 1);
      assert.equal(listenerCalls[0].context, listenerContext);
      assert.equal(listenerCalls[0].event.type, "a");

      const virtualNode2 = dom("div", { on: { b: recordEvent } });
      patch(virtualNode1, virtualNode2, { listenerContext });

      listenerCalls = [];
      element.dispatchEvent(new CustomEvent("a"));
      element.dispatchEvent(new CustomEvent("b"));
      assert.equal(listenerCalls.length, 1);
      assert.equal(listenerCalls[0].context, listenerContext);
      assert.equal(listenerCalls[0].event.type, "b");
    });

    it("allows event listeners to be nulled", function () {
      const virtualNode1 = dom("div", { onClick: () => {} });
      const virtualNode2 = dom("div", { onClick: null });
      render(virtualNode1);
      assert.doesNotThrow(() => {
        patch(virtualNode1, virtualNode2, { listenerContext: {} });
      }, "Cannot read property 'bind' of null");
    });

    it("allows standard event listeners to be specified as props like onClick or onMouseDown", function () {
      let listenerCalls = [];
      function recordEvent(event) {
        listenerCalls.push(event);
      }
      const element = render(dom("div", { onClick: recordEvent, onMouseDown: recordEvent }));

      element.dispatchEvent(new MouseEvent("click"));
      element.dispatchEvent(new MouseEvent("mousedown"));
      assert.equal(listenerCalls.length, 2);
      assert.equal(listenerCalls[0].type, "click");
      assert.equal(listenerCalls[1].type, "mousedown");
    });
  });

  describe("child components", function () {
    it("can insert, update, and remove components", function () {
      class Component {
        constructor(props, children) {
          this.props = props;
          this.children = children;
          this.updateCount = 0;
          this.destroyCount = 0;
          this.virtualNode = this.render();
          this.element = render(this.virtualNode);
        }

        update(props, children) {
          this.props = props;
          this.children = children;
          this.updateCount++;
          const oldVirtualNode = this.virtualNode;
          this.virtualNode = this.render();
          patch(oldVirtualNode, this.virtualNode);
        }

        destroy() {
          this.destroyCount++;
        }

        render() {
          return dom("div", { class: this.props.class }, this.children);
        }
      }

      const refs = {};
      const virtualNode1 = dom("div", null);
      const element = render(virtualNode1, { refs });
      const virtualNode2 = dom(
        "div",
        null,
        dom(
          Component,
          { ref: "component", class: "child-component" },
          dom("div", null),
          dom("span", null),
        ),
      );

      patch(virtualNode1, virtualNode2, { refs });
      const component = refs.component;
      assert.equal(element.firstChild, component.element);
      assert.equal(
        element.outerHTML,
        render(
          dom(
            "div",
            null,
            dom("div", { class: "child-component" }, dom("div", null), dom("span", null)),
          ),
        ).outerHTML,
      );

      const virtualNode3 = dom(
        "div",
        null,
        dom(Component, { ref: "component", class: "kid-component" }, dom("p", null)),
      );

      patch(virtualNode2, virtualNode3, { refs });
      assert.equal(component.updateCount, 1);
      assert.equal(
        element.outerHTML,
        render(dom("div", null, dom("div", { class: "kid-component" }, dom("p", null)))).outerHTML,
      );

      const virtualNode4 = dom("div", null);
      patch(virtualNode3, virtualNode4, { refs });
      assert.equal(component.updateCount, 1);
      assert.equal(component.destroyCount, 1);
      assert.equal(element.outerHTML, render(dom("div", null)).outerHTML);
    });

    it("can replace normal elements with components and vice-versa", () => {
      class Component {
        constructor() {
          this.element = render(dom("span", null));
        }
        update() {}
      }

      const refs = {};
      const virtualNode1 = dom("div", null, dom("div", { ref: "a" }));
      const element = render(virtualNode1, { refs });
      const virtualNode2 = dom("div", null, dom(Component, { ref: "a" }));
      patch(virtualNode1, virtualNode2, { refs });

      assert.equal(element.outerHTML, "<div><span></span></div>");
      assert(refs.a instanceof Component);

      const virtualNode3 = dom("div", null, dom("a", { ref: "a" }));
      patch(virtualNode2, virtualNode3, { refs });
      assert.equal(element.outerHTML, "<div><a></a></div>");
      assert(refs.a instanceof HTMLElement);
    });

    it("can handle components that change their root element during update", () => {
      class Component {
        constructor(props) {
          this.element = document.createElement(props.rootElement);
        }
        update(props) {
          this.element = document.createElement(props.rootElement);
        }
      }

      const refs = {};
      const virtualNode1 = dom("div", null, dom(Component, { rootElement: "div" }));
      const element = render(virtualNode1);
      assert.equal(element.outerHTML, "<div><div></div></div>");

      const virtualNode2 = dom("div", null, dom(Component, { rootElement: "span" }));
      patch(virtualNode1, virtualNode2, { refs });
      assert.equal(element.outerHTML, "<div><span></span></div>");

      const virtualNode3 = dom("div", null, dom(Component, { rootElement: "a" }));
      patch(virtualNode2, virtualNode3, { refs });
      assert.equal(element.outerHTML, "<div><a></a></div>");
    });
  });

  describe("svg elements", function () {
    it("can insert, delete, update and move nodes", function () {
      assertValidPatch(
        dom(
          "svg",
          null,
          dom("text", null, "Hello, world"),
          dom("circle", { strokeWidth: "3" }),
          dom("ellipse", { cx: "2" }),
        ),
        dom(
          "svg",
          null,
          dom("text", null, "Goodbye, moon"),
          dom("path", { cx: "1" }),
          dom("circle", { strokeWidth: "5" }),
          dom("g", { fill: "none" }, dom("path", { stroke: "red" })),
        ),
      );
    });

    it("can update the innerHTML property", function () {
      assertValidPatch(
        dom("svg", { innerHTML: "<circle></circle>" }),
        dom("svg", { innerHTML: "<ellipse></ellipse>" }),
      );
    });
  });
});

function assertValidPatch(oldVirtualNode, newVirtualNode, seed) {
  const node = render(oldVirtualNode);
  patch(oldVirtualNode, newVirtualNode);
  const message = seed != null ? `Invalid patch for seed ${seed}` : undefined;
  assert.equal(node.outerHTML, render(newVirtualNode).outerHTML, message);
}

function spans(...elements) {
  return elements.map((element) => dom("span", null, element));
}

function keyedSpans(...elements) {
  return elements.map((element) => dom("span", { key: element }, element));
}

// Deterministic seeded PRNG (mulberry32) returning integers in [0, max).
function createRandom(seed) {
  let state = seed >>> 0;
  return function (max) {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * max);
  };
}

function randomLetters(randomGenerator) {
  const letters = [];
  const usedLetters = new Set();
  const count = randomGenerator(27);

  for (let i = 0; i < count; i++) {
    const letter = String.fromCharCode("a".charCodeAt(0) + randomGenerator(27));
    if (!usedLetters.has(letter)) {
      letters.push(letter);
      usedLetters.add(letter);
    }
  }

  return letters;
}
