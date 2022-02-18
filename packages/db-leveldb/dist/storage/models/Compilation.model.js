"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
const Model = require("../Model");
class Compilation extends Model {
  constructor() {
    super(...arguments);
    this.compiler = {
      defaultValue: {}
    };
    this.sources = {
      defaultValue: []
    };
    this.sourceIndexes = {
      defaultValue: []
    };
    this.contracts = {
      defaultValue: []
    };
  }
  beforeSave() {
    return __awaiter(this, void 0, void 0, function* () {
      const newId = this.generateID();
      this.id = newId;
    });
  }
  generateID() {
    return this.sha3(
      JSON.stringify(this.compiler) + JSON.stringify(this.sources)
    );
  }
}
module.exports = Compilation;
