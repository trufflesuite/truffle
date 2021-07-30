import express from "express";
import path from "path";
import getPort from "get-port";
import { DashboardMessageBus } from "@truffle/dashboard-message-bus";
import { spawn } from "child_process";
import cors from 'cors';

export const startDashboard = async (dashboardPort: number) => {
  const app = express();

  app.use(cors());
  app.use(express.static(path.join(__dirname, '..')));

  const messageBusListenPort = await getPort();
  const messageBusRequestsPort = await getPort();

  new DashboardMessageBus().start(messageBusRequestsPort, messageBusListenPort);

  app.get('/ports', (req, res) => {
    res.json({
      dashboardPort,
      messageBusListenPort,
      messageBusRequestsPort,
    });
  });

  app.listen(dashboardPort, () => {
    console.log(`@truffle/dashboard started on port ${dashboardPort}`);
  });

  return app;
};

export const startDashboardInBackground = (port: number) => {
  const dashboardPath = `${__dirname}/start-dashboard`;

  const child = spawn("node", [dashboardPath, String(port)], {
    detached: true,
    stdio: "ignore"
  });

  return child;
};
