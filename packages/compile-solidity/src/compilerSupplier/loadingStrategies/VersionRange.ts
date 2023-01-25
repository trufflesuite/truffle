import debugModule from "debug";
const debug = debugModule("compile:compilerSupplier");

import requireFromString from "require-from-string";
import originalRequire from "original-require";

// must polyfill AbortController to use axios >=0.20.0, <=0.27.2 on node <= v14.x
import "../../polyfill";
import { default as axiosPlain, AxiosResponse } from "axios";

const environmentProxy = process.env.https_proxy || process.env.http_proxy;
let axios = axiosPlain;
if (proxy) {
  const HttpsProxyAgent = require("https-proxy-agent");
  const agent = new HttpsProxyAgent(environmentProxy);
  axios = axiosPlain.create({
    httpsAgent: agent
  });
}

import semver from "semver";

import solcWrap from "solc/wrapper";
import { Cache } from "../Cache";
import { observeListeners } from "../observeListeners";
import { NoVersionError, CompilerFetchingError } from "../errors";
import { StrategyOptions } from "../types";

type SolidityCompilersList = {
  builds: object[];
  latestRelease: string;
  releases: object;
};

export class VersionRange {
  public config: StrategyOptions;
  public cache: Cache;

  constructor(options: StrategyOptions) {
    const defaultConfig = {
      compilerRoots: [
        // this order of url root preference was recommended by Cameel from the
        // Solidity team here -- https://github.com/trufflesuite/truffle/pull/5008
        "https://relay.trufflesuite.com/solc/emscripten-wasm32/",
        "https://binaries.soliditylang.org/emscripten-wasm32/",
        "https://relay.trufflesuite.com/solc/emscripten-asmjs/",
        "https://binaries.soliditylang.org/emscripten-asmjs/",
        "https://solc-bin.ethereum.org/bin/",
        "https://ethereum.github.io/solc-bin/bin/"
      ]
    };
    this.config = Object.assign({}, defaultConfig, options);

    this.cache = new Cache();
  }

  async load(versionRange: string) {
    const rangeIsSingleVersion = semver.valid(versionRange);
    if (rangeIsSingleVersion && this.versionIsCached(versionRange)) {
      return this.getCachedSolcByVersionRange(versionRange);
    }

    try {
      return await this.getSolcFromCacheOrUrl(versionRange);
    } catch (error) {
      if (error.message.includes("Failed to complete request")) {
        return this.getSatisfyingVersionFromCache(versionRange);
      }
      throw error;
    }
  }

  async list(index = 0) {
    if (index >= this.config.compilerRoots!.length) {
      throw new Error(
        `Failed to fetch the list of Solidity compilers from the following ` +
          `sources: ${this.config.compilerRoots}. Make sure you are connected ` +
          `to the internet.`
      );
    }
    let data: SolidityCompilersList;
    try {
      const attemptNumber = index + 1;
      data = await this.getSolcVersionsForSource(
        this.config.compilerRoots![index],
        attemptNumber
      );
    } catch (error) {
      if (error.message.includes("Failed to fetch compiler list at")) {
        return await this.list(index + 1);
      }
      throw error;
    }
    const { latestRelease } = data;
    const prereleases = data.builds
      .filter(build => build["prerelease"])
      .map(build => build["longVersion"]);

    // ensure releases are listed in descending order
    const releases = semver.rsort(Object.keys(data.releases));

    return {
      prereleases,
      releases,
      latestRelease
    };
  }

  compilerFromString(code: string) {
    const listeners = observeListeners();
    try {
      const soljson = requireFromString(code);
      return solcWrap(soljson);
    } finally {
      listeners.cleanup();
    }
  }

  findNewestValidVersion(
    version: string,
    allVersions: SolidityCompilersList
  ): string | null {
    return semver.maxSatisfying(
      Object.keys(allVersions.releases || {}),
      version
    );
  }

  getCachedSolcByFileName(fileName: string) {
    const listeners = observeListeners();
    try {
      const filePath = this.cache.resolve(fileName);
      const soljson = originalRequire(filePath);
      debug("soljson %o", soljson);
      return solcWrap(soljson);
    } finally {
      listeners.cleanup();
    }
  }

  // Range can also be a single version specification like "0.5.0"
  getCachedSolcByVersionRange(version: string) {
    const cachedCompilerFileNames = this.cache.list();
    const validVersions = cachedCompilerFileNames.filter(fileName => {
      const match = fileName.match(/v\d+\.\d+\.\d+.*/);
      if (match) return semver.satisfies(match[0], version);
    });

    const multipleValidVersions = validVersions.length > 1;
    const compilerFileName = multipleValidVersions
      ? this.getMostRecentVersionOfCompiler(validVersions)
      : validVersions[0];
    return this.getCachedSolcByFileName(compilerFileName);
  }

