export = ContractInstance;
declare class ContractInstance extends Model {
  address: any;
  network: any;
  creation: any;
  callBytecode: any;
  contract: any;
  id: any;
  generateID(): string | null;
  #private;
}
import Model = require("../Model");
