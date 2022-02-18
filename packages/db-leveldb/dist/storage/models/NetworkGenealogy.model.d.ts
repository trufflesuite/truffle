export = NetworkGenealogy;
declare class NetworkGenealogy extends Model {
  ancestor: any;
  descendant: any;
  id: any;
  generateID(): string | null;
  #private;
}
import Model = require("../Model");
