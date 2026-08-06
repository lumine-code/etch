const { describe, it } = require("node:test");
const assert = require("node:assert");

require("../helpers/setup");

const etch = require("../../lib/index");

describe("svg support", () => {
  it("sets the correct tag thingies", () => {
    let component = {
      render() {
        return etch.dom("svg", null, etch.dom("path", { ref: "path" }));
      },

      update() {},
    };

    etch.initialize(component);
    let elem = component.element;
    assert.strictEqual(elem.constructor, SVGSVGElement);
  });

  it("translates className props to class", () => {
    let component = {
      render() {
        return etch.dom("svg", { className: "myclass" });
      },

      update() {},
    };

    etch.initialize(component);
    assert.strictEqual(component.element.classList[0], "myclass");
  });
});
