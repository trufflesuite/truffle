import DashboardServer from "./DashboardServer";

const options = {
  port: 5000,
  host: "localhost",
  verbose: true,
  rpc: true,
  autoOpen: false
};

const dashboardServer = new DashboardServer(options);
dashboardServer.start();
