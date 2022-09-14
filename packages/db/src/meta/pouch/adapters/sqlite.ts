import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:pouch:adapters:sqlite");

import path from "path";
import fse from "fs-extra";
import PouchDB from "pouchdb";
import PouchDBNodeWebSQLAdapter from "pouchdb-adapter-cordova-sqlite";

import type { Collections } from "@truffle/db/meta/collections";
import type { GetDefaultSettings } from "./types";
import * as Base from "./base";
import Config from "@truffle/config";

export interface DatabasesSettings {
  directory: string;
}

export const getDefaultSettings: GetDefaultSettings = () => ({
  directory: path.join(Config.getTruffleDataDirectory(), ".db", "sqlite")
});

export class Databases<C extends Collections> extends Base.Databases<C> {
  private directory: string;

  setup(settings: DatabasesSettings) {
    this.directory = settings.directory;
    fse.ensureDirSync(this.directory);

    PouchDB.plugin(PouchDBNodeWebSQLAdapter);
  }

  createDatabase(resource) {
    const savePath = path.resolve(this.directory, resource);
    return new PouchDB(savePath, { adapter: "cordova-sqlite" });
  }
}
