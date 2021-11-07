export interface BrowserProviderOptions {
  /** Host of the Dashboard (default: localhost) */
  dashboardHost?: string;

  /** Port of the Dashboard (default: 5000) */
  dashboardPort?: number;

  /** Number of seconds before a browser-provider request times out (default: 120) */
  timeoutSeconds?: number;

  /** Boolean indicating whether the connection to the dashboard is kept alive between requests (default: false) */
  keepAlive?: boolean;

  /** Boolean indicating whether debug output should be logged (default: false) */
  verbose?: boolean;

  /** Boolean indicating whether the dashboard should automatically get opened in the default browser (default: true) */
  autoOpen?: boolean;
}
