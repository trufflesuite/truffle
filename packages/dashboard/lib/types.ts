export interface DashboardServerOptions {
  /** Port of the dashboard */
  port: number;

  /** Host of the dashboard (default: localhost) */
  host?: string;

  /** Boolean indicating whether the POST /rpc endpoint should be exposed (default: true) */
  rpc?: boolean;

  /** Boolean indicating whether debug output should be logged (default: false) */
  verbose?: boolean;

  /** Boolean indicating whether whether starting the DashboardServer should automatically open the dashboard (default: true) */
  autoOpen?: boolean;
}
