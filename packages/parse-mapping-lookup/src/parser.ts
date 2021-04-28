import debugModule from "debug";
const debug = debugModule("parse-mapping-lookup:parser");

import type { ParjsResult } from "parjs";

import { Forms, definitions } from "./grammar";
import * as constructors from "./ast";
import type { Expression } from "./ast";
import { makeParsers } from "./meta";

export const {
  parseExpression
}: {
  parseExpression(input: string): ParjsResult<Expression>;
} = makeParsers<Forms>({ definitions, constructors });
