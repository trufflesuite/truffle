import { TruffleDB } from "truffle-db/db";

const db = new TruffleDB({contracts_build_directory: process.argv[2] || process.cwd()});

export const loaderDB = TruffleDB;
