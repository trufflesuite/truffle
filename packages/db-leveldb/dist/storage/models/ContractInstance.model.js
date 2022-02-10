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
const { soliditySha3 } = require("web3-utils");
class ContractInstance extends Model {
  beforeSave() {
    return __awaiter(this, void 0, void 0, function* () {
      const newId = this.generateID();
      // Key exists in db, but data fields have changed so remove old key
      // This could also become a batch operation and would then be atomic
      if (this.id && this.id !== newId) {
        yield ContractInstance.delete(this.id);
      }
      this.id = newId;
    });
  }
  generateID() {
    return soliditySha3(
      JSON.stringify(this.contract) +
        this.address +
        JSON.stringify(this.creation)
    );
  }
}
module.exports = ContractInstance;