  getCachedSolcFileName(commit: string) {
    const cachedCompilerFileNames = this.cache.list();
    return cachedCompilerFileNames.find(fileName => {
      return fileName.includes(commit);
    });
  }

  getMostRecentVersionOfCompiler(versions: string[]) {
    return versions.reduce((mostRecentVersionFileName, fileName) => {
      const match = fileName.match(/v\d+\.\d+\.\d+.*/);
      const mostRecentVersionMatch =
        mostRecentVersionFileName.match(/v\d+\.\d+\.\d+.*/);
      return semver.gtr(match![0], mostRecentVersionMatch![0])
        ? fileName
        : mostRecentVersionFileName;
    }, "-v0.0.0+commit");
  }

  getSatisfyingVersionFromCache(versionRange: string) {
    if (this.versionIsCached(versionRange)) {
      return this.getCachedSolcByVersionRange(versionRange);
    }
    throw new NoVersionError(versionRange);
  }

  async getAndCacheSolcByUrl(fileName: string, index: number) {
    const { events, compilerRoots } = this.config;
    const url = `${compilerRoots![index].replace(/\/+$/, "")}/${fileName}`;
    events.emit("downloadCompiler:start", {
      attemptNumber: index + 1
    });
    let response: AxiosResponse;
    try {
      response = await axios.get(url, { maxRedirects: 50 });
    } catch (error) {
      events.emit("downloadCompiler:fail");
      throw error;
    }
    events.emit("downloadCompiler:succeed");
    this.cache.add(response.data, fileName);
    return this.compilerFromString(response.data);
  }

  async getSolcFromCacheOrUrl(versionConstraint: string, index: number = 0) {
    // go through all sources (compilerRoots) trying to locate a
    // suitable version of the Solidity compiler
    const { compilerRoots, events } = this.config;
    if (!compilerRoots || compilerRoots.length === 0) {
      events.emit("fetchSolcList:fail");
      throw new NoUrlError();
    }
    if (index >= compilerRoots.length) {
      throw new CompilerFetchingError(compilerRoots);
    }

    let allVersionsForSource: SolidityCompilersList,
      versionToUse: string | null;
    try {
      const attemptNumber = index + 1;
      allVersionsForSource = await this.getSolcVersionsForSource(
        compilerRoots[index],
        attemptNumber
      );
      const isVersionRange = !semver.valid(versionConstraint);
      versionToUse = isVersionRange
        ? this.findNewestValidVersion(versionConstraint, allVersionsForSource)
        : versionConstraint;
      if (versionToUse === null) {
        throw new Error("No valid version found for source.");
      }
      const fileName = this.getSolcVersionFileName(
        versionToUse,
        allVersionsForSource
      );
      if (!fileName) throw new NoVersionError(versionToUse);

      if (this.cache.has(fileName)) {
        return this.getCachedSolcByFileName(fileName);
      }
      return await this.getAndCacheSolcByUrl(fileName, index);
    } catch (error) {
      const attemptNumber = index + 1;
      return await this.getSolcFromCacheOrUrl(versionConstraint, attemptNumber);
    }
  }

  async getSolcVersionsForSource(
    urlRoot: string,
    attemptNumber: number
  ): Promise<SolidityCompilersList> {
    const { events } = this.config;
    events.emit("fetchSolcList:start", { attemptNumber });

    // trim trailing slashes from compilerRoot
    const url = `${urlRoot.replace(/\/+$/, "")}/list.json`;
    try {
      const response = await axios.get(url, { maxRedirects: 50 });
      return response.data;
    } catch (error) {
      events.emit("fetchSolcList:fail");
      throw new Error(`Failed to fetch compiler list at ${url}`);
    }
  }

  getSolcVersionFileName(
    version: string,
    allVersions: SolidityCompilersList
  ): string | null {
    if (allVersions.releases[version]) return allVersions.releases[version];

    const isPrerelease =
      version.includes("nightly") || version.includes("commit");

    if (isPrerelease) {
      for (let build of allVersions.builds) {
        const exists =
          build["prerelease"] === version ||
          build["build"] === version ||
          build["longVersion"] === version;

        if (exists) return build["path"];
      }
    }

    const versionToUse = this.findNewestValidVersion(version, allVersions);

    if (versionToUse) return allVersions.releases[versionToUse];

    return null;
  }

  versionIsCached(version: string) {
    const cachedCompilerFileNames = this.cache.list();
    const cachedVersions = cachedCompilerFileNames
      .map(fileName => {
        const match = fileName.match(/v\d+\.\d+\.\d+.*/);
        if (match) return match[0];
      })
      .filter((version): version is string => !!version);
    return cachedVersions.find(cachedVersion =>
      semver.satisfies(cachedVersion, version)
    );
  }
}

export class NoUrlError extends Error {
  constructor() {
    super("compiler root URL missing");
  }
}
