import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:pouch:adapters:couch");

import PouchDB from "pouchdb";
import { kebabCase } from "change-case";

import { Collections } from "@truffle/db/meta/collections";
import { GetDefaultSettings } from "./types";
import * as Base from "./base";

export interface DatabasesSettings {
  url: string;
  auth?: {
    username: string;
    password: string;
  };
}

export const getDefaultSettings: GetDefaultSettings = ({}) => ({
  url: "http://localhost:5984"
});

export class Databases<C extends Collections> extends Base.Databases<C> {
  private _createDatabase: (resource) => PouchDB.Database;

  setup(settings: DatabasesSettings) {
    const { auth } = settings;

    let { url } = settings;
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
