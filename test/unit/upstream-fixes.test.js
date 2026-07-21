// Tests for fixes adopted from upstream atom/etch PRs and issues:
// PR #67 (false children), PR #68 (controlled input/select value),
// issue #31 (null props), issue #36 (select value).
const { describe, it } = require('node:test');
const assert = require('node:assert');

require('../helpers/setup');

const dom = require('../../lib/dom');
const render = require('../../lib/render');
const patch = require('../../lib/patch');

describe('upstream fixes', () => {
  it('skips false children inside nested arrays too', () => {
    const element = render(
      dom("div", null, [dom("span", null), false, [false, dom("p", null)]])
    );
    assert.deepStrictEqual(Array.from(element.children).map((c) => c.tagName), ['SPAN', 'P']);
  });

  it('reverts the value of a controlled input whose prop did not change', () => {
    const virtualNode1 = dom("input", { type: 'text', value: 'controlled' });
    const element = render(virtualNode1);
    assert.strictEqual(element.value, 'controlled');

    // The user types; the component re-renders with the same `value` prop and
    // must win over the user's edit.
    element.value = 'user input';
    const virtualNode2 = dom("input", { type: 'text', value: 'controlled' });
    patch(virtualNode1, virtualNode2);
    assert.strictEqual(element.value, 'controlled');
  });

  it('applies and reverts the value of a select', () => {
    const options = () => [
      dom("option", { value: 'a' }, "A"),
      dom("option", { value: 'b' }, "B")
    ];
    const virtualNode1 = dom("select", { value: 'b' }, options());
    const element = render(virtualNode1);
    assert.strictEqual(element.value, 'b');

    // The user picks another option; a re-render with the unchanged prop
    // reverts it.
    element.value = 'a';
    const virtualNode2 = dom("select", { value: 'b' }, options());
    patch(virtualNode1, virtualNode2);
    assert.strictEqual(element.value, 'b');

    // A changed prop applies normally.
    const virtualNode3 = dom("select", { value: 'a' }, options());
    patch(virtualNode2, virtualNode3);
    assert.strictEqual(element.value, 'a');
  });

  it('renders no class attribute text when className is null', () => {
    const element = render(dom("div", { className: null }));
    assert.notStrictEqual(element.className, 'null');
    assert.ok(!element.className);

    // Updating from a real class to null clears it rather than stringifying.
    const virtualNode1 = dom("div", { className: 'a' });
    const element1 = render(virtualNode1);
    assert.strictEqual(element1.className, 'a');
    patch(virtualNode1, dom("div", { className: null }));
    assert.notStrictEqual(element1.className, 'null');
    assert.ok(!element1.className);
  });

  it('removes an SVG attribute when its prop becomes null', () => {
    const virtualNode1 = dom("circle", { colorProfile: 'foo' });
    const element = render(virtualNode1);
    assert.strictEqual(element.getAttribute('color-profile'), 'foo');

    patch(virtualNode1, dom("circle", { colorProfile: null }));
    assert.strictEqual(element.hasAttribute('color-profile'), false);
  });
});
