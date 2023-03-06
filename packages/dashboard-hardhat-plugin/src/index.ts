import { task } from "hardhat/config";
import { ActionType } from "hardhat/types";

const FromHardhat = require("@truffle/from-hardhat");

const {
  DashboardMessageBusClient
} = require("@truffle/dashboard-message-bus-client");

interface CompilationArgs {}

const processCompilation: ActionType<CompilationArgs> = async (
  taskArgs,
  env,
  runSuper
) => {
  // Run Hardhat compilation
  const result = await runSuper();

  try {
    await FromHardhat.expectHardhat();

    const dashboardConfig = {
      host: "localhost",
      port: 24012
    };

    console.log("Preparing Truffle compilation");

    // Prepare Truffle compilations
    let compilations = await FromHardhat.prepareCompilations();

    // Create Message Bus client
    let messageBusClient = new DashboardMessageBusClient(dashboardConfig);

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
};

task("compile", "Compile with Truffle Dashboard support").setAction(
  processCompilation
);
