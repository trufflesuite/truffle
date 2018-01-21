import { createStructuredSelector } from "reselect";

export function createNestedSelector (selectors) {
  let selector = createStructuredSelector(selectors);
  Object.keys(selectors).forEach( (prop) => {
    selector[prop] = selectors[prop];
  });

  return selector;
}
