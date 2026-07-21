const { describe, it } = require('node:test');
const assert = require('node:assert');

require('../helpers/setup');

const dom = require('../../lib/dom');
const render = require('../../lib/render');

describe('render (virtualNode)', () => {
  it('constructs DOM nodes from virtual DOM trees', function () {
    const domNode = render(
      dom("div", { class: "foo" },
      dom("div", { class: "bar" }), "Hello World",

      dom("span", { class: "baz" })
      )
    );

    assert.equal(domNode.outerHTML, `
      <div class="foo">
        <div class="bar"></div>
        Hello World
        <span class="baz"></span>
      </div>
    `.replace(/\n\s*/g, ''));
  });

  it('constructs child components and embeds whatever DOM node is assigned to the `.element` property on the component', function () {
    class Component {
      constructor(props, children) {
        this.element = render(
          dom("span", { class: props.class },
          children
          )
        );
      }
    }

    const domNode = render(
      dom("div", { class: "foo" },
      dom(Component, { class: "bar" },
      dom("div", { class: "grandchild1" }),
      dom("div", { class: "grandchild2" })
      )
      )
    );

    assert.equal(domNode.outerHTML, `
      <div class="foo">
        <span class="bar">
          <div class="grandchild1"></div>
          <div class="grandchild2"></div>
        </span>
      </div>
    `.replace(/\n\s*/g, ''));
  });

  it('passes an empty props object to child components by default', function () {
    class Component {
      constructor(props, children) {
        this.element = document.createElement('div');
        assert.deepEqual(props, {});
        assert.deepEqual(children, []);
      }
    }

    const domNode = render(dom("div", null, dom(Component, null)));
    assert.equal(domNode.outerHTML, `<div><div></div></div>`);
  });
});