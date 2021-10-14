import { jsonToBase64 } from "@truffle/dashboard-message-bus";
import { spawn } from "child_process";
import { DashboardServerOptions } from "./types";

export const startDashboardInBackground = (options: DashboardServerOptions) => {
  const dashboardPath = `${__dirname}/start-dashboard`;

  const optionsBase64 = jsonToBase64(options);

  const child = spawn("node", [dashboardPath, optionsBase64], {
    detached: true,
    stdio: "ignore"
  });

  return child;
};
