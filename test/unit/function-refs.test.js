const { describe, it } = require('node:test');
const assert = require('node:assert');

require('../helpers/setup');

const etch = require('../../lib/index');

describe('function refs', () => {
  it('work', async function () {
    let saved_node;
    let component = {
      render() {
        return etch.dom("div", { ref: (node) => saved_node = node }, "some text");
      },

      update() {}
    };

    etch.initialize(component);

    assert.ok(saved_node);
    assert.strictEqual(saved_node.textContent, 'some text');
  });

  it('allow updating', async function () {
    let saved_nodes = [];
    const refFunc = (num) => (node) => saved_nodes[num] = node;
    let component = {
      render() {
        return etch.dom("div", null,
        etch.dom("div", { ref: refFunc(testNumber) }, "Testing")
        );
      },

      update() {}
    };

    let testNumber = 0;

    etch.initialize(component);

    assert.strictEqual(saved_nodes[0].textContent, 'Testing');
    assert.strictEqual(saved_nodes[1], undefined);

    testNumber = 1;

    await etch.update(component);

    assert.strictEqual(saved_nodes[0], null);
    assert.strictEqual(saved_nodes[1].textContent, 'Testing');
  });

  it('allow switching from text to function and back', async function () {
    let saved_node;
    const refFunc = [
    'savedNode',
    (node) => saved_node = node];

    let component = {
      render() {
        return etch.dom("div", null,
        etch.dom("div", { ref: refFunc[testNumber] }, "Testing")
        );
      },

      update() {}
    };

    let testNumber = 0;

    etch.initialize(component);

    assert.strictEqual(component.refs.savedNode.textContent, 'Testing');
    assert.strictEqual(saved_node, undefined);

    testNumber = 1;

    await etch.update(component);

    assert.strictEqual(saved_node.textContent, 'Testing');
    assert.strictEqual(component.refs.savedNode, undefined);

    testNumber = 0;

    await etch.update(component);

    assert.strictEqual(component.refs.savedNode.textContent, 'Testing');
    assert.strictEqual(saved_node, null);
  });

  it('are removed correctly', async function () {
    let saved_nodes = {};
    let refFunc = (name) => (node) => saved_nodes[name] = node;
    let component = {
      render() {
        return etch.dom("div", null,
        testNumber <= 2 ? etch.dom("div", { ref: refFunc('div') }, "Testing ", testNumber) : null,
        testNumber <= 1 ? etch.dom("span", { ref: refFunc('span') }, "Testing ", testNumber) : null,
        testNumber <= 0 ? etch.dom("p", { ref: refFunc('p') }, "Testing ", testNumber) : null
        );
      },

      update() {}
    };


    let testNumber = 0;

    etch.initialize(component);

    assert.strictEqual(saved_nodes.div.textContent, 'Testing 0');
    assert.strictEqual(saved_nodes.span.textContent, 'Testing 0');
    assert.strictEqual(saved_nodes.p.textContent, 'Testing 0');

    testNumber = 1;

    await etch.update(component);

    assert.strictEqual(saved_nodes.div.textContent, 'Testing 1');
    assert.strictEqual(saved_nodes.span.textContent, 'Testing 1');
    assert.strictEqual(saved_nodes.p, null);

    testNumber = 2;

    await etch.update(component);

    assert.strictEqual(saved_nodes.div.textContent, 'Testing 2');
    assert.strictEqual(saved_nodes.span, null);
    assert.strictEqual(saved_nodes.p, null);

    testNumber = 3;

    await etch.update(component);

    assert.strictEqual(saved_nodes.div, null);
    assert.strictEqual(saved_nodes.span, null);
    assert.strictEqual(saved_nodes.p, null);

  });

  describe('work similarly for components', () => {
    class Component {
      constructor(props, children) {
        this.props = props;
        this.children = children;
        etch.initialize(this);
      }
      update(props, children) {
        this.props = props;
        this.children = children;
        return etch.update(this);
      }
      render() {
        return etch.dom('div', {}, this.children);
      }
      destroy() {
        return etch.destroy(this);
      }
    }
    it('work', async function () {
      let saved_node;
      let component = {
        render() {
          return etch.dom(Component, { ref: (node) => saved_node = node }, "some text");
        },

        update() {}
      };

      etch.initialize(component);

      assert.ok(saved_node);
      assert.strictEqual(saved_node.element.textContent, 'some text');
    });

    it('allow updating', async function () {
      let saved_nodes = [];
      const refFunc = (num) => (node) => saved_nodes[num] = node;
      let component = {
        render() {
          return etch.dom("div", null,
          etch.dom(Component, { ref: refFunc(testNumber) }, "Testing")
          );
        },

        update() {}
      };

      let testNumber = 0;

      etch.initialize(component);

      assert.strictEqual(saved_nodes[0].element.textContent, 'Testing');
      assert.strictEqual(saved_nodes[1], undefined);

      testNumber = 1;

      await etch.update(component);

      assert.strictEqual(saved_nodes[0], null);
      assert.strictEqual(saved_nodes[1].element.textContent, 'Testing');
    });

    it('allow switching from text to function and back', async function () {
      let saved_node;
      const refFunc = [
      'savedNode',
      (node) => saved_node = node];

      let component = {
        render() {
          return etch.dom("div", null,
          etch.dom(Component, { ref: refFunc[testNumber] }, "Testing")
          );
        },

        update() {}
      };

      let testNumber = 0;

      etch.initialize(component);

      assert.strictEqual(component.refs.savedNode.element.textContent, 'Testing');
      assert.strictEqual(saved_node, undefined);

      testNumber = 1;

      await etch.update(component);

      assert.strictEqual(saved_node.element.textContent, 'Testing');
      assert.strictEqual(component.refs.savedNode, undefined);

      testNumber = 0;

      await etch.update(component);

      assert.strictEqual(component.refs.savedNode.element.textContent, 'Testing');
      assert.strictEqual(saved_node, null);
    });

    it('are removed correctly', async function () {
      let saved_nodes = {};
      let refFunc = (name) => (node) => saved_nodes[name] = node;
      let component = {
        render() {
          return etch.dom("div", null,
          testNumber <= 2 ? etch.dom(Component, { ref: refFunc('Component') }, "Testing ", testNumber) : null,
          testNumber <= 1 ? etch.dom("span", { ref: refFunc('span') }, "Testing ", testNumber) : null,
          testNumber <= 0 ? etch.dom("p", { ref: refFunc('p') }, "Testing ", testNumber) : null
          );
        },

        update() {}
      };


      let testNumber = 0;

      etch.initialize(component);

      assert.strictEqual(saved_nodes.Component.element.textContent, 'Testing 0');
      assert.strictEqual(saved_nodes.span.textContent, 'Testing 0');
      assert.strictEqual(saved_nodes.p.textContent, 'Testing 0');

      testNumber = 1;

      await etch.update(component);

      assert.strictEqual(saved_nodes.Component.element.textContent, 'Testing 1');
      assert.strictEqual(saved_nodes.span.textContent, 'Testing 1');
      assert.strictEqual(saved_nodes.p, null);

      testNumber = 2;

      await etch.update(component);

      assert.strictEqual(saved_nodes.Component.element.textContent, 'Testing 2');
      assert.strictEqual(saved_nodes.span, null);
      assert.strictEqual(saved_nodes.p, null);

      testNumber = 3;

      await etch.update(component);

      assert.strictEqual(saved_nodes.Component, null);
      assert.strictEqual(saved_nodes.span, null);
      assert.strictEqual(saved_nodes.p, null);

    });
  });
});
