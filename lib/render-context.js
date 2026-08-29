let currentDocument = null;

function withDocument(document, callback) {
  const previousDocument = currentDocument;
  currentDocument = document || previousDocument;
  try {
    return callback();
  } finally {
    currentDocument = previousDocument;
  }
}

function getCurrentDocument() {
  return currentDocument;
}

function documentForComponent(component, explicitDocument) {
  return (
    explicitDocument ||
    component?.element?.ownerDocument ||
    component?.__etchDocument ||
    currentDocument ||
    globalThis.document ||
    null
  );
}

module.exports = { documentForComponent, getCurrentDocument, withDocument };
