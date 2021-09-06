import { startDashboard } from ".";

const [dashboardPort, dashboardHost] = process.argv.slice(2);
startDashboard(Number(dashboardPort), dashboardHost);
