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
class Project extends Model {
  constructor() {
    super(...arguments);
    this.name = {
      defaultValue: "default"
    };
    this._contracts = {
      defaultValue: []
    };
    this._compilations = {
      defaultValue: []
    };
  }
  get contracts() {
    return this._contracts.map(data => {
      return Project.models.Contract.build(data);
    });
  }
  set contracts(contracts) {
    this._contracts = contracts;
  }
  get compilations() {
    return this._compilations.map(data => {
      return Project.models.Compilation.build(data);
    });
  }
  set compilations(compilations) {
    this._compilations = compilations;
  }
  getContractIDs() {
    return this.contracts.map(contract => {
      return contract.generateID();
    });
  }
  getCompilationIDs() {
    return this.compilations.map(compilation => {
      return compilation.generateID();
    });
  }
  beforeSave() {
    return __awaiter(this, void 0, void 0, function* () {
      this.id = this.generateID();
      for (let i = 0; i < this.contracts.length; i++) {
        yield this.contracts[i].save();
      }
      for (let i = 0; i < this.compilations.length; i++) {
        yield this.compilations[i].save();
      }
    });
  }
  generateID() {
    return this.name;
  }
}
module.exports = Project;
