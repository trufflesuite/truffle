export = NameRecord;
declare class NameRecord extends Model {
  resource: any;
  previous: any;
  id: any;
  generateID(): string | null;
  #private;
}
import Model = require("../Model");
