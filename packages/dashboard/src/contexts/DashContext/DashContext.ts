import { createContext } from "react";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import type { State, Action } from "src/contexts/DashContext";

export interface ContextValue {
  state: State;
  operations: {
    userConfirmMessage: (
      lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>
    ) => Promise<any>;
    userRejectMessage: (
      lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>
    ) => any;
    addSimulation: () => void;
    simulateTransaction: (
      providerMessageId: number,
      simulationId: number
    ) => Promise<void>;
    toggleNotice: () => void;
  };
  dispatch?: React.Dispatch<Action>;
}

const DashContext = createContext<ContextValue | null>(null);

export default DashContext;
