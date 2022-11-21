const childProcess = require("child_process");

class VSCodeDebugger {
  constructor(config, txHash) {
    this.config = config;
    this.txHash = txHash;
  }

  /**
   * This function is responsible for opening the debugger in vscode.
   */
  async run() {
    // Sets the URL
    const url = new URL("/debug", "vscode://trufflesuite-csi.truffle-vscode");

    const disableFetchExternal = this.config.fetchExternal ? false : true;

    // Sets the query parameters
    url.searchParams.set("txHash", this.txHash);
    url.searchParams.set("workingDirectory", this.config.working_directory);
    url.searchParams.set("providerUrl", this.getProviderUrl());
    url.searchParams.set("network", this.config.network);
    url.searchParams.set("disableFetchExternal", disableFetchExternal);

    // Opens VSCode based on OS
    const openCommand = process.platform === "win32" ? `start ""` : `open`;
    const commandLine = `${openCommand} "${url}"`;

    // Defines the options for the child process. An abort signal is used to cancel the process, if necessary.
    const controller = new AbortController();
    const { signal } = controller;

    // Executes the command
    childProcess.exec(commandLine, { signal }, (stderr, error) => {
      if (stderr) {
        throw new Error(`Error opening the debug session in VSCode: ${stderr}`);
      }
      if (error) {
        controller.abort();
        throw new Error(`Error opening the debug session in VSCode: ${error}`);
      }
    });

    // Sends a message to the user
    this.config.logger.log("Opening truffle debugger in VSCode...");
  }

  /**
   * This function is for getting the provider URL.
   */
  getProviderUrl() {
    // Checks if the user is using a custom provider
    if (this.config.url) {
      return this.config.url;
    }

    // Checks if there is a provider in the config
    if (this.config.provider) {
      return this.config.provider.host;
    }

    // Creates the provider URL from host and port
    if (this.config.network_config) {
      return new URL(
        `http://${this.config.network_config.host}:${this.config.network_config.port}`
      ).toString();
    }
  }
}

module.exports = {
  VSCodeDebugger
};
