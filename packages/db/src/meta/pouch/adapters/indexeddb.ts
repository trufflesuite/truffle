import path from "path";
import fse from "fs-extra";
import PouchDB from "pouchdb";

import type { Collections } from "@truffle/db/meta/collections";
import type { GetDefaultSettings } from "./types";
import * as Base from "./base";
import Config from "@truffle/config";

export interface DatabasesSettings {
  directory: string;
}

export const getDefaultSettings: GetDefaultSettings = () => ({
  directory: path.join(Config.getTruffleDataDirectory(), ".db")
});

export class Databases<C extends Collections> extends Base.Databases<C> {
  private directory: string;

  override setup(settings: DatabasesSettings) {
    // ensure db files reside in a path that ends with indexeddb
    // whether specified in config, or using default
    this.directory = path.join(settings.directory, "indexeddb");
    fse.ensureDirSync(this.directory);
  }

  createDatabase(resource) {
    const savePath = path.resolve(this.directory, resource);
    return new PouchDB(savePath); // uses IndexedDB
  }
}
