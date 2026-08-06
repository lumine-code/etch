const { describe, it } = require("node:test");
const assert = require("node:assert");

require("../helpers/setup");

const etch = require("../../lib/index");
const $ = etch.dom;

// The Data Explorer panel died in insertBefore whenever its body moved
// between a message state and its keyed data slots. These tests replay the
// exact shapes the panel renders.

function mount(renderFn) {
  const component = {
    state: 0,
    render() {
      return renderFn(this.state);
    },
    update() {},
  };
  etch.initialize(component);
  return {
    component,
    set(state) {
      component.state = state;
      etch.updateSync(component);
    },
  };
}

describe("keyed child transitions", () => {
  it("survives a fragment body swapped for a message and back", () => {
    // Original shape: renderBody returned either a message div or a fragment
    // of keyed slots. states: 0 = message, 1 = data.
    const { component, set } = mount((state) =>
      $(
        "div",
        null,
        state === 1
          ? $(
              etch.Fragment,
              null,
              $("div", { key: "grid" }, "grid"),
              $("div", { key: "alt" }, "alt"),
            )
          : $("div", { className: "message" }, "empty"),
      ),
    );

    set(1);
    set(0);
    set(1);
    assert.strictEqual(component.element.textContent, "gridalt");
    set(0);
    assert.strictEqual(component.element.textContent, "empty");
  });

  it("survives a keyed sibling appearing and disappearing", () => {
    // Second shape: a keyed message slot rendered beside the keyed data
    // slots only while there is a message.
    const { component, set } = mount((state) =>
      $(
        "div",
        null,
        state === 0 ? $("div", { key: "message" }, "empty") : null,
        $("div", { key: "grid" }, state === 1 ? "grid" : null),
        $("div", { key: "alt" }, state === 1 ? "alt" : null),
      ),
    );

    set(1);
    assert.strictEqual(component.element.textContent, "gridalt");
    set(0);
    assert.strictEqual(component.element.textContent, "empty");
    set(1);
    assert.strictEqual(component.element.textContent, "gridalt");
  });

  it("survives constant keyed slots whose contents come and go", () => {
    // Third shape: three permanent keyed slots, contents conditional.
    const { component, set } = mount((state) =>
      $(
        "div",
        null,
        $("div", { key: "message" }, state === 0 ? "empty" : null),
        $(
          "div",
          { key: "grid" },
          state === 1 ? $("span", null, "grid") : null,
          state === 1 ? $("span", null, "footer") : null,
        ),
        $("div", { key: "alt" }, state === 1 ? $("span", null, "alt") : null),
      ),
    );

    set(1);
    assert.strictEqual(component.element.textContent, "gridfooteralt");
    set(0);
    assert.strictEqual(component.element.textContent, "empty");
    set(1);
    assert.strictEqual(component.element.textContent, "gridfooteralt");
  });

  it("survives unkeyed conditional siblings around fixed ones", () => {
    // The toolbar shape: fixed leading child, then conditionals that flip.
    const { component, set } = mount((state) =>
      $(
        "div",
        null,
        $("span", null, "tools"),
        state === 1 ? $("span", null, "crumbs") : null,
        state === 1 ? $("span", null, "meta") : null,
        state === 2 ? $("span", null, "chart") : null,
      ),
    );

    set(1);
    assert.strictEqual(component.element.textContent, "toolscrumbsmeta");
    set(2);
    assert.strictEqual(component.element.textContent, "toolschart");
    set(0);
    assert.strictEqual(component.element.textContent, "tools");
    set(1);
    assert.strictEqual(component.element.textContent, "toolscrumbsmeta");
  });
});
