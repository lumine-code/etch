const { describe, it } = require("node:test");
const assert = require("node:assert");

require("../helpers/setup");

const etch = require("../../lib/index");
const $ = etch.dom;

// A notebook output view died in insertBefore because a child component had
// swapped its root element OUTSIDE the parent's patch pass. The child's
// update(props) scheduled its re-render on another copy of etch (each package
// carries its own node_modules copy, with its own syncUpdatesInProgressCounter),
// so the root swap ran a frame after the parent recorded `domNode` — and the
// parent's next structural diff used the detached node as an insertBefore
// reference. The same staleness arises single-copy whenever a component's
// self-update swaps its root between patches of the enclosing tree.
//
// Swappy models the deferred update: update(props) applies nothing (as if
// scheduled elsewhere), and swapRoot() is the out-of-band self-update that
// replaces the component's root element.

class Swappy {
  constructor(props) {
    this.props = props;
    this.tagName = "span";
    etch.initialize(this);
  }

  render() {
    return $(this.tagName, null, "swappy");
  }

  update(props) {
    this.props = props;
    return Promise.resolve();
  }

  swapRoot(tagName) {
    this.tagName = tagName;
    etch.updateSync(this);
  }

  destroy() {
    return etch.destroy(this);
  }
}

// Identical, but with no destroy method: removal must still take the
// component's current element out of the DOM.
class SwappyNoDestroy {
  constructor(props) {
    this.props = props;
    this.tagName = "span";
    etch.initialize(this);
  }

  render() {
    return $(this.tagName, null, "swappy");
  }

  update(props) {
    this.props = props;
    return Promise.resolve();
  }

  swapRoot(tagName) {
    this.tagName = tagName;
    etch.updateSync(this);
  }
}

function makeParent(renderChildren) {
  const parent = {
    renderChildren,
    render() {
      return $("div", null, ...this.renderChildren());
    },
    update() {},
  };
  etch.initialize(parent);
  return parent;
}

function childTags(parent) {
  return Array.from(parent.element.children).map((child) => child.tagName.toLowerCase());
}

describe("a child component whose root element swapped between patches", () => {
  it("inserts a new unmatched child using the component's current element as the reference", () => {
    // old [Swappy(a), div(b)] → new [div(c), div(b)]: the ends match and heal,
    // leaving old [Swappy(a)] vs new [div(c)] — an unmatched insert whose
    // reference node is the swapped component.
    let children = [$(Swappy, { key: "a", ref: "swappy" }), $("div", { key: "b" })];
    const parent = makeParent(() => children);
    parent.refs.swappy.swapRoot("em");

    children = [$("div", { key: "c" }), $("div", { key: "b" })];
    etch.updateSync(parent);
    assert.deepStrictEqual(childTags(parent), ["div", "div"]);
  });

  it("moves an end-matched child using the component's current element as the reference", () => {
    // oldEnd(b) matches newStart(b): the patched node is inserted before
    // oldStartChild — the swapped component.
    let children = [$(Swappy, { key: "a", ref: "swappy" }), $("div", { key: "b" })];
    const parent = makeParent(() => children);
    parent.refs.swappy.swapRoot("em");

    children = [$("div", { key: "b" }), $("span", { key: "c" })];
    etch.updateSync(parent);
    assert.deepStrictEqual(childTags(parent), ["div", "span"]);
  });

  it("moves a key-matched child using the component's current element as the reference", () => {
    // newStart(b) is found through the key map; the moved node is inserted
    // before oldStartChild — the swapped component.
    let children = [
      $(Swappy, { key: "a", ref: "swappy" }),
      $("div", { key: "b" }),
      $("span", { key: "c" }),
    ];
    const parent = makeParent(() => children);
    parent.refs.swappy.swapRoot("em");

    children = [$("div", { key: "b" }), $("span", { key: "c2" })];
    etch.updateSync(parent);
    assert.deepStrictEqual(childTags(parent), ["div", "span"]);
  });

  it("anchors a start-to-end move after the component's current element", () => {
    // oldStart(b) matches newEnd(b) and is inserted after oldEndChild — the
    // swapped component. With a stale reference the node lands after the
    // wrong sibling and the order silently breaks.
    let children = [
      $("p", { key: "b" }),
      $(Swappy, { key: "a", ref: "swappy" }),
      $("div", { key: "c" }),
    ];
    const parent = makeParent(() => children);
    parent.refs.swappy.swapRoot("em");

    children = [
      $(Swappy, { key: "a", ref: "swappy" }),
      $("p", { key: "b" }),
      $("div", { key: "c" }),
    ];
    etch.updateSync(parent);
    assert.deepStrictEqual(childTags(parent), ["em", "p", "div"]);
  });

  it("replaces a component child of a different tag in place", () => {
    // virtualNodesAreEqual fails (component tag vs element tag), so patch takes
    // the replace branch — whose parentNode and nextSibling must come from the
    // component's current element, or the new node is never inserted.
    let children = [$(Swappy, { key: "a", ref: "swappy" }), $("div", { key: "b" })];
    const parent = makeParent(() => children);
    parent.refs.swappy.swapRoot("em");

    children = [$("p", { key: "a" }), $("div", { key: "b" })];
    etch.updateSync(parent);
    assert.deepStrictEqual(childTags(parent), ["p", "div"]);
  });

  it("removes the component's current element when the child is dropped", () => {
    // Without a destroy method, removeVirtualNode's own domNode.remove() is the
    // only removal — a stale reference would leave the real element behind.
    let children = [$(SwappyNoDestroy, { key: "a", ref: "swappy" }), $("div", { key: "b" })];
    const parent = makeParent(() => children);
    parent.refs.swappy.swapRoot("em");

    children = [$("div", { key: "b" })];
    etch.updateSync(parent);
    assert.deepStrictEqual(childTags(parent), ["div"]);
  });
});
