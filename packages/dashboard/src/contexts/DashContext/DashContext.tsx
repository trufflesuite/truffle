import { createContext } from "react";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import type { State, Action } from "src/contexts/DashContext";

export interface ContextValue {
  state: State;
  dispatch?: React.Dispatch<Action>;
  ops: {
    userConfirmMessage: (
      lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>
    ) => Promise<any>;
    userRejectMessage: (
      lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>
    ) => any;
    toggleNotice: () => void;
  };
}

const DashContext = createContext<ContextValue | null>(null);

export default DashContext;
