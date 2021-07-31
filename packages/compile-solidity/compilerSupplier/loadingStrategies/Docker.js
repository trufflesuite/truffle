const axios = require("axios");
const axiosRetry = require("axios-retry");
const fs = require("fs");
const { execSync } = require("child_process");
const ora = require("ora");
const semver = require("semver");
const Cache = require("../Cache");
const { normalizeSolcVersion } = require("../normalizeSolcVersion");
const { NoVersionError } = require("../errors");
const { asyncFirst, asyncFilter, asyncFork } = require("iter-tools");

class Docker {
  constructor(options) {
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
      "docker run --rm -i ethereum/solc:" +
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
      throw new Error(error);
    }
  }

  async listVersions() {
    const isRelease = name => !!semver.valid(name);
    const isPrerelease = name => name.match(/nightly/);

    const [resultsA, resultsB] = asyncFork(this.streamAllDockerTags());

    const [releases, forkedReleases] = asyncFork(
      asyncFilter(isRelease, resultsA)
    );
    const prereleases = asyncFilter(isPrerelease, resultsB);
    const latestRelease = semver.coerce(await asyncFirst(forkedReleases))
      .version;

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
    const spinner = ora({
      text: "Downloading Docker image",
      color: "red"
    }).start();
    try {
      execSync(`docker pull ethereum/solc:${image}`);
      spinner.stop();
    } catch (error) {
      spinner.stop();
      throw new Error(error);
    }
  }

  async validateAndGetSolcVersion() {
    const image = this.config.version;
    const fileName = image + ".version";

    // Skip validation if they've validated for this image before.
    if (this.cache.fileIsCached(fileName)) {
      const cachePath = this.cache.resolveCache(fileName);
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
      console.log("Attempting to download the Docker image.");
      this.downloadDockerImage(image);
    }

    // Get version & cache.
    const version = execSync(
      "docker run ethereum/solc:" + image + " --version"
    );
    const normalized = normalizeSolcVersion(version);
    this.cache.addFileToCache(normalized, fileName);
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
        const tooManyRequests =
          error && error.response && error.response.status === 429;

        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) || tooManyRequests
        );
      }
    });

    let nextUrl = this.config.dockerTagsUrl;

    return (async function* () {
      do {
        const {
          data: {
            // page of results
            results,
            // next page url
            next
          }
        } = await client.get(nextUrl, { maxRedirects: 50 });

        for (const { name } of results) {
          yield name;
        }

        nextUrl = next;
      } while (nextUrl);
    })();
  }
}

class NoDockerError extends Error {
  constructor() {
    super(
      "You are trying to run dockerized solc, but docker is not installed."
    );
  }
}

class NoStringError extends Error {
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

module.exports = Docker;
