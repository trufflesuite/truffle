export = Bytecode;
declare class Bytecode extends Model {
  bytes: any;
  linkReferences: any;
  instructions: any;
  id: any;
  generateID(): string | null;
  #private;
}
import Model = require("../Model");
