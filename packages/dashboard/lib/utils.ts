import { jsonToBase64 } from "@truffle/dashboard-message-bus-common";
import { spawn } from "child_process";
import type { DashboardServerOptions } from "./DashboardServer";
import { isIP } from "net";
import { promises as dns } from "dns";
import { networkInterfaces } from "os";
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

const getLocalInterfaceAddresses = () => {
  return Object.keys(networkInterfaces()).flatMap(name =>
    networkInterfaces()[name].map(iface => iface.address)
  );
};

export const resolveBindHostnameToAllIps = async (hostname: string) => {
  if (isIP(hostname) !== 0) {
    return [hostname];
  }

  const interfaces = getLocalInterfaceAddresses();
  const results = await dns.lookup(hostname, { all: true });
  return results
    .map(result => result.address)
    .filter(address => interfaces.includes(address));
};
