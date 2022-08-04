import Config from "@truffle/config";
import path from "path";
import fs from "fs";

export class Cache {
  private compilerCachePath: string;

  constructor() {
    const compilersDir = path.resolve(
      Config.getTruffleDataDirectory(),
      "compilers"
    );
    const compilerCachePath = path.resolve(compilersDir, "node_modules"); // because babel binds to require & does weird things
    if (!fs.existsSync(compilersDir)) fs.mkdirSync(compilersDir);
    if (!fs.existsSync(compilerCachePath)) fs.mkdirSync(compilerCachePath); // for 5.0.8 users

    this.compilerCachePath = compilerCachePath;
  }

  list() {
    return fs.readdirSync(this.compilerCachePath);
  }

  add(code: string, fileName: string) {
    const filePath = this.resolve(fileName);
    fs.writeFileSync(filePath, code);
  }

  has(fileName: string) {
    const file = this.resolve(fileName);
    return fs.existsSync(file);
  }

  resolve(fileName: string) {
    return path.resolve(this.compilerCachePath, fileName);
  }
}
