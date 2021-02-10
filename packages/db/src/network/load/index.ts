/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:network:load");

import * as NetworksForBlocks from "./networksForBlocks";
export { NetworksForBlocks };

import * as NetworkGenealogies from "./networkGenealogies";
export { NetworkGenealogies };
