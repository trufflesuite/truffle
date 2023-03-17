import { name as pluginName } from "../package.json";
import { URL } from "url";
import { extendConfig, task } from "hardhat/config";
import { HardhatPluginError } from "hardhat/plugins";
import type {
  HardhatConfig,
  HardhatUserConfig,
  HttpNetworkConfig,
  TruffleDashboardNetworkConfigurableKeys
} from "hardhat/types";

import { DashboardMessageBusClient } from "@truffle/dashboard-message-bus-client";
import * as FromHardhat from "@truffle/from-hardhat";
import TruffleConfig from "@truffle/config";

import "./type-extensions";

const defaults = {
  networkName: "truffle-dashboard",
  disableManagedNetwork: false,
  host: "localhost",
  port: 24012,
  gas: "auto",
  gasPrice: "auto",
  gasMultiplier: 1,
  timeout: 0,
  httpHeaders: {}
} as const;

extendConfig((config: HardhatConfig, userConfig: HardhatUserConfig) => {
  // Validate configuration and fill in defaults for missing user config fields
  const {
    networkName,
    disableManagedNetwork,
    networkConfig: networkUserConfig
  } = getTruffleDashboardUserConfig(config, userConfig);

  // Look for custom Truffle Dashboard configuration inside truffle-config.js
  // (if it exists)
  const { host, port } = detectDashboardSettings();

  // Generate URL and supply other plugin invariants
  // (e.g., accounts should always be "remote" for Truffle Dashboard)
  //
  // Note that if `disableManagedNetwork` is set to `true`, then the user's
  // custom Truffle Dashboard network configuration will be used here instead
  // of any plugin-supplied defaults or computed values.
  const networkConfig: HttpNetworkConfig = {
    url: `http://${host}:${port}/rpc`,
    accounts: "remote",
    ...networkUserConfig
  };

  // Capture completed configuration
  config.truffleDashboard = {
    networkName,
    disableManagedNetwork,
    networkConfig
  };

  // Add managed network unless disabled
  if (!disableManagedNetwork) {
    config.networks[networkName] = networkConfig;
  }
});

task("compile", "Compile with Truffle Dashboard support").setAction(
  async (taskArgs, env, runSuper) => {
    // Run Hardhat compilation
    const result = await runSuper();

    try {
      await FromHardhat.expectHardhat();

      // Extract Truffle Dashboard host and port from complete Hardhat config
      const { host, port } = new URL(
        env.config.truffleDashboard.networkConfig.url
      );

      console.log("Preparing Truffle compilation");

      // Prepare Truffle compilations
      let compilations = await FromHardhat.prepareCompilations();

      // Create Message Bus client
      let messageBusClient = new DashboardMessageBusClient({
        host,
        port: parseInt(port)
      });

      console.log("Sending Truffle compilation to dashboard");

      // Send Truffle compilations to dashboard
      const publishLifecycle = await messageBusClient.publish({
        type: "cli-event",
        payload: {
          label: "workflow-compile-result",
          data: { compilations }
        }
      });
      publishLifecycle.abandon();

      console.log("Compilation successfully sent!");
    } catch (hardhatError) {
      console.warn(
        "The Truffle Dashboard plugin failed to compile: ",
        hardhatError
      );
    }

    return result;
  }
);

function detectDashboardSettings() {
  let truffleConfig;
  try {
    truffleConfig = TruffleConfig.detect();
  } catch {
    truffleConfig = {
      dashboard: {}
    };
  }

  const { host = defaults.host, port = defaults.port } =
    truffleConfig.dashboard;

  return {
    host,
    port
  };
}

function getTruffleDashboardUserConfig(
  config: HardhatConfig,
  userConfig: HardhatUserConfig
) {
  const {
    networkName = defaults.networkName,
    disableManagedNetwork = defaults.disableManagedNetwork,
    networkConfig: networkUserConfig = {}
  } = userConfig.truffleDashboard || {};

  const networkIsDefinedExplicitly =
    userConfig.networks && networkName in userConfig.networks;

  if (!disableManagedNetwork && networkIsDefinedExplicitly) {
    throw new HardhatPluginError(
      pluginName,
      `Duplicate network config.\n\n` +
        `This plugin is configured to manage the Truffle Dashboard network\n` +
        `inside \`config.networks["${networkName}"]\`, but a conflicting user\n` +
        `configuration was found.\n\n` +
        `Remove this network or set \`config.truffleDashboard.disableManagedNetwork\`\n` +
        `to \`true\` if you'd like to configure the Truffle Dashboard network yourself.`
    );
  }

  if (disableManagedNetwork && !networkIsDefinedExplicitly) {
    throw new HardhatPluginError(
      pluginName,
      `Missing network config.\n\n` +
        `This plugin is configured to require a Truffle Dashboard network\n` +
        `inside \`config.networks["${networkName}"]\`, but no such network was found.\n\n` +
        `Please define this network or set \`config.truffleDashboard.disableManagedNetwork\`\n` +
        `to \`false\` if you'd like this plugin to manage the network for you.\n\n` +
        `If you configured the Truffle Dashboard network with a different name,\n` +
        `then please specify \`config.truffleDashboard.networkName\` to match.`
    );
  }

  const {
    gas = defaults.gas,
    gasPrice = defaults.gasPrice,
    gasMultiplier = defaults.gasMultiplier,
    timeout = defaults.timeout,
    httpHeaders = defaults.httpHeaders
  } = networkUserConfig;

  // Populate config from either config.networks[networkName] or
  // config.truffleDashboard.networkConfig based on whether this plugin is set
  // to manage the network itself.
  //
  // (The above checks guarantee the presence of config.networks[networkName]
  // if and only if disableManagedNetwork is true)
  const networkConfig: Pick<
    HttpNetworkConfig,
    TruffleDashboardNetworkConfigurableKeys
  > = disableManagedNetwork
    ? (config.networks[networkName] as HttpNetworkConfig)
    : { gas, gasPrice, gasMultiplier, timeout, httpHeaders };

  return {
    networkName,
    disableManagedNetwork,
    networkConfig
  };
}
