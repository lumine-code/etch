const { describe, it } = require("node:test");
const assert = require("node:assert");

require("../helpers/setup");

const etch = require("../../lib/index");
const $ = etch.dom;

// The Data Explorer died in insertBefore because a child component's update()
// re-entered the parent's update mid-patch: patching the parent updated an
// embedded editor component, whose change handler synchronously emitted a
// store event, whose subscription called etch.update(parent) — and with a
// sync update in progress, update() ran updateSync(parent) IMMEDIATELY,
// diffing the same old tree a second time and mutating the DOM under the
// outer patch's feet.

class EchoChild {
  constructor(props) {
    this.props = props;
    etch.initialize(this);
  }

  render() {
    return $("span", null, this.props.value);
  }

  update(props) {
    const changed = props.value !== this.props.value;
    this.props = props;
    if (changed && this.props.onValueApplied) {
      // Synchronous echo, like a TextEditor's onDidChange firing inside
      // setText() during the parent's patch.
      this.props.onValueApplied(props.value);
    }
    return etch.update(this);
  }

  destroy() {
    return etch.destroy(this);
  }
}

describe("reentrant update of a component mid-patch", () => {
  it("defers the nested update instead of double-patching", () => {
    const parent = {
      state: { value: "first", message: true },
      render() {
        return $(
          "div",
          null,
          this.state.message ? $("div", { key: "message" }, "empty") : null,
          $(EchoChild, {
            key: "child",
            value: this.state.value,
            onValueApplied: () => {
              // The store-emit echo: request another update of the parent
              // while its updateSync is still patching.
              etch.update(parent);
            },
          }),
          $("div", { key: "tail" }, "tail"),
        );
      },
      update() {},
    };

    etch.initialize(parent);
    assert.strictEqual(parent.element.textContent, "emptyfirsttail");

    // Change both the child's value (triggering the echo) and the sibling
    // list shape (so a double-patch corrupts child bookkeeping).
    parent.state = { value: "second", message: false };
    etch.updateSync(parent);

    assert.strictEqual(parent.element.textContent, "secondtail");

    // The tree must still be diffable afterwards.
    parent.state = { value: "third", message: true };
    etch.updateSync(parent);
    assert.strictEqual(parent.element.textContent, "emptythirdtail");
  });
});
