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
  networkName: "truffleDashboard",
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
    dashboardNetworkName,
    dashboardNetworkConfig: dashboardNetworkUserConfig
  } = getTruffleDashboardUserConfig(config, userConfig);

  // Look for custom Truffle Dashboard configuration inside truffle-config.js
  // (if it exists)
  const { host, port } = detectDashboardSettings();

  // Generate URL and supply other plugin invariants
  // (e.g., accounts should always be "remote" for Truffle Dashboard)
  const dashboardNetworkConfig: HttpNetworkConfig = {
    url: `http://${host}:${port}/rpc`,
    accounts: "remote",
    ...dashboardNetworkUserConfig
  };

  // Capture completed configuration
  config.truffle = {
    dashboardNetworkName,
    dashboardNetworkConfig
  };

  // Add managed network
  config.networks[dashboardNetworkName] = dashboardNetworkConfig;
});

task("compile", "Compile with Truffle Dashboard support").setAction(
  async (taskArgs, env, runSuper) => {
    // Run Hardhat compilation
    const result = await runSuper();

    try {
      await FromHardhat.expectHardhat();

      // Extract Truffle Dashboard host and port from complete Hardhat config
      const { hostname: host, port } = new URL(
        env.config.truffle.dashboardNetworkConfig.url
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
    dashboardNetworkName = defaults.networkName,
    dashboardNetworkConfig: dashboardNetworkUserConfig = {}
  } = userConfig.truffle || {};

  const {
    gas = defaults.gas,
    gasPrice = defaults.gasPrice,
    gasMultiplier = defaults.gasMultiplier,
    timeout = defaults.timeout,
    httpHeaders = defaults.httpHeaders
  } = dashboardNetworkUserConfig;

  const dashboardNetworkConfig: Pick<
    HttpNetworkConfig,
    TruffleDashboardNetworkConfigurableKeys
  > = {
    gas,
    gasPrice,
    gasMultiplier,
    timeout,
    httpHeaders
  };

  const networkIsDefinedExplicitly =
    userConfig.networks && dashboardNetworkName in userConfig.networks;

  if (networkIsDefinedExplicitly) {
    throw new HardhatPluginError(
      pluginName,
      `Manual network config disallowed.\n\n` +
        `This plugin manages your Truffle Dashboard network config for you,\n` +
        `but your Hardhat config also contains \`config.networks["${dashboardNetworkName}"]\`.\n\n` +
        `You can fix this error by removing \`config.networks["${dashboardNetworkName}"]\`.\n\n` +
        `Please see the README for more details about how to configure this plugin:\n` +
        `  https://www.npmjs.com/package/@truffle/dashboard-hardhat-plugin`
    );
  }

  return {
    dashboardNetworkName,
    dashboardNetworkConfig
  };
}
