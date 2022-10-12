import { DashboardServer } from "../lib/DashboardServer";

const options = {
  port: 24012,
  host: "localhost",
  verbose: true,
  rpc: true,
  autoOpen: false
};
const dashboardServer = new DashboardServer(options);

async function startServer() {
  await dashboardServer.start();
}

startServer();
