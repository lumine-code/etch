const dom = require("./dom");
const render = require("./render");
const { initialize, update, updateSync, destroy, destroySync } = require("./component-helpers");
const { setScheduler, getScheduler } = require("./scheduler-assignment");

module.exports = {
  dom,
  Fragment: dom.Fragment,
  render,
  initialize,
  update,
  updateSync,
  destroy,
  destroySync,
  setScheduler,
  getScheduler,
};
