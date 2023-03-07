import { createContext } from "react";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import type { State, Action } from "src/contexts/DashContext";
import type {
  SetDebuggerSessionDataArgs,
  ToggleDebuggerBreakpointArgs
} from "src/contexts/DashContext/types";
import type { Compilation } from "@truffle/compile-common";

export interface ContextValue {
  state: State;
  operations: {
    userConfirmMessage: (
      lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>
    ) => Promise<any>;
    userRejectMessage: (
      lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>
    ) => any;
    toggleNotice: () => void;
    updateAnalyticsConfig: (value: boolean) => void;
    setDebuggerSessionData: (value: SetDebuggerSessionDataArgs) => void;
    getCompilations: () => Promise<Compilation[]>;
    toggleDebuggerBreakpoint: (value: ToggleDebuggerBreakpointArgs) => void;
  };
  dispatch?: React.Dispatch<Action>;
}

const DashContext = createContext<ContextValue | null>(null);

export default DashContext;
