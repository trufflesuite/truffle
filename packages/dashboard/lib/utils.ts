import { jsonToBase64 } from "@truffle/dashboard-message-bus-common";
import { spawn } from "child_process";
import type { DashboardServerOptions } from "./DashboardServer";
import { promises as dns } from "dns";
import { networkInterfaces } from "os";
import path from "path";
import TruffleError from "@truffle/error";

export const startDashboardInBackground = (options: DashboardServerOptions) => {
  const dashboardPath = path.join(__dirname, "..", "bin", "start-dashboard");

  const optionsBase64 = jsonToBase64(options);

  const child = spawn("node", [dashboardPath, optionsBase64], {
    detached: true,
    stdio: "ignore"
  });

  return child;
};

/**
 * @returns an array of all IP addresses for all local interfaces on the host machine
 */
const getLocalInterfaceAddresses = () => {
  const interfaces = networkInterfaces();
  return Object.keys(interfaces).flatMap(name =>
    interfaces[name].map(iface => iface.address)
  );
};

/**
 * Gets the IP addresses (both IPv4 and IPv6) for a given local hostname
 *
 * @param hostname The local hostname to resolve
 * @returns An array of IP addresses.
 * @throws {@link TruffleError} on name resolution failure and when
 * hostname cannot be matched to a local network interface
 */
export const resolveBindHostnameToAllIps = async (hostname: string) => {
  const interfaces = getLocalInterfaceAddresses();

  // otherwise resolve the hostname to an IP address and check that it's local
  try {
    const results = (await dns.lookup(hostname, { all: true }))
      .map(result => result.address)
      .filter(address => interfaces.includes(address));

    if (results.length === 0) {
      throw new TruffleError(
        `Could not listen on hostname ${hostname}: does not resolve to any local IP addresses.` +
          ` Name must map to one of the following local addresses: ${interfaces.join(
            ", "
          )}`
      );
    }

    return results;
  } catch (err) {
    throw new TruffleError(
      `Could not listen on hostname ${hostname}: name resolution failure.`
    );
  }
};
