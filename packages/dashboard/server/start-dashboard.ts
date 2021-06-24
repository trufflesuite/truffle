import { startDashboard } from ".";

const [dashboardPort] = process.argv.slice(2);
startDashboard(Number(dashboardPort));
