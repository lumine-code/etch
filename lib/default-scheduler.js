// If the scheduler is not customized via `etch.setScheduler`, an instance of
// this class will be used to schedule updates to the document. The
// `updateDocument` method accepts functions to be run at some point in the
// future, then runs them on the next animation frame.
module.exports = class DefaultScheduler {
  constructor () {
    this.updateRequests = []
    this.readRequests = []
    this.pendingAnimationFrame = null
    this.performUpdates = this.performUpdates.bind(this)
    this.performingUpdates = false
  }

  // Enqueues functions that write to the DOM to be performed on the next
  // animation frame. Functions passed to this method should *never* read from
  // the DOM, because that could cause synchronous reflows.
  updateDocument (fn) {
    this.updateRequests.push(fn)
    if (!this.pendingAnimationFrame) {
      this.pendingAnimationFrame = window.requestAnimationFrame(this.performUpdates)
    }
  }

  readDocument (fn) {
    this.readRequests.push(fn)
    if (!this.pendingAnimationFrame) {
      this.pendingAnimationFrame = window.requestAnimationFrame(this.performUpdates)
    }
  }

  // Returns a promise that will resolve at the end of the next update cycle,
  // after all the functions passed to `updateDocument` and `updateDocumentSync`
  // have been run.
  getNextUpdatePromise () {
    if (!this.nextUpdatePromise) {
      this.nextUpdatePromise = new Promise(resolve => {
        this.resolveNextUpdatePromise = resolve
      })
    }
    return this.nextUpdatePromise
  }

  // Performs all the pending document updates. If running these update
  // functions causes *more* updates to be enqueued, they are run synchronously
  // in this update cycle without waiting for another frame.
  performUpdates () {
    let completed = false
    try {
      while (this.updateRequests.length > 0) {
        this.updateRequests.shift()()
      }

      // We don't clear the pending frame until all update requests are processed.
      // This ensures updates requested within other updates are processed in the
      // current frame.
      this.pendingAnimationFrame = null

      // Now that updates are processed, we can perform all pending document reads
      // without the risk of interleaving them with writes and causing layout
      // thrashing.
      while (this.readRequests.length > 0) {
        this.readRequests.shift()()
      }

      completed = true
    } finally {
      // A throwing request must not jam the scheduler: without this, the stale
      // frame handle would prevent all future updates from ever being
      // scheduled. Drain the remaining requests on a new frame and let the
      // exception propagate.
      if (!completed) {
        this.pendingAnimationFrame =
          this.updateRequests.length > 0 || this.readRequests.length > 0
            ? window.requestAnimationFrame(this.performUpdates)
            : null
      }

      if (this.nextUpdatePromise && (completed || this.pendingAnimationFrame == null)) {
        let resolveNextUpdatePromise = this.resolveNextUpdatePromise
        this.nextUpdatePromise = null
        this.resolveNextUpdatePromise = null
        resolveNextUpdatePromise()
      }
    }
  }
}
