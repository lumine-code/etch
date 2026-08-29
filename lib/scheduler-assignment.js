// This file implements getter and setter functions for a scheduler to be used
// by this library when updating the DOM. The scheduler's job is to ensure that
// DOM interaction is performed efficiently. When using `etch` in the editor,
// you should tell `etch` to use the editor's scheduler by calling
// `setScheduler(lumine.views)`.
//
// Schedulers should support the following interface:
// * `updateDocument(fn)` This method is asynchronous. It enqueues functions to
// be executed later.
// * `getNextUpdatePromise()` This function should return a promise that
// resolves after all pending document update functions have been invoked.
//
// Schedulers could support the following optional methods, which are supported
// by the editor's scheduler.
//
// * `readDocument` This method can be invoked by clients other than `etch` when
// it is necessary to read from the DOM. Functions enqueued via this method
// should not be run until all document update functions have been executed.
// Batching updates and reads in this way will prevent forced synchronous
// reflows.
// * `pollDocument` This method is similar to `readDocument`, but it runs the
// associated functions repeatedly. Again, they should be scheduled in such a
// way so as to avoid synchronous reflows.

const DefaultScheduler = require("./default-scheduler");

let scheduler = null;
let schedulersByDocument = new WeakMap();
let defaultSchedulersByDocument = new WeakMap();

function hasLiveWindow(document) {
  try {
    const domWindow = document?.defaultView;
    return Boolean(domWindow && !domWindow.closed);
  } catch {
    return false;
  }
}

module.exports.setScheduler = function setScheduler(customScheduler) {
  scheduler = customScheduler;
};

module.exports.setSchedulerForDocument = function setSchedulerForDocument(
  document,
  customScheduler,
) {
  if (!document?.defaultView) throw new TypeError("A scheduler document must have a live Window");
  if (customScheduler == null) schedulersByDocument.delete(document);
  else schedulersByDocument.set(document, customScheduler);
};

module.exports.getScheduler = function getScheduler(document = globalThis.document) {
  const assigned = document && schedulersByDocument.get(document);
  if (assigned) return assigned;
  if (scheduler) {
    return hasLiveWindow(document) && typeof scheduler.forDocument === "function"
      ? scheduler.forDocument(document)
      : scheduler;
  }
  if (!document?.defaultView) return new DefaultScheduler();
  let defaultScheduler = defaultSchedulersByDocument.get(document);
  if (!defaultScheduler) {
    defaultScheduler = new DefaultScheduler(document);
    defaultSchedulersByDocument.set(document, defaultScheduler);
  }
  return defaultScheduler;
};

module.exports.resetSchedulersForTest = function resetSchedulersForTest() {
  scheduler = null;
  schedulersByDocument = new WeakMap();
  defaultSchedulersByDocument = new WeakMap();
};
