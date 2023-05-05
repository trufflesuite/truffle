import Config from "@truffle/config";
import path from "path";
import fs from "fs";
// @ts-ignore
import * as fsPromises from "fs/promises";

const fileNotFoundMessage = "no such file or directory";

export class Cache {
  private compilerCachePath: string;
  public memoizedCompilers: Map<string, string>;

  constructor() {
    const compilersDir = path.resolve(
      Config.getTruffleDataDirectory(),
      "compilers"
    );
    const compilerCachePath = path.resolve(compilersDir, "node_modules"); // because babel binds to require & does weird things
    if (!fs.existsSync(compilersDir)) fs.mkdirSync(compilersDir);
    if (!fs.existsSync(compilerCachePath)) fs.mkdirSync(compilerCachePath); // for 5.0.8 users

    this.compilerCachePath = compilerCachePath;
    this.memoizedCompilers = new Map();
  }

  async list() {
    return await fsPromises.readdir(this.compilerCachePath);
  }

  async add(code: string, fileName: string) {
    const filePath = this.resolve(fileName);
    await fsPromises.writeFile(filePath, code);
    this.memoizedCompilers.set(filePath, code);
  }

  async has(fileName: string): Promise<boolean> {
    const filePath = this.resolve(fileName);
    try {
      await fsPromises.stat(filePath);
      return true;
    } catch (error) {
      // only throw if the error is due to something other than it not existing
      if (!error.message.includes(fileNotFoundMessage)) {
        throw error;
      }
      return false;
    }
  }

  async loadFile(fileName: string): Promise<string> {
    const filePath = this.resolve(fileName);
    if (this.memoizedCompilers.has(filePath)) {
      return this.memoizedCompilers.get(filePath)!;
    }
    try {
      const compiler = (await fsPromises.readFile(filePath)).toString();
      this.memoizedCompilers.set(filePath, compiler);
      return compiler;
    } catch (error) {
      if (!error.message.includes(fileNotFoundMessage)) {
        throw error;
      } else {
        throw new Error("The specified file could not be found.");
      }
    }
  }

  resolve(fileName: string) {
    return path.resolve(this.compilerCachePath, fileName);
  }
}
