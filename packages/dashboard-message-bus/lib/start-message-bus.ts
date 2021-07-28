import { DashboardMessageBus } from "./DashboardMessageBus";

const [clientPort, dashboardPort] = process.argv.slice(2);
const server = new DashboardMessageBus();
server.start(Number(clientPort), Number(dashboardPort));
