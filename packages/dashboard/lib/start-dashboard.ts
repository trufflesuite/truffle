import { base64ToJson } from "@truffle/dashboard-message-bus";
import DashboardServer from "./DashboardServer";

const [optionsBase64] = process.argv.slice(2);
const options = base64ToJson(optionsBase64);
const dashboardServer = new DashboardServer(options);
dashboardServer.start();
