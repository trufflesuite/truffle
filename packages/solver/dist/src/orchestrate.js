"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const js_yaml_1 = require("js-yaml");
const fse_1 = require("fse");
const Solver = {
    orchestrate: function (filepath) {
        return __awaiter(this, void 0, void 0, function* () {
            const declarations = (0, js_yaml_1.loadAll)(yield (0, fse_1.readFile)(filepath.filepath, "utf8"));
            console.log("declarations! " + JSON.stringify(declarations[0].deployed));
            return [
                {
                    contractName: "SimpleStorage",
                    network: "development"
                }
            ];
        });
    }
};
module.exports = Solver;
//# sourceMappingURL=orchestrate.js.map