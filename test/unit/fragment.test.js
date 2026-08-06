const { describe, it } = require("node:test");
const assert = require("node:assert");

require("../helpers/setup");

const etch = require("../../lib/index");

describe("etch.Fragment", () => {
  it("splices its children into the enclosing element", () => {
    const component = {
      render() {
        return etch.dom(
          "div",
          null,
          etch.dom(
            etch.Fragment,
            null,
            etch.dom("span", null, "one"),
            etch.dom("span", null, "two"),
          ),
          etch.dom("span", null, "three"),
        );
      },

      update() {},
    };

    etch.initialize(component);
    assert.strictEqual(
      component.element.outerHTML,
      "<div><span>one</span><span>two</span><span>three</span></div>",
    );
  });

  it("flattens text, nested fragments and arrays", () => {
    const component = {
      render() {
        return etch.dom(
          "div",
          null,
          etch.dom(
            etch.Fragment,
            null,
            "text",
            etch.dom(etch.Fragment, null, etch.dom("b", null, "deep")),
            [etch.dom("i", null, "listed")],
          ),
        );
      },

      update() {},
    };

    etch.initialize(component);
    assert.strictEqual(component.element.outerHTML, "<div>text<b>deep</b><i>listed</i></div>");
  });

  it("skips null and false children", () => {
    const component = {
      render() {
        return etch.dom(
          "div",
          null,
          etch.dom(etch.Fragment, null, null, false, etch.dom("span", null, "kept")),
        );
      },

      update() {},
    };

    etch.initialize(component);
    assert.strictEqual(component.element.outerHTML, "<div><span>kept</span></div>");
  });

  it("patches components nested inside a fragment", async () => {
    class Child {
      constructor(props) {
        this.props = props;
        etch.initialize(this);
      }

      render() {
        return etch.dom("span", null, this.props.label);
      }

      update(props) {
        this.props = props;
        return etch.update(this);
      }
    }

    const component = {
      label: "before",

      render() {
        return etch.dom(
          "div",
          null,
          etch.dom(etch.Fragment, null, etch.dom(Child, { label: this.label })),
        );
      },

      update() {},
    };

    etch.initialize(component);
    assert.strictEqual(component.element.outerHTML, "<div><span>before</span></div>");

    component.label = "after";
    await etch.update(component);
    assert.strictEqual(component.element.outerHTML, "<div><span>after</span></div>");
  });

  it("resolves refs declared inside a fragment", () => {
    const component = {
      render() {
        return etch.dom(
          "div",
          null,
          etch.dom(etch.Fragment, null, etch.dom("span", { ref: "target" })),
        );
      },

      update() {},
    };

    etch.initialize(component);
    assert.strictEqual(component.refs.target, component.element.firstChild);
  });

  it("rejects a fragment returned as a component root", () => {
    class Rooted {
      constructor() {
        etch.initialize(this);
      }

      render() {
        return etch.dom(etch.Fragment, null, etch.dom("span", null));
      }

      update() {}
    }

    assert.throws(() => new Rooted(), /must return a single element/);
  });

  it("rejects a fragment that appears at the root on update", async () => {
    const component = {
      fragmented: false,

      render() {
        return this.fragmented
          ? etch.dom(etch.Fragment, null, etch.dom("span", null))
          : etch.dom("div", null);
      },

      update() {},
    };

    etch.initialize(component);
    component.fragmented = true;
    assert.throws(() => etch.updateSync(component), /must return a single element/);
  });
});
