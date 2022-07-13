import { createContext } from "react";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import { stateType, actionType } from "src/contexts/DashContext";

type contextValue = {
  state: stateType;
  dispatch?: React.Dispatch<actionType>;
  ops: {
    userConfirmMessage: (
      lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>
    ) => Promise<any>;
    userRejectMessage: (
      lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>
    ) => any;
    toggleNotice: () => void;
  };
};

const DashContext = createContext<contextValue | null>(null);

export default DashContext;
