import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type { Message } from "@truffle/dashboard-message-bus-common";
import type { State } from "src/contexts/DashContext/types";

export type ActionType =
  | "set-decoder"
  | "set-chain-info"
  | "set-notice"
  | "add-simulation"
  | "delete-simulation"
  | "handle-message";

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

export interface SetChainInfoAction extends BaseAction {
  type: "set-chain-info";
  data: State["chainInfo"];
}

export interface SetNoticeAction extends BaseAction {
  type: "set-notice";
  data: Partial<State["notice"]>;
}

export interface AddSimulationAction extends BaseAction {
  type: "add-simulation";
  data: Partial<
    Pick<State["simulations"] extends Map<number, infer V> ? V : never, "label">
  >;
}

export interface DeleteSimulationAction extends BaseAction {
  type: "delete-simulation";
  data: number;
}

export interface HandleMessageAction extends BaseAction {
  type: "handle-message";
  data: ReceivedMessageLifecycle<Message>;
}

export type Action =
  | SetDecoderAction
  | SetChainInfoAction
  | SetNoticeAction
  | AddSimulationAction
  | DeleteSimulationAction
  | HandleMessageAction;
