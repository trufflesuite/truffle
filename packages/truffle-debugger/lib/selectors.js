import debugModule from "debug";
const debug = debugModule("debugger:selectors");

import { createSelector, createStructuredSelector } from "reselect";
import jsonpointer from "json-pointer";
import path from "path";

export function createNestedSelector (selectors) {
  debug("creating nested selectors %o", Object.keys(selectors));
  let selector = createStructuredSelector(selectors);
  Object.keys(selectors).forEach( (prop) => {
    selector[prop] = selectors[prop];
  });

  return selector;
}

class Leaf {
  constructor(deps, selector) {
    this.deps = deps;
    this.selector = selector;
  }

  contextualize(resolve, pointer) {
    let resolved = this.deps
      .map( (dep) => {
        if (typeof dep == 'string') {
          if (dep == "") {
            dep = "/";
          }

          let abspath = path.resolve(pointer, "..", dep);

          return (...args) => {
            debug("args: %o", args);
            let selector = resolve(abspath);
            debug("resolved selector: %o", selector);
            let result = selector.apply(selector, args);
            debug("result: %o", result);
            return result;
          }
        }

        return dep;
      });

    return createSelector(resolved, this.selector);
  }
}

export function createLeaf(deps, selector) {
  return new Leaf(deps, selector);
}

class Tree {
  setRoot(root) {
    this.root = root;
  }

  resolve(abspath) {
    debug("selecting %s", abspath);
    var resolved;
    try {
      let parsed = jsonpointer.parse(abspath);
      debug("path: %o", parsed);

      let cur = this.root;
      for (let step of parsed) {
        debug("step: %o, obj: %o", step, cur);
        cur = cur[step];
      }

      return cur;

    } catch (e) {
      debug("failed, root: %O", this.root);
      throw e;
    }

    return resolved;
  }
}

export function createSelectorTree (root) {
  let tree = new Tree();

  let selector = _createNode(root, tree.resolve.bind(tree), "");

  tree.setRoot(selector);

  return selector;
}

function _createNode(node, resolve, pointer = "") {
  if (node instanceof Leaf) {
    debug("creating leaf at %s", pointer);
    return node.contextualize(resolve, pointer);
  } else if (node instanceof Object && !(node instanceof Function)) {
    debug("recursing %o", node);
    return createNestedSelector(Object.assign({},
      ...Object.entries(node).map(
        ([key, child]) => ({
          [key]: _createNode(child, resolve, `${pointer}/${key}`)
        })
      )
    ));
  } else {
    return node;
  }
}
