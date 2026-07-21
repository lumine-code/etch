// Micro-benchmark for virtual node construction and render/patch throughput.
// Run with: node bench/patch-bench.js
require('../test/helpers/setup');

const dom = require('../lib/dom');
const render = require('../lib/render');
const patch = require('../lib/patch');

function buildTree (rowCount, phase) {
  const rows = [];
  for (let i = 0; i < rowCount; i++) {
    rows.push(dom('div', { className: 'row', key: i, dataset: { index: String(i) }, style: { height: '20px' } },
      dom('span', { className: phase ? 'a' : 'b' }, 'label ' + i),
      phase && i % 3 === 0 ? dom('em', null, 'hot') : null,
      ['cell ' + (i * (phase ? 1 : 2)), dom('b', null, String(i))]
    ));
  }
  return dom('div', { className: 'root' }, rows);
}

function measure (label, iterations, fn) {
  fn(); // warmup
  fn();
  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) fn();
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
  console.log(`${label}: ${elapsedMs.toFixed(1)} ms (${(elapsedMs / iterations).toFixed(3)} ms/iter)`);
}

const ROWS = 200;

measure('construct vnode tree', 500, () => {
  buildTree(ROWS, true);
});

measure('render tree', 200, () => {
  render(buildTree(ROWS, true));
});

measure('patch alternating trees', 200, () => {
  let current = buildTree(ROWS, true);
  render(current);
  for (let phase = 0; phase < 6; phase++) {
    const next = buildTree(ROWS, phase % 2 === 0);
    patch(current, next);
    current = next;
  }
});

measure('patch identical trees', 200, () => {
  let current = buildTree(ROWS, true);
  render(current);
  for (let phase = 0; phase < 6; phase++) {
    const next = buildTree(ROWS, true);
    patch(current, next);
    current = next;
  }
});
