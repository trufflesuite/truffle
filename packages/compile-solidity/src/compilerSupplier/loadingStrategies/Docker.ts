// must polyfill AbortController to use axios >=0.20.0, <=0.27.2 on node <= v14.x
import "../../polyfill";
import axios from "axios";

import axiosRetry from "axios-retry";
// @ts-ignore
import fs from "fs";
import { execSync } from "child_process";
import semver from "semver";
import { Cache } from "../Cache";
import { normalizeSolcVersion } from "../normalizeSolcVersion";
import { NoVersionError, FailedRequestError } from "../errors";
import { asyncFirst, asyncFilter, asyncFork } from "iter-tools";
import { StrategyOptions } from "../types";

export class Docker {
  private config: StrategyOptions;
  private cache: Cache;

  constructor(options: StrategyOptions) {
    const defaultConfig = {
      dockerTagsUrl:
        "https://registry.hub.docker.com/v2/repositories/ethereum/solc/tags/"
    };
    this.config = Object.assign({}, defaultConfig, options);

    this.cache = new Cache();
  }

  async load() {
    // Set a sensible limit for maxBuffer
    // See https://github.com/nodejs/node/pull/23027
    let maxBuffer = 1024 * 1024 * 100;
    if (this.config.spawn && this.config.spawn.maxBuffer) {
      maxBuffer = this.config.spawn.maxBuffer;
    }

    const versionString = await this.validateAndGetSolcVersion();

    const command =
      "docker run --platform=linux/amd64 --rm -i ethereum/solc:" +
      this.config.version +
      " --standard-json";

    try {
      return {
        compile: options =>
          String(execSync(command, { input: options, maxBuffer })),
        version: () => versionString
      };
    } catch (error) {
      if (error.message === "No matching version found") {
        throw new NoVersionError(versionString);
      }
      throw error;
    }
  }

  /**
   * Fetch list of solc versions available as Docker images.
   *
   * This returns a promise for an object with three fields:
   *   { latestRelease, releases, prereleases }
   * NOTE that `releases` and `prereleases` in this object are both
   * AsyncIterableIterators (thus, use only `for await (const ...)` to consume)
   */
  async list() {
    const allTags = this.streamAllDockerTags();

    // split stream of all tags into separate releases and prereleases streams
    const isRelease = name => !!semver.valid(name);
    const isPrerelease = name => name.match(/nightly/);
    const [allTagsA, allTagsB] = asyncFork(allTags);

    // construct prereleases stream
    const prereleases = asyncFilter(isPrerelease, allTagsB);

    // construct releases stream and immediately fork so as to allow consuming
    // the first value in the stream safely
    const [releases, forkedReleases] = asyncFork(
      asyncFilter(isRelease, allTagsA)
    );

    // grab the latest release from the forked releases stream;
    // coerce semver to remove possible `-alpine` suffix used by this repo
    const latestRelease = semver.coerce(
      await asyncFirst(forkedReleases)
    )?.version;

    return {
      prereleases,
      releases,
      latestRelease
    };
  }

  /*
   * Private methods
   */

  downloadDockerImage(image) {
    if (!semver.valid(image)) {
      const message =
        `The image version you have provided is not valid.\n` +
        `Please ensure that ${image} is a valid docker image name.`;
      throw new Error(message);
    }
    this.config.events.emit("compile:downloadDockerImage:start");
    try {
      execSync(`docker pull ethereum/solc:${image}`);
      this.config.events.emit("compile:downloadDockerImage:succeed");
    } catch (error) {
      this.config.events.emit("compile:downloadDockerImage:fail", { error });
    }
  }

  async validateAndGetSolcVersion() {
    const image = this.config.version;
    const fileName = image + ".version";

    // Skip validation if they've validated for this image before.
    if (await this.cache.has(fileName)) {
      const cachePath = this.cache.resolve(fileName);
      return fs.readFileSync(cachePath, "utf-8");
    }
    // Image specified
    if (!image) throw new NoStringError(image);

    // Docker exists locally
    try {
      execSync("docker -v");
    } catch (error) {
      throw new NoDockerError();
    }

    // Image exists locally
    try {
      execSync("docker inspect --type=image ethereum/solc:" + image);
    } catch (error) {
      console.log(`${image} does not exist locally.\n`);
      this.downloadDockerImage(image);
    }

    // Get version & cache.
    const version = execSync(
      "docker run --platform=linux/amd64 ethereum/solc:" + image + " --version"
    );
    const normalized = normalizeSolcVersion(version);
    await this.cache.add(normalized, fileName);
    return normalized;
  }

  streamAllDockerTags() {
    // build http client to account for rate limit problems
    // use axiosRetry to instate exponential backoff when requests come back
    // with expected 429
    const client = axios.create();
    axiosRetry(client, {
      retries: 5,
      retryDelay: axiosRetry.exponentialDelay,
      shouldResetTimeout: true,
      retryCondition: error => {
        const tooManyRequests = !!(
          error &&
          error.response &&
          error.response.status === 429
        );

        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) || tooManyRequests
        );
      }
    });

    const { dockerTagsUrl } = this.config;
    let nextUrl = dockerTagsUrl;

    return (async function* () {
      do {
        try {
          const {
            data: {
              // page of results
              results,
              // next page url
              next
            }
          } = await client.get(nextUrl as string, { maxRedirects: 50 });

          for (const { name } of results) {
            yield name;
          }

          nextUrl = next;
        } catch (error) {
          throw new FailedRequestError(dockerTagsUrl!, error);
        }
      } while (nextUrl);
    })();
  }
}

export class NoDockerError extends Error {
  constructor() {
    super(
      "You are trying to run dockerized solc, but docker is not installed."
    );
  }
}

export class NoStringError extends Error {
  constructor(input) {
    const message =
      "`compilers.solc.version` option must be a string specifying:\n" +
      "   - a path to a locally installed solcjs\n" +
      "   - a solc version or range (ex: '0.4.22' or '^0.5.0')\n" +
      "   - a docker image name (ex: 'stable')\n" +
      "   - 'native' to use natively installed solc\n" +
      "Received: " +
      input +
      " instead.";
    super(message);
  }
}
