export function prefixName(prefix, fn) {
  Object.defineProperty(fn, 'name', {
    value: `${prefix}.${fn.name}`,
    configurable: true
  });

  return fn;
}
