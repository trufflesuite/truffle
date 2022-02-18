export = Network;
declare class Network extends Model {
  name: any;
  networkId: any;
  historicBlock: any;
  genesis: any;
  ancestors: any;
  descendants: any;
  possibleAncestors: any;
  possibleDescendants: any;
  id: any;
  generateID(): string | null;
  #private;
}
import Model = require("../Model");
