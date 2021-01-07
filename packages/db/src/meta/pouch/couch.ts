import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:pouch:couch");

import PouchDB from "pouchdb";
import { kebabCase } from "change-case";

import { Collections } from "@truffle/db/meta/collections";
import { Databases } from "./databases";

export interface CouchDatabaseSettings {
  url: string;
  auth: {
    username: string;
    password: string;
  };
}

export class CouchDatabases<C extends Collections> extends Databases<C> {
  private _createDatabase: (resource) => PouchDB.Database;

  setup(options) {
    const { auth } = options.settings;

    let { url } = options.settings;
    if (url.endsWith("/")) {
      url = url.slice(0, -1);
    }

    // put sensitive information inside a closure so it's not as easily found
    this._createDatabase = resource => {
      const remotePath = `${url}/${kebabCase(resource)}`;
      debug("remotePath %O", remotePath);

      return new PouchDB(remotePath, { auth });
    };
  }

  createDatabase(resource) {
    return this._createDatabase(resource);
  }
}
