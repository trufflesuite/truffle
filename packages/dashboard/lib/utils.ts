import { jsonToBase64 } from "@truffle/dashboard-message-bus-common";
import { spawn } from "child_process";
import type { DashboardServerOptions } from "./DashboardServer";
import path from "path";

export const startDashboardInBackground = (options: DashboardServerOptions) => {
  const dashboardPath = path.join(__dirname, "..", "bin", "start-dashboard");

  const optionsBase64 = jsonToBase64(options);

  const child = spawn("node", [dashboardPath, optionsBase64], {
    detached: true,
    stdio: "ignore"
  });

  return child;
};
