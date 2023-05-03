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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { "next": verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var debug_1 = require("debug");
var debug = (0, debug_1.default)("encoder:test");
var chai_1 = require("chai");
var path = require("path");
var fs = require("fs-extra");
var Encoder = require("..");
var Codec = require("@truffle/codec");
var Abi = require("@truffle/abi-utils");
var ganache_1 = require("ganache");
var BN = require("bn.js");
var bignumber_js_1 = require("bignumber.js");
var big_js_1 = require("big.js");
var bignumber_1 = require("@ethersproject/bignumber");
var helpers_1 = require("./helpers");
var artifacts;
var compilations;
var addresses = {
    "locate.gold": "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
};
beforeAll(function () { return __awaiter(void 0, void 0, void 0, function () {
    var provider, sourceNames, sources, _i, sourceNames_1, name_1, sourcePath, _a, _b;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                provider = ganache_1.default.provider({
                    seed: "encoder",
                    gasLimit: 7000000,
                    logging: {
                        quiet: true
                    },
                    miner: {
                        //note: we should ideally set strict here, but that causes a test
                        //failure in the ENS testing; we should figure out what's up with
                        //that so we can set strict
                        instamine: "eager"
                    }
                });
                sourceNames = ["EncoderTests.sol", "DecimalTest.vy"];
                sources = {};
                _i = 0, sourceNames_1 = sourceNames;
                _d.label = 1;
            case 1:
                if (!(_i < sourceNames_1.length)) return [3 /*break*/, 4];
                name_1 = sourceNames_1[_i];
                sourcePath = path.join(__dirname, name_1);
                _a = sources;
                _b = sourcePath;
                return [4 /*yield*/, fs.readFile(sourcePath, "utf8")];
            case 2:
                _a[_b] = _d.sent();
                _d.label = 3;
            case 3:
                _i++;
                return [3 /*break*/, 1];
            case 4: return [4 /*yield*/, (0, helpers_1.prepareContracts)(sources, addresses, provider)];
            case 5:
                (_c = _d.sent(), artifacts = _c.artifacts, compilations = _c.compilations);
                return [2 /*return*/];
        }
    });
}); }, 50000);
describe("Encoding", function () {
    describe("Integers and enums", function () {
        var encoder;
        var enumType;
        var alternateEnumType;
        var shortEnumType;
        var udvtType;
        beforeAll(function () { return __awaiter(void 0, void 0, void 0, function () {
            var userDefinedTypes;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Encoder.forArtifact(artifacts.TestContract, {
                            projectInfo: { compilations: compilations }
                        })];
                    case 1:
                        encoder = _a.sent();
                        userDefinedTypes = encoder
                            .getProjectEncoder()
                            .getUserDefinedTypes();
                        enumType = (Object.values(userDefinedTypes).find(function (type) {
                            return type.typeClass === "enum" &&
                                type.typeName === "Color" &&
                                type.kind === "local" &&
                                type.definingContractName === "TestContract";
                        }));
                        alternateEnumType = (Object.values(userDefinedTypes).find(function (type) {
                            return type.typeClass === "enum" &&
                                type.typeName === "MinusColor" &&
                                type.kind === "local" &&
                                type.definingContractName === "TestContract";
                        }));
                        shortEnumType = (Object.values(userDefinedTypes).find(function (type) {
                            return type.typeClass === "enum" &&
                                type.typeName === "ShortEnum" &&
                                type.kind === "local" &&
                                type.definingContractName === "TestContract";
                        }));
                        udvtType = (Object.values(userDefinedTypes).find(function (type) {
                            return type.typeClass === "userDefinedValueType" &&
                                type.typeName === "Natural" &&
                                type.kind === "local" &&
                                type.definingContractName === "TestContract";
                        }));
                        return [2 /*return*/];
                }
            });
        }); });
        describe("8-bit signed", function () {
            var abi;
            var selector;
            beforeAll(function () {
                abi = (Abi.normalize(artifacts.TestContract.abi).find(function (entry) { return entry.type === "function" && entry.name === "takesInt8"; }));
                selector = Codec.AbiData.Utils.abiSelector(abi);
            });
            it("Encodes numbers", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [1])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes negative numbers", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [-1])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes boxed numbers", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                new Number(1)
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes bigints", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [BigInt(1)])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes negative bigints", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [BigInt(-1)])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes BNs", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new BN(1)])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes negative BNs", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new BN(-1)])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes Bigs", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new big_js_1.default(1)])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes negative Bigs", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                new big_js_1.default("-1")
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes BigNumbers (MikeMcl)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                new bignumber_js_1.default(1)
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes negative BigNumbers (MikeMcl)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                new bignumber_js_1.default(-1)
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes BigNumbers (ethers)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                bignumber_1.BigNumber.from(1)
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes negative BigNumbers (ethers)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                bignumber_1.BigNumber.from(-1)
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes FixedNumbers", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                bignumber_1.FixedNumber.from(1)
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes negative FixedNumbers", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                bignumber_1.FixedNumber.from(-1)
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes numeric strings", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" 1 "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes negative numeric strings", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" -1 "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes numeric strings with underscores", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" 1_1 "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "000000000000000000000000000000000000000000000000000000000000000b");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes hexadecimal strings", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" 0xa "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "000000000000000000000000000000000000000000000000000000000000000a");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes hexadecimal strings (uppercase)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" 0XA "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "000000000000000000000000000000000000000000000000000000000000000a");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes negated hexadecimal strings", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" -0xa "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff6");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes hexadecimal strings with underscores", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" 0x7_f "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "000000000000000000000000000000000000000000000000000000000000007f");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes negated hexadecimal strings with underscores", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" -0x8_0 "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff80");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes octal strings", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" 0o10 "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000008");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes negated octal strings", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" -0o10 "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes octal strings with underscores", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" 0o1_0 "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000008");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes negated octal strings with underscores", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" -0o1_0 "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes binary strings", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" 0b10 "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000002");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes negated binary strings", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" -0b10 "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes binary strings with underscores", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" 0b1_0 "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000002");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes negated binary strings with underscores", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" -0b1_0 "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes scientific notation", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" -1e0 "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes scientific notation with underscores", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                " -1_0e-0_1 "
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes numeric strings with units", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" 2 wei "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000002");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes numeric strings with units and underscores", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" 1_0 wei "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "000000000000000000000000000000000000000000000000000000000000000a");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes numeric strings with units (no space)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" 2wei "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000002");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes numeric strings with units and underscores (no space)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" 1_0wei "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "000000000000000000000000000000000000000000000000000000000000000a");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes negative numeric strings with units", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" -2 wei "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes numeric strings that are units", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" wei "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes boxed numeric strings", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                new String(" 1 ")
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes Uint8Arrays", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                new Uint8Array([1])
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes Uint8Array-likes", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                { length: 1, 0: 1, garbage: "garbage" }
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes type/value pairs", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                { type: "int8", value: "1" }
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes wrapped integer values (signed)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var wrapped, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.wrapElementaryValue({ typeClass: "int", bits: 8 }, 1)];
                        case 1:
                            wrapped = _a.sent();
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [wrapped])];
                        case 2:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes wrapped integer values (unsigned)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var wrapped, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.wrapElementaryValue({ typeClass: "uint", bits: 8 }, 1)];
                        case 1:
                            wrapped = _a.sent();
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [wrapped])];
                        case 2:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes wrapped fixed-point values (signed)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var wrapped, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.wrapElementaryValue({ typeClass: "fixed", bits: 168, places: 10 }, 1)];
                        case 1:
                            wrapped = _a.sent();
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [wrapped])];
                        case 2:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes wrapped fixed-point values (unsigned)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var wrapped, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.wrapElementaryValue({ typeClass: "ufixed", bits: 168, places: 10 }, 1)];
                        case 1:
                            wrapped = _a.sent();
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [wrapped])];
                        case 2:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes wrapped enum values", function () { return __awaiter(void 0, void 0, void 0, function () {
                var wrapped, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.wrapElementaryValue(enumType, 1)];
                        case 1:
                            wrapped = _a.sent();
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [wrapped])];
                        case 2:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes enum out-of-range errors", function () { return __awaiter(void 0, void 0, void 0, function () {
                var wrapped, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            wrapped = {
                                type: enumType,
                                kind: "error",
                                error: {
                                    kind: "EnumOutOfRangeError",
                                    type: enumType,
                                    rawAsBN: new BN(16)
                                }
                            };
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [wrapped])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000010");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes wrapped UDVT values (integer)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var wrapped, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.wrapElementaryValue(udvtType, 1)];
                        case 1:
                            wrapped = _a.sent();
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [wrapped])];
                        case 2:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (number, positive)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [128])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_1 = _a.sent();
                            if (error_1.name !== "TypeMismatchError") {
                                throw error_1;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (number, negative)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [-129])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_2 = _a.sent();
                            if (error_2.name !== "TypeMismatchError") {
                                throw error_2;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (string, positive)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["128"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_3 = _a.sent();
                            if (error_3.name !== "TypeMismatchError") {
                                throw error_3;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (string, negative)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_4;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["-129"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_4 = _a.sent();
                            if (error_4.name !== "TypeMismatchError") {
                                throw error_4;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (bigint, positive)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_5;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [BigInt(128)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_5 = _a.sent();
                            if (error_5.name !== "TypeMismatchError") {
                                throw error_5;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (bigint, negative)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_6;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [BigInt(-129)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_6 = _a.sent();
                            if (error_6.name !== "TypeMismatchError") {
                                throw error_6;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (BN, positive)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_7;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new BN(128)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_7 = _a.sent();
                            if (error_7.name !== "TypeMismatchError") {
                                throw error_7;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (BN, negative)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_8;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new BN(-129)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_8 = _a.sent();
                            if (error_8.name !== "TypeMismatchError") {
                                throw error_8;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (Big, positive)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_9;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new big_js_1.default(128)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_9 = _a.sent();
                            if (error_9.name !== "TypeMismatchError") {
                                throw error_9;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (Big, negative)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_10;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new big_js_1.default(-129)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_10 = _a.sent();
                            if (error_10.name !== "TypeMismatchError") {
                                throw error_10;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (BigNumber, positive)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_11;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new bignumber_js_1.default(128)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_11 = _a.sent();
                            if (error_11.name !== "TypeMismatchError") {
                                throw error_11;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (BigNumber, negative)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_12;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new bignumber_js_1.default(-129)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_12 = _a.sent();
                            if (error_12.name !== "TypeMismatchError") {
                                throw error_12;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (Ethers BigNumber, positive)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_13;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [bignumber_1.BigNumber.from(128)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_13 = _a.sent();
                            if (error_13.name !== "TypeMismatchError") {
                                throw error_13;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (Ethers BigNumber, negative)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_14;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [bignumber_1.BigNumber.from(-129)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_14 = _a.sent();
                            if (error_14.name !== "TypeMismatchError") {
                                throw error_14;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (Ethers FixedNumber, positive)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_15;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [bignumber_1.FixedNumber.from(128)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_15 = _a.sent();
                            if (error_15.name !== "TypeMismatchError") {
                                throw error_15;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (Ethers FixedNumber, negative)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_16;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [bignumber_1.FixedNumber.from(-129)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_16 = _a.sent();
                            if (error_16.name !== "TypeMismatchError") {
                                throw error_16;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (Uint8Array)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_17;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new Uint8Array([128])])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_17 = _a.sent();
                            if (error_17.name !== "TypeMismatchError") {
                                throw error_17;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects non-finite input (number)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_18;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [NaN])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Non-finite input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_18 = _a.sent();
                            if (error_18.name !== "TypeMismatchError") {
                                throw error_18;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects non-finite input (BigNumber)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_19;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new bignumber_js_1.default(NaN)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Non-finite input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_19 = _a.sent();
                            if (error_19.name !== "TypeMismatchError") {
                                throw error_19;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects non-integer input (number)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_20;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [1.5])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Non-integer input should be rejected");
                            return [3 /*break*/, 3];
                        case 2:
                            error_20 = _a.sent();
                            if (error_20.name !== "TypeMismatchError") {
                                throw error_20;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects non-integer input (string)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_21;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["1.5"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Non-integer input should be rejected");
                            return [3 /*break*/, 3];
                        case 2:
                            error_21 = _a.sent();
                            if (error_21.name !== "TypeMismatchError") {
                                throw error_21;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects non-integer input (Big)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_22;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new big_js_1.default(1.5)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Non-integer input should be rejected");
                            return [3 /*break*/, 3];
                        case 2:
                            error_22 = _a.sent();
                            if (error_22.name !== "TypeMismatchError") {
                                throw error_22;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects non-integer input (BigNumber)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_23;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new bignumber_js_1.default(1.5)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Non-integer input should be rejected");
                            return [3 /*break*/, 3];
                        case 2:
                            error_23 = _a.sent();
                            if (error_23.name !== "TypeMismatchError") {
                                throw error_23;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects non-integer input (Ethers FixedNumber)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_24;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [bignumber_1.FixedNumber.from("1.5")])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Non-integer input should be rejected");
                            return [3 /*break*/, 3];
                        case 2:
                            error_24 = _a.sent();
                            if (error_24.name !== "TypeMismatchError") {
                                throw error_24;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects just whitespace", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_25;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" "])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Non-numeric string got accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_25 = _a.sent();
                            if (error_25.name !== "TypeMismatchError") {
                                throw error_25;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects bare minus sign", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_26;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["-"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Non-numeric string got accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_26 = _a.sent();
                            if (error_26.name !== "TypeMismatchError") {
                                throw error_26;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects double negatives", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_27;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["--0"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Non-numeric string got accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_27 = _a.sent();
                            if (error_27.name !== "TypeMismatchError") {
                                throw error_27;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects double minus sign", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_28;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["--"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Non-numeric string got accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_28 = _a.sent();
                            if (error_28.name !== "TypeMismatchError") {
                                throw error_28;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects unrecognized unit", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_29;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["2 kwei"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Unrecognized unit got accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_29 = _a.sent();
                            if (error_29.name !== "TypeMismatchError") {
                                throw error_29;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects invalid hexadecimal", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_30;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["0xg"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Bad hexadecimal got accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_30 = _a.sent();
                            if (error_30.name !== "TypeMismatchError") {
                                throw error_30;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects invalid octal", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_31;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["0xo"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Bad octal got accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_31 = _a.sent();
                            if (error_31.name !== "TypeMismatchError") {
                                throw error_31;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects invalid binary", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_32;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["0b2"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Bad binary got accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_32 = _a.sent();
                            if (error_32.name !== "TypeMismatchError") {
                                throw error_32;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects consecutive underscores", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_33;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["1__1"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Consecutive underscores should be rejected");
                            return [3 /*break*/, 3];
                        case 2:
                            error_33 = _a.sent();
                            if (error_33.name !== "TypeMismatchError") {
                                throw error_33;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects consecutive underscores (hex)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_34;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["0x1__1"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Consecutive underscores should be rejected");
                            return [3 /*break*/, 3];
                        case 2:
                            error_34 = _a.sent();
                            if (error_34.name !== "TypeMismatchError") {
                                throw error_34;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects underscore after minus sign", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_35;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["-_1"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Misplaced underscore got accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_35 = _a.sent();
                            if (error_35.name !== "TypeMismatchError") {
                                throw error_35;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects underscore after hex prefix", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_36;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["0x_1"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Misplaced underscore got accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_36 = _a.sent();
                            if (error_36.name !== "TypeMismatchError") {
                                throw error_36;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects underscore after octal prefix", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_37;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["0o_1"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Misplaced underscore got accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_37 = _a.sent();
                            if (error_37.name !== "TypeMismatchError") {
                                throw error_37;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects underscore after binary prefix", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_38;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["0b_1"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Misplaced underscore got accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_38 = _a.sent();
                            if (error_38.name !== "TypeMismatchError") {
                                throw error_38;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects underscore inbetween mantissa and e", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_39;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["1_e1"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Misplaced underscore got accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_39 = _a.sent();
                            if (error_39.name !== "TypeMismatchError") {
                                throw error_39;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects underscore inbetween e and exponent", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_40;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["1e_1"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Misplaced underscore got accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_40 = _a.sent();
                            if (error_40.name !== "TypeMismatchError") {
                                throw error_40;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects underscore inbetween number and unit", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_41;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["10_wei"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Misplaced underscore got accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_41 = _a.sent();
                            if (error_41.name !== "TypeMismatchError") {
                                throw error_41;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects negative bytes", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_42;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [{ length: 1, 0: -1 }])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Accepted negative byte");
                            return [3 /*break*/, 3];
                        case 2:
                            error_42 = _a.sent();
                            if (error_42.name !== "TypeMismatchError") {
                                throw error_42;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects fractional bytes", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_43;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [{ length: 1, 0: 0.5 }])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Accepted fractional byte");
                            return [3 /*break*/, 3];
                        case 2:
                            error_43 = _a.sent();
                            if (error_43.name !== "TypeMismatchError") {
                                throw error_43;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects non-numeric bytes", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_44;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                    { length: 1, 0: "garbage" }
                                ])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Accepted non-numeric byte");
                            return [3 /*break*/, 3];
                        case 2:
                            error_44 = _a.sent();
                            if (error_44.name !== "TypeMismatchError") {
                                throw error_44;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects fractional length", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_45;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [{ length: 0.5 }])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Accepted fractional length");
                            return [3 /*break*/, 3];
                        case 2:
                            error_45 = _a.sent();
                            if (error_45.name !== "TypeMismatchError") {
                                throw error_45;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects negative length", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_46;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [{ length: -1 }])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Accepted negative length");
                            return [3 /*break*/, 3];
                        case 2:
                            error_46 = _a.sent();
                            if (error_46.name !== "TypeMismatchError") {
                                throw error_46;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects unsafely large length", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_47;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [{ length: 1e100 }])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Accepted unsafely large length");
                            return [3 /*break*/, 3];
                        case 2:
                            error_47 = _a.sent();
                            if (error_47.name !== "TypeMismatchError") {
                                throw error_47;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects non-numeric length", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_48;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [{ length: "garbage" }])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Accepted non-numeric length");
                            return [3 /*break*/, 3];
                        case 2:
                            error_48 = _a.sent();
                            if (error_48.name !== "TypeMismatchError") {
                                throw error_48;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects other non-numeric strings", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_49;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["garbage"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Non-numeric string got accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_49 = _a.sent();
                            if (error_49.name !== "TypeMismatchError") {
                                throw error_49;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects other non-numeric input (test: null)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_50;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [null])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Null should not be encoded as a number");
                            return [3 /*break*/, 3];
                        case 2:
                            error_50 = _a.sent();
                            if (error_50.name !== "TypeMismatchError") {
                                throw error_50;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects other non-numeric input (test: undefined)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_51;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [undefined])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Undefined should not be encoded as a number");
                            return [3 /*break*/, 3];
                        case 2:
                            error_51 = _a.sent();
                            if (error_51.name !== "TypeMismatchError") {
                                throw error_51;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects other non-numeric input (test: {})", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_52;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [{}])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Empty object should not be encoded as a number");
                            return [3 /*break*/, 3];
                        case 2:
                            error_52 = _a.sent();
                            if (error_52.name !== "TypeMismatchError") {
                                throw error_52;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects type/value pair for wrong type (string)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_53;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                    { type: "string", value: "1" }
                                ])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Value specified as string got encoded as int8");
                            return [3 /*break*/, 3];
                        case 2:
                            error_53 = _a.sent();
                            if (error_53.name !== "TypeMismatchError") {
                                throw error_53;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects type/value pair for wrong type (uint8)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_54;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                    { type: "uint8", value: "1" }
                                ])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Value specified as uint8 got encoded as int8");
                            return [3 /*break*/, 3];
                        case 2:
                            error_54 = _a.sent();
                            if (error_54.name !== "TypeMismatchError") {
                                throw error_54;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects type/value pair for wrong type (int256)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_55;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                    { type: "int256", value: "1" }
                                ])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Value specified as int256 got encoded as int8");
                            return [3 /*break*/, 3];
                        case 2:
                            error_55 = _a.sent();
                            if (error_55.name !== "TypeMismatchError") {
                                throw error_55;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects type/value pair for wrong type (int)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_56;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                    { type: "int", value: "1" }
                                ])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Value specified as int got encoded as int8");
                            return [3 /*break*/, 3];
                        case 2:
                            error_56 = _a.sent();
                            if (error_56.name !== "TypeMismatchError") {
                                throw error_56;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects nested type/value pair", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_57;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                    {
                                        type: "int8",
                                        value: {
                                            type: "int8",
                                            value: "1"
                                        }
                                    }
                                ])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Nested type/value pair got encoded");
                            return [3 /*break*/, 3];
                        case 2:
                            error_57 = _a.sent();
                            if (error_57.name !== "TypeMismatchError") {
                                throw error_57;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects wrapped value for wrong type", function () { return __awaiter(void 0, void 0, void 0, function () {
                var wrapped, error_58;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.wrapElementaryValue({ typeClass: "bool" }, true)];
                        case 1:
                            wrapped = _a.sent();
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [wrapped])];
                        case 3:
                            _a.sent();
                            chai_1.assert.fail("Value wrapped as bool got encoded as integer");
                            return [3 /*break*/, 5];
                        case 4:
                            error_58 = _a.sent();
                            if (error_58.name !== "TypeMismatchError") {
                                throw error_58;
                            }
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects general wrapped error result", function () { return __awaiter(void 0, void 0, void 0, function () {
                var wrapped, error_59;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            wrapped = {
                                type: enumType,
                                kind: "error",
                                error: {
                                    kind: "ReadErrorStack",
                                    from: 0,
                                    to: 0
                                }
                            };
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [wrapped])];
                        case 2:
                            _a.sent();
                            chai_1.assert.fail("Error result (of general sort) got encoded as integer");
                            return [3 /*break*/, 4];
                        case 3:
                            error_59 = _a.sent();
                            if (error_59.name !== "TypeMismatchError") {
                                throw error_59;
                            }
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
        });
        describe("8-bit unsigned", function () {
            var abi;
            beforeAll(function () {
                abi = (Abi.normalize(artifacts.TestContract.abi).find(function (entry) { return entry.type === "function" && entry.name === "takesUint8"; }));
            });
            it("Rejects out-of-range input (number, positive)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_60;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [256])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_60 = _a.sent();
                            if (error_60.name !== "TypeMismatchError") {
                                throw error_60;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects negative input (number)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_61;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [-1])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_61 = _a.sent();
                            if (error_61.name !== "TypeMismatchError") {
                                throw error_61;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (string, positive)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_62;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["256"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_62 = _a.sent();
                            if (error_62.name !== "TypeMismatchError") {
                                throw error_62;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects negative input (string)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_63;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["-1"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_63 = _a.sent();
                            if (error_63.name !== "TypeMismatchError") {
                                throw error_63;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (bigint, positive)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_64;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [BigInt(256)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_64 = _a.sent();
                            if (error_64.name !== "TypeMismatchError") {
                                throw error_64;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects negative input (bigint)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_65;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [BigInt(-1)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_65 = _a.sent();
                            if (error_65.name !== "TypeMismatchError") {
                                throw error_65;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (BN, positive)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_66;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new BN(256)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_66 = _a.sent();
                            if (error_66.name !== "TypeMismatchError") {
                                throw error_66;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects negative input (BN)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_67;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new BN(-1)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_67 = _a.sent();
                            if (error_67.name !== "TypeMismatchError") {
                                throw error_67;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (Big, positive)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_68;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new big_js_1.default(256)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_68 = _a.sent();
                            if (error_68.name !== "TypeMismatchError") {
                                throw error_68;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects negative input (Big)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_69;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new big_js_1.default(-1)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_69 = _a.sent();
                            if (error_69.name !== "TypeMismatchError") {
                                throw error_69;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (BigNumber, positive)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_70;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new bignumber_js_1.default(256)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_70 = _a.sent();
                            if (error_70.name !== "TypeMismatchError") {
                                throw error_70;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects negative input (BigNumber)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_71;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new bignumber_js_1.default(-1)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_71 = _a.sent();
                            if (error_71.name !== "TypeMismatchError") {
                                throw error_71;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (Ethers BigNumber, positive)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_72;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [bignumber_1.BigNumber.from(256)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_72 = _a.sent();
                            if (error_72.name !== "TypeMismatchError") {
                                throw error_72;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects negative input (Ethers BigNumber)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_73;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [bignumber_1.BigNumber.from(-1)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_73 = _a.sent();
                            if (error_73.name !== "TypeMismatchError") {
                                throw error_73;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (Ethers FixedNumber, positive)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_74;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [bignumber_1.FixedNumber.from(256)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_74 = _a.sent();
                            if (error_74.name !== "TypeMismatchError") {
                                throw error_74;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects negative input (Ethers FixedNumber)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_75;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [bignumber_1.FixedNumber.from(-1)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_75 = _a.sent();
                            if (error_75.name !== "TypeMismatchError") {
                                throw error_75;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
        });
        describe("256-bit signed", function () {
            var abi;
            var selector;
            beforeAll(function () {
                abi = (Abi.normalize(artifacts.TestContract.abi).find(function (entry) { return entry.type === "function" && entry.name === "takesInt"; }));
                selector = Codec.AbiData.Utils.abiSelector(abi);
            });
            it("Encodes values with units", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" 16 gwei "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "00000000000000000000000000000000000000000000000000000003b9aca000");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes values that are units", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" gwei "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "000000000000000000000000000000000000000000000000000000003b9aca00");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes Uint8Arrays", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                new Uint8Array([1, 255])
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "00000000000000000000000000000000000000000000000000000000000001ff");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes type/value pairs", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                { type: "int256", value: "1" }
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes type/value pairs (short form)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                { type: "int", value: "1" }
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes wrapped integer values", function () { return __awaiter(void 0, void 0, void 0, function () {
                var wrapped, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.wrapElementaryValue({ typeClass: "int", bits: 256 }, 1)];
                        case 1:
                            wrapped = _a.sent();
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [wrapped])];
                        case 2:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes wrapped integer values (of different type)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var wrapped, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.wrapElementaryValue({ typeClass: "int", bits: 8 }, 1)];
                        case 1:
                            wrapped = _a.sent();
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [wrapped])];
                        case 2:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects unsafe integer input (positive)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_76;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [Math.pow(2, 53)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Unsafe input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_76 = _a.sent();
                            if (error_76.name !== "TypeMismatchError") {
                                throw error_76;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects unsafe integer input (negative)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_77;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [-(Math.pow(2, 53))])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Unsafe input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_77 = _a.sent();
                            if (error_77.name !== "TypeMismatchError") {
                                throw error_77;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects bytes above 255", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_78;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [{ length: 1, 0: 256 }])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Accepted byte above 255");
                            return [3 /*break*/, 3];
                        case 2:
                            error_78 = _a.sent();
                            if (error_78.name !== "TypeMismatchError") {
                                throw error_78;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects type/value pair for wrong type (int8)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_79;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                    { type: "int8", value: "1" }
                                ])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Value specified as int8 got encoded as int256");
                            return [3 /*break*/, 3];
                        case 2:
                            error_79 = _a.sent();
                            if (error_79.name !== "TypeMismatchError") {
                                throw error_79;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects type/value pair for wrong type (uint256)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_80;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                    { type: "uint256", value: "1" }
                                ])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Value specified as uint256 got encoded as int256");
                            return [3 /*break*/, 3];
                        case 2:
                            error_80 = _a.sent();
                            if (error_80.name !== "TypeMismatchError") {
                                throw error_80;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects type/value pair for wrong type (uint)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_81;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                    { type: "uint", value: "1" }
                                ])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Value specified as uint got encoded as int");
                            return [3 /*break*/, 3];
                        case 2:
                            error_81 = _a.sent();
                            if (error_81.name !== "TypeMismatchError") {
                                throw error_81;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects nested type/value pair", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_82;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                    {
                                        type: "int",
                                        value: {
                                            type: "int",
                                            value: "1"
                                        }
                                    }
                                ])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Nested type/value pair got encoded");
                            return [3 /*break*/, 3];
                        case 2:
                            error_82 = _a.sent();
                            if (error_82.name !== "TypeMismatchError") {
                                throw error_82;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
        });
        describe("256-bit unsigned", function () {
            var abi;
            var selector;
            beforeAll(function () {
                abi = (Abi.normalize(artifacts.TestContract.abi).find(function (entry) { return entry.type === "function" && entry.name === "takesUint"; }));
                selector = Codec.AbiData.Utils.abiSelector(abi);
            });
            it("Encodes type/value pairs", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                { type: "uint256", value: "1" }
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes type/value pairs (short form)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                { type: "uint", value: "1" }
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes wrapped integer values", function () { return __awaiter(void 0, void 0, void 0, function () {
                var wrapped, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.wrapElementaryValue({ typeClass: "uint", bits: 256 }, 1)];
                        case 1:
                            wrapped = _a.sent();
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [wrapped])];
                        case 2:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes wrapped integer values (of different type)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var wrapped, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.wrapElementaryValue({ typeClass: "uint", bits: 8 }, 1)];
                        case 1:
                            wrapped = _a.sent();
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [wrapped])];
                        case 2:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects type/value pair for wrong type (uint8)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_83;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                    { type: "uint8", value: "1" }
                                ])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Value specified as uint8 got encoded as uint256");
                            return [3 /*break*/, 3];
                        case 2:
                            error_83 = _a.sent();
                            if (error_83.name !== "TypeMismatchError") {
                                throw error_83;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects type/value pair for wrong type (int256)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_84;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                    { type: "int256", value: "1" }
                                ])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Value specified as int256 got encoded as uint256");
                            return [3 /*break*/, 3];
                        case 2:
                            error_84 = _a.sent();
                            if (error_84.name !== "TypeMismatchError") {
                                throw error_84;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects type/value pair for wrong type (int)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_85;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                    { type: "int", value: "1" }
                                ])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Value specified as int got encoded as uint");
                            return [3 /*break*/, 3];
                        case 2:
                            error_85 = _a.sent();
                            if (error_85.name !== "TypeMismatchError") {
                                throw error_85;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects nested type/value pair", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_86;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                    {
                                        type: "uint",
                                        value: {
                                            type: "uint",
                                            value: "1"
                                        }
                                    }
                                ])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Nested type/value pair got encoded");
                            return [3 /*break*/, 3];
                        case 2:
                            error_86 = _a.sent();
                            if (error_86.name !== "TypeMismatchError") {
                                throw error_86;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
        });
        describe("Enumerated types", function () {
            var abi;
            var selector;
            var globalAbi;
            var globalSelector;
            beforeAll(function () {
                abi = (Abi.normalize(artifacts.TestContract.abi).find(function (entry) { return entry.type === "function" && entry.name === "takesColor"; }));
                selector = Codec.AbiData.Utils.abiSelector(abi);
                globalAbi = (Abi.normalize(artifacts.TestContract.abi).find(function (entry) {
                    return entry.type === "function" && entry.name === "takesGlobalColor";
                }));
                globalSelector = Codec.AbiData.Utils.abiSelector(globalAbi);
            });
            it("Encodes numbers", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [1])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes boxed numbers", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                new Number(1)
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes bigints", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [BigInt(1)])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes BNs", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new BN(1)])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes Bigs", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new big_js_1.default(1)])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes BigNumbers (MikeMcl)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                new bignumber_js_1.default(1)
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes BigNumbers (ethers)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                bignumber_1.BigNumber.from(1)
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes FixedNumbers", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                bignumber_1.FixedNumber.from(1)
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes numeric strings", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" 1 "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes hexadecimal strings", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" 0x1 "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes octal strings", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" 0o1 "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes binary strings", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" 0b1 "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes scientific notation", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" 1e0 "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes numeric strings with units", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" 2 wei "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000002");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes numeric strings with units (no space)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" 2wei "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000002");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes numeric strings that are units", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" wei "])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes enum option names", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["Red"])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000004");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes enum option names with specified enum", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["Color.Red"])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000004");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes enum option names with specified enum & contract", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                "TestContract.Color.Red"
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000004");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes global enum option names", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(globalAbi, ["Red"])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, globalSelector +
                                "0000000000000000000000000000000000000000000000000000000000000006");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes global enum option names with specified enum", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(globalAbi, [
                                "GlobalColor.Red"
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, globalSelector +
                                "0000000000000000000000000000000000000000000000000000000000000006");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes boxed strings", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                new String(" 1 ")
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes Uint8Arrays", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                new Uint8Array([1])
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes Uint8Array-likes", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                { length: 1, 0: 1, garbage: "garbage" }
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes type/value pairs", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                { type: "enum", value: "1" }
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes type/value pairs using underlying uint type", function () { return __awaiter(void 0, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                { type: "uint8", value: "1" }
                            ])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes wrapped integer values (signed)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var wrapped, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.wrapElementaryValue({ typeClass: "int", bits: 8 }, 1)];
                        case 1:
                            wrapped = _a.sent();
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [wrapped])];
                        case 2:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes wrapped integer values (unsigned)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var wrapped, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.wrapElementaryValue({ typeClass: "uint", bits: 8 }, 1)];
                        case 1:
                            wrapped = _a.sent();
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [wrapped])];
                        case 2:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes wrapped fixed-point values (signed)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var wrapped, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.wrapElementaryValue({ typeClass: "fixed", bits: 168, places: 10 }, 1)];
                        case 1:
                            wrapped = _a.sent();
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [wrapped])];
                        case 2:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes wrapped fixed-point values (unsigned)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var wrapped, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.wrapElementaryValue({ typeClass: "ufixed", bits: 168, places: 10 }, 1)];
                        case 1:
                            wrapped = _a.sent();
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [wrapped])];
                        case 2:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes wrapped enum values (same)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var wrapped, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.wrapElementaryValue(enumType, 1)];
                        case 1:
                            wrapped = _a.sent();
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [wrapped])];
                        case 2:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes wrapped enum values (different)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var wrapped, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.wrapElementaryValue(alternateEnumType, 1)];
                        case 1:
                            wrapped = _a.sent();
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [wrapped])];
                        case 2:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes wrapped UDVT values (integer)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var wrapped, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.wrapElementaryValue(udvtType, 1)];
                        case 1:
                            wrapped = _a.sent();
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [wrapped])];
                        case 2:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000001");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Encodes enum out-of-range errors", function () { return __awaiter(void 0, void 0, void 0, function () {
                var wrapped, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            wrapped = {
                                type: shortEnumType,
                                kind: "error",
                                error: {
                                    kind: "EnumOutOfRangeError",
                                    type: enumType,
                                    rawAsBN: new BN(7)
                                }
                            };
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [wrapped])];
                        case 1:
                            data = (_a.sent()).data;
                            chai_1.assert.strictEqual(data, selector +
                                "0000000000000000000000000000000000000000000000000000000000000007");
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (number, positive)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_87;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [8])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_87 = _a.sent();
                            if (error_87.name !== "TypeMismatchError") {
                                throw error_87;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects negative input (number)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_88;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [-1])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_88 = _a.sent();
                            if (error_88.name !== "TypeMismatchError") {
                                throw error_88;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (string, positive)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_89;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["8"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_89 = _a.sent();
                            if (error_89.name !== "TypeMismatchError") {
                                throw error_89;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects negative input (string)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_90;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["-1"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_90 = _a.sent();
                            if (error_90.name !== "TypeMismatchError") {
                                throw error_90;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (bigint, positive)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_91;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [BigInt(8)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_91 = _a.sent();
                            if (error_91.name !== "TypeMismatchError") {
                                throw error_91;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects negative input (bigint)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_92;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [BigInt(-1)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_92 = _a.sent();
                            if (error_92.name !== "TypeMismatchError") {
                                throw error_92;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (BN, positive)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_93;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new BN(8)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_93 = _a.sent();
                            if (error_93.name !== "TypeMismatchError") {
                                throw error_93;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects negative input (BN)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_94;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new BN(-1)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_94 = _a.sent();
                            if (error_94.name !== "TypeMismatchError") {
                                throw error_94;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (Big, positive)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_95;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new big_js_1.default(8)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_95 = _a.sent();
                            if (error_95.name !== "TypeMismatchError") {
                                throw error_95;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects negative input (Big)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_96;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new big_js_1.default(-1)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_96 = _a.sent();
                            if (error_96.name !== "TypeMismatchError") {
                                throw error_96;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (BigNumber, positive)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_97;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new bignumber_js_1.default(8)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_97 = _a.sent();
                            if (error_97.name !== "TypeMismatchError") {
                                throw error_97;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects negative input (BigNumber)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_98;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new bignumber_js_1.default(-1)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_98 = _a.sent();
                            if (error_98.name !== "TypeMismatchError") {
                                throw error_98;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (Ethers BigNumber, positive)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_99;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [bignumber_1.BigNumber.from(8)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_99 = _a.sent();
                            if (error_99.name !== "TypeMismatchError") {
                                throw error_99;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects negative input (Ethers BigNumber)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_100;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [bignumber_1.BigNumber.from(-1)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_100 = _a.sent();
                            if (error_100.name !== "TypeMismatchError") {
                                throw error_100;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects out-of-range input (Ethers FixedNumber, positive)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_101;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [bignumber_1.FixedNumber.from(8)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_101 = _a.sent();
                            if (error_101.name !== "TypeMismatchError") {
                                throw error_101;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects negative input (Ethers FixedNumber)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_102;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [bignumber_1.FixedNumber.from(-1)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Out-of-range input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_102 = _a.sent();
                            if (error_102.name !== "TypeMismatchError") {
                                throw error_102;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects non-finite input (number)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_103;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [NaN])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Non-finite input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_103 = _a.sent();
                            if (error_103.name !== "TypeMismatchError") {
                                throw error_103;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects non-finite input (BigNumber)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_104;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new bignumber_js_1.default(NaN)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Non-finite input should cause exception");
                            return [3 /*break*/, 3];
                        case 2:
                            error_104 = _a.sent();
                            if (error_104.name !== "TypeMismatchError") {
                                throw error_104;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects non-integer input (number)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_105;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [1.5])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Non-integer input should be rejected");
                            return [3 /*break*/, 3];
                        case 2:
                            error_105 = _a.sent();
                            if (error_105.name !== "TypeMismatchError") {
                                throw error_105;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects non-integer input (string)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_106;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["1.5"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Non-integer input should be rejected");
                            return [3 /*break*/, 3];
                        case 2:
                            error_106 = _a.sent();
                            if (error_106.name !== "TypeMismatchError") {
                                throw error_106;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects non-integer input (Big)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_107;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new big_js_1.default(1.5)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Non-integer input should be rejected");
                            return [3 /*break*/, 3];
                        case 2:
                            error_107 = _a.sent();
                            if (error_107.name !== "TypeMismatchError") {
                                throw error_107;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects non-integer input (BigNumber)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_108;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [new bignumber_js_1.default(1.5)])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Non-integer input should be rejected");
                            return [3 /*break*/, 3];
                        case 2:
                            error_108 = _a.sent();
                            if (error_108.name !== "TypeMismatchError") {
                                throw error_108;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects non-integer input (Ethers FixedNumber)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_109;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [bignumber_1.FixedNumber.from("1.5")])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Non-integer input should be rejected");
                            return [3 /*break*/, 3];
                        case 2:
                            error_109 = _a.sent();
                            if (error_109.name !== "TypeMismatchError") {
                                throw error_109;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects just whitespace", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_110;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" "])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Non-numeric string got accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_110 = _a.sent();
                            if (error_110.name !== "TypeMismatchError") {
                                throw error_110;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects bare minus sign", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_111;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["-"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Non-numeric string got accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_111 = _a.sent();
                            if (error_111.name !== "TypeMismatchError") {
                                throw error_111;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects double negatives", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_112;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["--0"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Non-numeric string got accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_112 = _a.sent();
                            if (error_112.name !== "TypeMismatchError") {
                                throw error_112;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects double minus sign", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_113;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["--"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Non-numeric string got accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_113 = _a.sent();
                            if (error_113.name !== "TypeMismatchError") {
                                throw error_113;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects unrecognized unit", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_114;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["2 kwei"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Unrecognized unit got accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_114 = _a.sent();
                            if (error_114.name !== "TypeMismatchError") {
                                throw error_114;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects invalid hexadecimal", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_115;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["0xg"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Bad hexadecimal got accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_115 = _a.sent();
                            if (error_115.name !== "TypeMismatchError") {
                                throw error_115;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects invalid octal", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_116;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["0xo"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Bad octal got accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_116 = _a.sent();
                            if (error_116.name !== "TypeMismatchError") {
                                throw error_116;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects invalid binary", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_117;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["0b2"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Bad binary got accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_117 = _a.sent();
                            if (error_117.name !== "TypeMismatchError") {
                                throw error_117;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects negative bytes", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_118;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [{ length: 1, 0: -1 }])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Accepted negative byte");
                            return [3 /*break*/, 3];
                        case 2:
                            error_118 = _a.sent();
                            if (error_118.name !== "TypeMismatchError") {
                                throw error_118;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects fractional bytes", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_119;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [{ length: 1, 0: 0.5 }])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Accepted fractional byte");
                            return [3 /*break*/, 3];
                        case 2:
                            error_119 = _a.sent();
                            if (error_119.name !== "TypeMismatchError") {
                                throw error_119;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects non-numeric bytes", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_120;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                    { length: 1, 0: "garbage" }
                                ])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Accepted non-numeric byte");
                            return [3 /*break*/, 3];
                        case 2:
                            error_120 = _a.sent();
                            if (error_120.name !== "TypeMismatchError") {
                                throw error_120;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects fractional length", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_121;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [{ length: 0.5 }])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Accepted fractional length");
                            return [3 /*break*/, 3];
                        case 2:
                            error_121 = _a.sent();
                            if (error_121.name !== "TypeMismatchError") {
                                throw error_121;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects negative length", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_122;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [{ length: -1 }])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Accepted negative length");
                            return [3 /*break*/, 3];
                        case 2:
                            error_122 = _a.sent();
                            if (error_122.name !== "TypeMismatchError") {
                                throw error_122;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects unsafely large length", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_123;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [{ length: 1e100 }])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Accepted unsafely large length");
                            return [3 /*break*/, 3];
                        case 2:
                            error_123 = _a.sent();
                            if (error_123.name !== "TypeMismatchError") {
                                throw error_123;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects non-numeric length", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_124;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [{ length: "garbage" }])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Accepted non-numeric length");
                            return [3 /*break*/, 3];
                        case 2:
                            error_124 = _a.sent();
                            if (error_124.name !== "TypeMismatchError") {
                                throw error_124;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects options with whitespace", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_125;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [" Red "])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Option with whitespace accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_125 = _a.sent();
                            if (error_125.name !== "TypeMismatchError") {
                                throw error_125;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects options for wrong enum", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_126;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["Short"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Option for wrong enum accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_126 = _a.sent();
                            if (error_126.name !== "TypeMismatchError") {
                                throw error_126;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects option with wrong enum specified", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_127;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["MinusColor.Red"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Option for wrong enum accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_127 = _a.sent();
                            if (error_127.name !== "TypeMismatchError") {
                                throw error_127;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects option with wrong contract specified", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_128;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["AuxContract.Color.Red"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Option for wrong contract accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_128 = _a.sent();
                            if (error_128.name !== "TypeMismatchError") {
                                throw error_128;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects other strings", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_129;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, ["garbage"])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Non-numeric, non-option string got accepted");
                            return [3 /*break*/, 3];
                        case 2:
                            error_129 = _a.sent();
                            if (error_129.name !== "TypeMismatchError") {
                                throw error_129;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects other input (test: null)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_130;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [null])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Null should not be encoded as a number");
                            return [3 /*break*/, 3];
                        case 2:
                            error_130 = _a.sent();
                            if (error_130.name !== "TypeMismatchError") {
                                throw error_130;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects other input (test: undefined)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_131;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [undefined])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Undefined should not be encoded as a number");
                            return [3 /*break*/, 3];
                        case 2:
                            error_131 = _a.sent();
                            if (error_131.name !== "TypeMismatchError") {
                                throw error_131;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects other input (test: {})", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_132;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [{}])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Empty object should not be encoded as a number");
                            return [3 /*break*/, 3];
                        case 2:
                            error_132 = _a.sent();
                            if (error_132.name !== "TypeMismatchError") {
                                throw error_132;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects type/value pair for wrong type (uint16)", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_133;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                    { type: "uint16", value: "1" }
                                ])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Value specified as uint16 got encoded as uint8 enum");
                            return [3 /*break*/, 3];
                        case 2:
                            error_133 = _a.sent();
                            if (error_133.name !== "TypeMismatchError") {
                                throw error_133;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects nested type/value pair", function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_134;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [
                                    {
                                        type: "enum",
                                        value: {
                                            type: "enum",
                                            value: "1"
                                        }
                                    }
                                ])];
                        case 1:
                            _a.sent();
                            chai_1.assert.fail("Nested type/value pair got encoded");
                            return [3 /*break*/, 3];
                        case 2:
                            error_134 = _a.sent();
                            if (error_134.name !== "TypeMismatchError") {
                                throw error_134;
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects wrapped value for wrong type", function () { return __awaiter(void 0, void 0, void 0, function () {
                var wrapped, error_135;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, encoder.wrapElementaryValue({ typeClass: "bool" }, true)];
                        case 1:
                            wrapped = _a.sent();
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [wrapped])];
                        case 3:
                            _a.sent();
                            chai_1.assert.fail("Value wrapped as bool got encoded as integer");
                            return [3 /*break*/, 5];
                        case 4:
                            error_135 = _a.sent();
                            if (error_135.name !== "TypeMismatchError") {
                                throw error_135;
                            }
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            }); });
            it("Rejects general wrapped error result", function () { return __awaiter(void 0, void 0, void 0, function () {
                var wrapped, error_136;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            wrapped = {
                                type: enumType,
                                kind: "error",
                                error: {
                                    kind: "ReadErrorStack",
                                    from: 0,
                                    to: 0
                                }
                            };
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [wrapped])];
                        case 2:
                            _a.sent();
                            chai_1.assert.fail("Error result (of general sort) got encoded as integer");
                            return [3 /*break*/, 4];
                        case 3:
                            error_136 = _a.sent();
                            if (error_136.name !== "TypeMismatchError") {
                                throw error_136;
                            }
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
        });
    });
});
