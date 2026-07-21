// Installs a jsdom window as the global DOM environment for the test suite.
// `pretendToBeVisual` enables requestAnimationFrame, which the default
// scheduler and several specs rely on.
const { JSDOM } = require('jsdom');

const jsdom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  pretendToBeVisual: true
});

const { window } = jsdom;

global.window = window;
global.document = window.document;
global.requestAnimationFrame = window.requestAnimationFrame.bind(window);
global.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);

for (const key of ['CustomEvent', 'MouseEvent', 'HTMLElement', 'SVGSVGElement', 'Node']) {
  global[key] = window[key];
}
