import { base64ToJson } from "@truffle/dashboard-message-bus-common";
import { DashboardServer } from "../lib/DashboardServer";

//TODO: remove all the base64 strangeness
const [optionsBase64] = process.argv.slice(2);
const options = base64ToJson(optionsBase64);
const dashboardServer = new DashboardServer(options);
dashboardServer.start();
