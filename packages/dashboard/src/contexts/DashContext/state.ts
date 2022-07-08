import type { DashboardMessageBusClient } from "@truffle/dashboard-message-bus-client";

type actionType = { type: "set-client"; data: DashboardMessageBusClient };

type stateType = {
  host: string;
  port: number;
  client: DashboardMessageBusClient | null;
};

const initialState: stateType = {
  host: window.location.hostname,
  port:
    process.env.NODE_ENV === "development"
      ? 24012
      : Number(window.location.port),
  client: null
};

const reducer = (state: stateType, action: actionType): stateType => {
  const { type, data } = action;
  switch (type) {
    case "set-client":
      return { ...state, client: data };
    default:
      throw new Error("Undefined reducer action type");
  }
};

export { initialState, reducer };
