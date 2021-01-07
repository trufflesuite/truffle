import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:pouch:fs");

import path from "path";
import PouchDB from "pouchdb";
import * as jsondown from "jsondown";
import * as PouchDBUtils from "pouchdb-utils";
import CoreLevelPouch from "pouchdb-adapter-leveldb-core";

import { Collections } from "@truffle/db/meta/collections";
import { Databases } from "./databases";

export class FSDatabases<C extends Collections> extends Databases<C> {
  private directory: string;

  setup(options) {
    this.directory = options.settings.directory;

    this.jsondownpouch["valid"] = () => true;
    this.jsondownpouch["use_prefix"] = false;

    (PouchDB as any).adapter("jsondown", this.jsondownpouch, true);
  }

  createDatabase(resource) {
    const savePath = path.join(this.directory, resource);
    return new PouchDB(savePath, { adapter: "jsondown" });
  }

  jsondownpouch(opts: any, callback: any): any {
    const _opts = PouchDBUtils.assign(
      {
        db: jsondown.default
      },
      opts
    );

    CoreLevelPouch.call(this, _opts, callback);
  }
}
