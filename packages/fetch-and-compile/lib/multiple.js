"use strict";
var __spreadArray =
  (this && this.__spreadArray) ||
  function (to, from, pack) {
    if (pack || arguments.length === 2)
      for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultipleRecognizer = void 0;
var debug_1 = require("debug");
var debug = (0, debug_1.default)("fetch-and-compile:multiple");
var Web3Utils = require("web3-utils");
var MultipleRecognizer = /** @class */ (function () {
  function MultipleRecognizer(addresses) {
    this.addressesToSkip = new Set();
    this.results = {};
    this.failureLog = {};
    this.unrecognizedAddresses = __spreadArray(
      [],
      new Set(addresses.map(Web3Utils.toChecksumAddress)),
      true
    ); //remove duplicates (checksum to make case-insensitive & canonical) and clone
  }
  MultipleRecognizer.prototype.getResults = function () {
    return {
      results: this.results,
      failures: this.failureLog
    };
  };
  /*
   * Interface methods follow
   */
  MultipleRecognizer.prototype.isAddressUnrecognized = function (address) {
    return this.unrecognizedAddresses.includes(address);
  };
  MultipleRecognizer.prototype.getAnUnrecognizedAddress = function () {
    var _this = this;
    return this.unrecognizedAddresses.find(function (address) {
      return !_this.addressesToSkip.has(address);
    });
  };
  MultipleRecognizer.prototype.markUnrecognizable = function (
    address,
    reason,
    error
  ) {
    this.failureLog[address] = { reason: reason, error: error };
    this.addressesToSkip.add(address);
  };
  MultipleRecognizer.prototype.markBadFetcher = function (_fetcherName) {
    //do nothing
  };
  MultipleRecognizer.prototype.addCompiledInfo = function (info, address) {
    this.results[address] = info;
    var index = this.unrecognizedAddresses.indexOf(address);
    this.unrecognizedAddresses.splice(index, 1); //delete the address from the array
  };
  return MultipleRecognizer;
})();
exports.MultipleRecognizer = MultipleRecognizer;
