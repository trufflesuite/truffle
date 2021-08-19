import axios from "axios";
import delay from "delay";

export const getMessageBusPorts = async (dashboardPort: number, retries = 5, tryCount = 1) => {
  try {
    const { data } = await axios.get(`http://localhost:${dashboardPort}/ports`);
    return data;
  } catch {
    if (tryCount === retries) {
      throw new Error(`Could not start or connect to dashboard at ${dashboardPort}`);
    }
    await delay(1000);
    return await getMessageBusPorts(dashboardPort, retries, tryCount + 1);
  }
};
