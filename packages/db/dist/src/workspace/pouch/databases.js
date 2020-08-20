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
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.Databases = void 0;
const pouchdb_1 = __importDefault(require("pouchdb"));
const pouchdb_debug_1 = __importDefault(require("pouchdb-debug"));
const pouchdb_find_1 = __importDefault(require("pouchdb-find"));
const helpers_1 = require("@truffle/db/helpers");
/**
 * Aggegrates logic for interacting wth a set of PouchDB databases identified
 * by resource collection name.
 */
class Databases {
  constructor(options) {
    this.setup(options);
    this.definitions = options.definitions;
    pouchdb_1.default.plugin(pouchdb_debug_1.default);
    pouchdb_1.default.plugin(pouchdb_find_1.default);
    this.collections = Object.keys(options.definitions)
      .map(resource => ({
        [resource]: this.createDatabase(resource)
      }))
      .reduce((a, b) => Object.assign(Object.assign({}, a), b), {});
    this.ready = this.initialize();
  }
  setup(_) {}
  initialize() {
    return __awaiter(this, void 0, void 0, function* () {
      yield Promise.all(
        Object.entries(this.definitions).map(([collectionName, definition]) =>
          this.initializeCollection(collectionName, definition)
        )
      );
    });
  }
  initializeCollection(collectionName, definition) {
    return __awaiter(this, void 0, void 0, function* () {
      const collection = this.collections[collectionName];
      const { createIndexes } = definition;
      for (let index of createIndexes || []) {
        yield collection.createIndex({ index });
      }
    });
  }
  all(collectionName) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.find(collectionName, { selector: {} });
    });
  }
  find(collectionName, options) {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.ready;
      // allows searching with `id` instead of pouch's internal `_id`,
      // since we call the field `id` externally, and this approach avoids
      // an extra index
      const fixIdSelector = selector =>
        Object.entries(selector)
          .map(([field, predicate]) =>
            field === "id" ? { _id: predicate } : { [field]: predicate }
          )
          .reduce((a, b) => Object.assign(Object.assign({}, a), b), {});
      try {
        const { docs } = yield this.collections[collectionName].find(
          Object.assign(Object.assign({}, options), {
            selector: fixIdSelector(options.selector)
          })
        );
        // make sure we include `id` in the response as well
        return docs.map(doc =>
          Object.assign(Object.assign({}, doc), { id: doc["_id"] })
        );
      } catch (error) {
        console.log(`Error fetching all ${collectionName}\n`);
        console.log(error);
        return [];
      }
    });
  }
  get(collectionName, id) {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.ready;
      try {
        const result = yield this.collections[collectionName].get(id);
        return Object.assign(Object.assign({}, result), { id });
      } catch (_) {
        return null;
      }
    });
  }
  add(collectionName, input) {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.ready;
      const resources = yield Promise.all(
        input[collectionName].map(resourceInput =>
          __awaiter(this, void 0, void 0, function* () {
            const id = this.generateId(collectionName, resourceInput);
            // check for existing
            const resource = yield this.get(collectionName, id);
            if (resource) {
              return resource;
            }
            const resourceAdded = yield this.collections[collectionName].put(
              Object.assign(Object.assign({}, resourceInput), { _id: id })
            );
            return Object.assign(Object.assign({}, resourceInput), { id });
          })
        )
      );
      return {
        [collectionName]: resources
      };
    });
  }
  update(collectionName, input) {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.ready;
      const resources = yield Promise.all(
        input[collectionName].map(resourceInput =>
          __awaiter(this, void 0, void 0, function* () {
            const id = this.generateId(collectionName, resourceInput);
            // check for existing
            const resource = yield this.get(collectionName, id);
            const { _rev } = resource ? resource : {};
            const resourceAdded = yield this.collections[collectionName].put(
              Object.assign(Object.assign({}, resourceInput), { _rev, _id: id })
            );
            return Object.assign(Object.assign({}, resourceInput), { id });
          })
        )
      );
      return {
        [collectionName]: resources
      };
    });
  }
  remove(collectionName, input) {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.ready;
      yield Promise.all(
        input[collectionName].map(resourceInput =>
          __awaiter(this, void 0, void 0, function* () {
            const id = this.generateId(collectionName, resourceInput);
            const resource = yield this.get(collectionName, id);
            const { _rev } = resource ? resource : {};
            if (_rev) {
              yield this.collections[collectionName].put({
                _rev,
                _id: id,
                _deleted: true
              });
            }
          })
        )
      );
    });
  }
  generateId(collectionName, input) {
    const { idFields } = this.definitions[collectionName];
    return helpers_1.generateId(
      idFields.reduce(
        (obj, field) =>
          Object.assign(Object.assign({}, obj), { [field]: input[field] }),
        {}
      )
    );
  }
}
exports.Databases = Databases;
//# sourceMappingURL=databases.js.map
