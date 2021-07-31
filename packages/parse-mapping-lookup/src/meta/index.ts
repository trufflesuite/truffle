import type { Node, Forms, FormKind } from "./forms";
export { Node };

import type * as Constructors from "./constructors";
import { makeConstructors } from "./constructors";
export { makeConstructors };

import type * as Parsers from "./parsers";
import { makeParsers } from "./parsers";
export { makeParsers };

export type Definition<
  F extends Forms,
  K extends FormKind<F>
> = Constructors.Definition<F, K> & Parsers.Definition<F, K>;

export type Definitions<F extends Forms> = {
  [K in FormKind<F>]: Definition<F, K>;
};
