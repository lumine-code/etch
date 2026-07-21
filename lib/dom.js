const EVENT_LISTENER_PROPS = require('./event-listener-props')
const SVG_TAGS = require('./svg-tags')

function dom (tag, props, ...children) {
  const ambiguous = []

  // Normalize children in a single pass. The common case — only virtual-node
  // children — reuses the rest array untouched; a copy is built lazily when
  // the first text, array, or null child is encountered.
  let flattened = null
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    switch (typeof child) {
      case 'string':
      case 'number':
        if (!flattened) flattened = children.slice(0, i)
        flattened.push({text: child, domNode: null, context: null})
        break

      case 'object':
        if (Array.isArray(child)) {
          if (!flattened) flattened = children.slice(0, i)
          appendChildren(flattened, child, ambiguous)
        } else if (!child) {
          if (!flattened) flattened = children.slice(0, i)
        } else {
          collectAmbiguousNodes(child, ambiguous)
          if (flattened) flattened.push(child)
        }
        break

      case 'boolean':
        // Skip `false` so conditional children (`{condition && <div />}`) work;
        // `true` still throws, as it is always a mistake.
        if (child) throw new Error(`Invalid child node: ${child}`)
        if (!flattened) flattened = children.slice(0, i)
        break

      default:
        throw new Error(`Invalid child node: ${child}`)
    }
  }

  if (props) {
    for (const propName in props) {
      const eventName = EVENT_LISTENER_PROPS[propName]
      if (eventName) {
        if (!props.on) props.on = {}
        props.on[eventName] = props[propName]
      }
    }

    if (props.class) {
      props.className = props.class
    }
  }

  // Every field assigned during later rendering and patching is initialized
  // here, so all virtual nodes keep a single hidden class.
  return {
    tag,
    props,
    children: flattened || children,
    ambiguous,
    context: null,
    domNode: null,
    component: null,
    boundListeners: null
  }
}

function appendChildren (target, children, ambiguous) {
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    switch (typeof child) {
      case 'string':
      case 'number':
        target.push({text: child, domNode: null, context: null})
        break

      case 'object':
        if (Array.isArray(child)) {
          appendChildren(target, child, ambiguous)
        } else if (child) {
          collectAmbiguousNodes(child, ambiguous)
          target.push(child)
        }
        break

      case 'boolean':
        if (child) throw new Error(`Invalid child node: ${child}`)
        break

      default:
        throw new Error(`Invalid child node: ${child}`)
    }
  }
}

function collectAmbiguousNodes (child, ambiguous) {
  if (!child.context) {
    ambiguous.push(child)
    const childAmbiguous = child.ambiguous
    if (childAmbiguous && childAmbiguous.length > 0) {
      for (let i = 0; i < childAmbiguous.length; i++) {
        ambiguous.push(childAmbiguous[i])
      }
    }
  }
}

const HTML_TAGS = [
  'a', 'abbr', 'address', 'article', 'aside', 'audio', 'b', 'bdi', 'bdo',
  'blockquote', 'body', 'button', 'canvas', 'caption', 'cite', 'code',
  'colgroup', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl',
  'dt', 'em', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2',
  'h3', 'h4', 'h5', 'h6', 'head', 'header', 'html', 'i', 'iframe', 'ins', 'kbd',
  'label', 'legend', 'li', 'main', 'map', 'mark', 'menu', 'meter', 'nav',
  'noscript', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'pre',
  'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'script', 'section',
  'select', 'small', 'span', 'strong', 'style', 'sub', 'summary', 'sup',
  'table', 'tbody', 'td', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title',
  'tr', 'u', 'ul', 'var', 'video', 'area', 'base', 'br', 'col', 'command',
  'embed', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'param', 'source',
  'track', 'wbr'
]

for (const tagName of HTML_TAGS) {
  dom[tagName] = (props, ...children) => {
    return dom(tagName, props, ...children)
  }
}

for (const tagName of SVG_TAGS) {
  dom[tagName] = (props, ...children) => {
    return dom(tagName, props, ...children)
  }
}


module.exports = dom
