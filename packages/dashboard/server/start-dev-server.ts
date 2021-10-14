import DashboardServer from "./DashboardServer";

const options = {
  port: 5000,
  host: "localhost",
  verbose: true,
  rpc: true,
};

const dashboardServer = new DashboardServer(options);
dashboardServer.start();
