const updateProps = require("./update-props");
const SVG_TAGS = require("./svg-tags");
const { getCurrentDocument, withDocument } = require("./render-context");

function render(virtualNode, options) {
  const document =
    options?.document ||
    virtualNode.context?.element?.ownerDocument ||
    getCurrentDocument() ||
    globalThis.document;
  if (!document) throw new TypeError("Etch render requires a DOM Document");
  let domNode;
  if (virtualNode.text != null) {
    domNode = document.createTextNode(virtualNode.text);
  } else {
    const { tag, children } = virtualNode;
    let { props, context } = virtualNode;

    if (context) {
      options = { refs: context.refs, listenerContext: context, document };
    }

    if (typeof tag === "function") {
      let ref;
      if (props && props.ref) {
        ref = props.ref;
      }
      const component = withDocument(document, () => new tag(props || {}, children));
      virtualNode.component = component;
      domNode = component.element;
      if (typeof ref === "function") {
        ref(component);
      } else if (options && options.refs && ref) {
        options.refs[ref] = component;
      }
    } else if (SVG_TAGS.has(tag)) {
      domNode = document.createElementNS("http://www.w3.org/2000/svg", tag);
      if (children) addChildren(domNode, children, options);
      if (props) updateProps(domNode, null, virtualNode, options);
    } else {
      domNode = document.createElement(tag);
      if (children) addChildren(domNode, children, options);
      if (props) updateProps(domNode, null, virtualNode, options);
    }
  }
  virtualNode.domNode = domNode;
  return domNode;
}

function addChildren(parent, children, options) {
  for (let i = 0; i < children.length; i++) {
    parent.appendChild(render(children[i], options));
  }
}

module.exports = render;
