import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type { Message } from "@truffle/dashboard-message-bus-common";
import type { State } from "src/contexts/DashContext/types";
import type { Source, Session } from "src/utils/debugger";

export type ActionType =
  | "set-decoder"
  | "set-chain-info"
  | "set-notice"
  | "set-analytics-config"
  | "handle-message"
  | "update-provider-message-sender"
  | "set-debugger-session-data"
  | "toggle-debugger-breakpoint";

export type SetDebuggerSessionDataArgs = {
  sources: Source[];
  session: Session;
};

export type ToggleDebuggerBreakpointArgs = {
  line: number;
  sourceId: string;
};

export interface BaseAction {
  type: ActionType;
}

export interface SetDecoderAction extends BaseAction {
  type: "set-decoder";
  data: Pick<
    State,
    "decoder" | "decoderCompilations" | "decoderCompilationHashes"
  >;
}

export interface SetDebuggerSessionDataAction extends BaseAction {
  type: "set-debugger-session-data";
  data: SetDebuggerSessionDataArgs;
}

export interface SetChainInfoAction extends BaseAction {
  type: "set-chain-info";
  data: State["chainInfo"];
}

export interface SetNoticeAction extends BaseAction {
  type: "set-notice";
  data: Partial<State["notice"]>;
}

export interface SetAnalyticsConfigAction extends BaseAction {
  type: "set-analytics-config";
  data: State["analyticsConfig"];
}

export interface HandleMessageAction extends BaseAction {
  type: "handle-message";
  data: ReceivedMessageLifecycle<Message>;
}

export interface UpdateProviderMessageSenderAction extends BaseAction {
  type: "update-provider-message-sender";
  data: string;
}

export interface ToggleDebuggerBreakpointAction extends BaseAction {
  type: "toggle-debugger-breakpoint";
  data: {
    line: number;
    sourceId: string;
  };
}

export type Action =
  | SetDecoderAction
  | SetChainInfoAction
  | SetNoticeAction
  | SetAnalyticsConfigAction
  | HandleMessageAction
  | UpdateProviderMessageSenderAction
  | SetDebuggerSessionDataAction
  | ToggleDebuggerBreakpointAction;
