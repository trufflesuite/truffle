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
class Contract extends Model {
  constructor() {
    super(...arguments);
    this.contractName = {
      defaultValue: ""
    };
    this.abi = {
      defaultValue: []
    };
    this.metadata = {
      defaultValue: ""
    };
    this.devdoc = {
      defaultValue: ""
    };
    this.userdoc = {
      defaultValue: ""
    };
    this.sourcePath = {
      defaultValue: ""
    };
    this.source = {
      defaultValue: ""
    };
    this.sourceMap = {
      defaultValue: ""
    };
    this.ast = {
      defaultValue: {}
    };
    this.legacyAST = {
      defaultValue: {}
    };
    this.bytecode = {
      defaultValue: ""
    };
    this.deployedBytecode = {
      defaultValue: ""
    };
    this.compiler = {
      defaultValue: {}
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
      this.name +
        JSON.stringify(this.abi) +
        JSON.stringify(this.processedSource) +
        JSON.stringify(this.compilation)
    );
  }
}
module.exports = Contract;
