export = Source;
declare class Source extends Model {
  sourcePath: any;
  contents: any;
  id: any;
  generateID(): string | null;
  #private;
}
import Model = require("../Model");
