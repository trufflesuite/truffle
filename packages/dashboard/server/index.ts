import express from "express";
import path from "path";
import getPort from "get-port";
import { DashboardMessageBus } from "@truffle/dashboard-message-bus";
import { spawn } from "child_process";
import cors from 'cors';

export const startDashboard = async (dashboardPort: number, dashboardHost: string) => {
  const app = express();

  app.use(cors());
  app.use(express.static(path.join(__dirname, '..')));

  const messageBusListenPort = await getPort({ host: dashboardHost });
  const messageBusRequestsPort = await getPort({ host: dashboardHost });

  const messageBus = new DashboardMessageBus();
  messageBus.start(messageBusRequestsPort, messageBusListenPort, dashboardHost);
  messageBus.on("terminate", () => process.exit(0));

  app.get('/ports', (req, res) => {
    res.json({
      dashboardPort,
      messageBusListenPort,
      messageBusRequestsPort,
    });
  });

  app.listen(dashboardPort, dashboardHost, () => {
    console.log(`@truffle/dashboard started at ${dashboardHost}:${dashboardPort}`);
  });

  return app;
};

export const startDashboardInBackground = (port: number, host: string) => {
  const dashboardPath = `${__dirname}/start-dashboard`;

  const child = spawn("node", [dashboardPath, String(port), host], {
    detached: true,
    stdio: "ignore"
  });

  return child;
};
