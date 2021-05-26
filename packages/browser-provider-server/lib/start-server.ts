import { BrowserProviderServer } from "./BrowserProviderServer";

const [providerPort, frontendPort] = process.argv.slice(2);
const server = new BrowserProviderServer();
server.start(Number(providerPort), Number(frontendPort));
