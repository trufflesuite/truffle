import { Types, Values, Errors } from "./common";
import {
  Config,
  DefaultConfig,
  SerialConfig
} from "./config";
import * as Utils from "./utils";

export {
  /**
   * Contains the types for type objects, and some
   * functions for working with them.
   *
   * @category Main Format
   */
  Types,
  /**
   * Contains the types for value and result objects.
   * @category Main Format
   */
  Values,
  /**
   * Contains the types for error and `ErrorResult` objects.
   * @category Main Format
   */
  Errors,
  /**
   * Base type for a Format configuration
   * @category Config
   */
  Config,
  /**
   * Format configuration suitable for serialization purposes
   * @category Config
   */
  SerialConfig,
  /**
   * Normal Format configuration
   * @category Config
   */
  DefaultConfig,
  Utils
};
