import axios from "axios";
import delay from "delay";

export const getMessageBusPort = async (dashboardPort: number, retries = 5, tryCount = 1) => {
  try {
    const { data } = await axios.get(`http://localhost:${dashboardPort}/ports`);
    return data.messageBusRequestsPort;
  } catch {
    if (tryCount === retries) {
      throw new Error(`Could not start or connect to dashboard at ${dashboardPort}`);
    }
    await delay(1000);
    return await getMessageBusPort(dashboardPort, retries, tryCount + 1);
  }
};
