let rlp = require("rlp");
let util = require("ethereumjs-util");

var _typeof =
  typeof Symbol === "function" && typeof Symbol.iterator === "symbol"
    ? function(obj) {
        return typeof obj;
      }
    : function(obj) {
        return obj &&
          typeof Symbol === "function" &&
          obj.constructor === Symbol &&
          obj !== Symbol.prototype
          ? "symbol"
          : typeof obj;
      };

util.defineProperties = function(self, fields, data) {
  self.raw = [];
  self._fields = [];

  // attach the `toJSON`
  self.toJSON = function(label) {
    if (label) {
      var obj = {};
      self._fields.forEach(function(field) {
        obj[field] = "0x" + self[field].toString("hex");
      });
      return obj;
    }
    return util.baToJSON(this.raw);
  };

  self.serialize = function serialize() {
    return rlp.encode(self.raw);
  };

  fields.forEach(function(field, i) {
    self._fields.push(field.name);
    function getter() {
      return self.raw[i];
    }
    function setter(v) {
      v = util.toBuffer(v);

      if (v.toString("hex") === "00" && !field.allowZero) {
        v = Buffer.allocUnsafe(0);
      }

      if (field.allowLess && field.length) {
        v = util.stripZeros(v);
        //assert(field.length >= v.length, 'The field ' + field.name + ' must not have more ' + field.length + ' bytes');
      } else if (!(field.allowZero && v.length === 0) && field.length) {
        //assert(field.length === v.length, 'The field ' + field.name + ' must have byte length of ' + field.length);
      }

      self.raw[i] = v;
    }

    Object.defineProperty(self, field.name, {
      enumerable: true,
      configurable: true,
      get: getter,
      set: setter
    });

    if (field.default) {
      self[field.name] = field.default;
    }

    // attach alias
    if (field.alias) {
      Object.defineProperty(self, field.alias, {
        enumerable: false,
        configurable: true,
        set: setter,
        get: getter
      });
    }
  });

  // if the constuctor is passed data
  if (data) {
    if (typeof data === "string") {
      data = Buffer.from(util.stripHexPrefix(data), "hex");
    }

    if (Buffer.isBuffer(data)) {
      data = rlp.decode(data);
    }

    if (Array.isArray(data)) {
      if (data.length > self._fields.length) {
        throw new Error("wrong number of fields in data");
      }

      // make sure all the items are buffers
      data.forEach(function(d, i) {
        self[self._fields[i]] = util.toBuffer(d);
      });
    } else if (
      (typeof data === "undefined" ? "undefined" : _typeof(data)) === "object"
    ) {
      var keys = Object.keys(data);
      fields.forEach(function(field) {
        if (keys.indexOf(field.name) !== -1)
          self[field.name] = data[field.name];
        if (keys.indexOf(field.alias) !== -1)
          self[field.alias] = data[field.alias];
      });
    } else {
      throw new Error("invalid data");
    }
  }
};

const async = require("async");
let Cache = require("ethereumjs-vm/dist/cache");

Cache.prototype.warm = function(addresses, cb) {
  var self = this;
  // shim till async supports iterators
  var accountArr = [];
  addresses.forEach(function(val) {
    if (val) accountArr.push(val);
  });

  async.eachSeries(
    accountArr,
    function(addressHex, done) {
      var address = Buffer.from(addressHex.replace("0x", ""), "hex");
      self._lookupAccount(address, function(err, account) {
        if (err) return done(err);
        self._update(address, account, false, account.exists);
        done();
      });
    },
    cb
  );
};
