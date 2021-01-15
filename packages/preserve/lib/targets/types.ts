import { Source } from "./sources/types";
import * as Sources from "./sources/types";
export { Source, Sources };

export interface Target {
  source: Source;
}
