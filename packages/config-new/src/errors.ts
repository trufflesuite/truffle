import * as fp from "fp-ts";
import * as t from "io-ts";

export function report(result) {
  return printExplanation(getTree(result), missingPropertyVisitor);
}

function printExplanation(tree, visitorFn) {
  const { markdown, includeChildren = true } = visitorFn(tree);
  const children = includeChildren ? tree.getChildren() : [];
  return `
- ${markdown}
  ${children.map(child => printExplanation(child, visitorFn))}
`;
}

const getTree = v => {
  return fp.function.pipe(
    v,
    // @ts-ignore
    fp.either.fold(fromErrors, () => ['No errors'])
  );
};

function fromErrors(errors) {
  const tree = new ErrorTree();
  errors.forEach(error => {
    tree.addError(error);
  });
  return tree;
}

class ErrorTree {
  private parent: ErrorTree | undefined;
  public context: t.ContextEntry | undefined;
  private children: {
    [key: string]: ErrorTree;
  };
  public error: t.ValidationError | null;

  constructor(parent?: ErrorTree, context?: t.ContextEntry) {
    this.parent = parent;
    this.context = context;
    this.children = {};
    this.error = null;
  }

  getParent() {
    return this.parent;
  }

  getChildren() {
    return Object.values(this.children);
  }

  name() {
    return this.error ? getMessage(this.error) : this.context?.type.name;
  }

  toJS() {
    const children = this.getChildren().map(child => child.toJS());

    return {
      name: this.name(),
      children
    };
  }

  addError(error) {
    const ctx = [...error.context];
    this.context = ctx.shift();
    this.addError_internal(ctx, error);
  }

  addError_internal(ctx, error) {
    const currContext = ctx.shift();
    if (currContext) {
      const key = currContext.key;

      if (!this.children[key]) {
        this.children[key] = new ErrorTree(this, currContext);
      }

      this.children[key]?.addError_internal(ctx, error);
    } else {
      this.error = error;
    }
  }
}

function getMessage(e) {
  return e.message !== undefined
    ? e.message
    : `${stringify(e.value)} → ${getContextPath(e.context)}`;
}

function getContextPath(context) {
  return shiftContextKeys(context)
    .filter(({ type }) => !(type instanceof t.UnionType))
    .filter(({ key }) => Boolean(key))
    .map(({ type, key }) =>
      type instanceof t.ArrayType ? `[${key}]` : `.${key}`
    )
    .join('');
}

function stringify(v) {
  if (typeof v === 'function') {
    return getFunctionName(v);
  }

  if (typeof v === 'number' && !isFinite(v)) {
    if (isNaN(v)) {
      return 'NaN';
    }
    return v > 0 ? 'Infinity' : '-Infinity';
  }

  return JSON.stringify(v);
}

function getFunctionName(f) {
  return f.displayName || f.name || `<function${f.length}>`;
}

function shiftContextKeys(context) {
  const shifted: unknown[] = [];
  for (let i = 0; i < context.length; i++) {
    const next = context[i + 1];
    shifted.push({ ...context[i], key: next ? next.key : undefined });
  }
  return shifted;
}

function missingPropertyVisitor(tree: ErrorTree) {
  if (!tree.context) {
    throw new Error("Tree missing context");
  }

  const actual = tree.context.actual;
  const type = tree.context.type.name;
  const key = tree.context.key;
  const message = tree.error && tree.error.message;

  const parent = tree.getParent();
  const parentActual = parent && parent.context?.actual;
  const parentName = parent && parent.context?.type.name;
  const isMissingProperty =
    // @ts-ignore
    actual === undefined && parent && !(key in parentActual);

  const markdown = message
    ? message
    : isMissingProperty
    ? `Property \`${key}\` is missing in type \`${stringify(
        parentActual
      )}\` but required in type \`${parentName}\``
    : `Type \`${stringify(actual)}\` is not assignable to type \`${type}\``;

  return {
    markdown,
    includeChildren: !isLiteralUnion(tree)
  };
}

function isLiteralUnion (tree) {
  return tree.context.type instanceof t.UnionType &&
    tree.getChildren().every(child => child.context.type instanceof t.LiteralType);
}
