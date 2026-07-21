const { describe, it } = require('node:test');
const assert = require('node:assert');

require('../helpers/setup');

const etch = require('../../lib/index');

describe('etch.destroy(component)', () => {
  it('removes the component\'s element from the document and calls `destroy` on child components', async () => {
    class ParentComponent {
      constructor() {
        this.destroyCallCount = 0;
        etch.initialize(this);
      }

      render() {
        return (
          etch.dom("div", null,
          etch.dom("div", null,
          etch.dom(ChildComponent, { ref: "child" })
          )
          ));

      }

      update() {}

      destroy() {
        etch.destroy(this);
        this.destroyCallCount++;
      }
    }

    class ChildComponent {
      constructor() {
        this.destroyCallCount = 0;
        etch.initialize(this);
      }

      render() {
        return etch.dom("div", null, "child");
      }

      update() {}

      destroy() {
        etch.destroy(this);
        this.destroyCallCount++;
      }
    }

    let parent = new ParentComponent();
    let child = parent.refs.child;
    let container = document.createElement('div');
    container.appendChild(parent.element);

    await etch.destroy(parent);

    assert.strictEqual(parent.destroyCallCount, 0); // We don't call `destroy` on the component itself
    assert.strictEqual(child.destroyCallCount, 1); // But we do call it on child components
    assert.strictEqual(parent.element.parentElement, null);
    assert.notStrictEqual(child.element.parentElement, null); // Only removes the root node to avoid unnecessary DOM writes
  });

  it('does not remove the DOM node when passed false as a second argument', async () => {
    class Component {
      constructor() {
        etch.initialize(this);
      }

      render() {
        return (
          etch.dom("div", null));

      }

      update() {}
    }

    let component = new Component();
    let container = document.createElement('div');
    container.appendChild(component.element);

    await etch.destroy(component, false);

    assert.strictEqual(component.element.parentElement, container);
  });
});