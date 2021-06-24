import express from "express";
import path from "path";
import getPort from "get-port";
import { BrowserProviderServer } from "@truffle/browser-provider-server";
import { spawn } from "child_process";

// TODO: Lifecycle management for dashboard
export const startDashboard = async (dashboardPort: number) => {
  const app = express();

  app.use(express.static(path.join(__dirname, '..')));

  const dashboardToBrowserProviderPort = await getPort();
  const browserProviderToServerPort = await getPort();

  new BrowserProviderServer().start(browserProviderToServerPort, dashboardToBrowserProviderPort);

  app.get('/ports', (req, res) => {
    res.json({
      dashboardPort,
      dashboardToBrowserProviderPort,
      browserProviderToServerPort,
    });
  });

  app.listen(dashboardPort, () => {
    console.log(`@truffle/dashboard started on port ${dashboardPort}`);
  });

  return app;
};

export const startDashboardInBackground = (port: number) => {
  const dashboardPath = `${__dirname}/start-dashboard`;

  return spawn("node", [dashboardPath, String(port)], {
    detached: true,
    stdio: "ignore"
  });
};
