import type { IDBPDatabase } from "idb/with-async-ittr";
import type { ProjectDecoder } from "@truffle/decoder";
import type {
  DashboardMessageBusClient,
  ReceivedMessageLifecycle
} from "@truffle/dashboard-message-bus-client";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import type { Schema } from "src/contexts/DashContext";
import type { NoticeContent } from "src/components/composed/Notice/content/types";
import type { Source, Session } from "src/utils/debugger";

type BreakpointState = {
  [sourceId: string]: Set<number>;
};

export interface State {
  busClient: DashboardMessageBusClient;
  dbPromise: Promise<IDBPDatabase<Schema>>;
  debugger: {
    sources: Source[] | null;
    session: Session | null;
    breakpoints: BreakpointState;
    txToRun: ReceivedMessageLifecycle<DashboardProviderMessage> | null;
  };
  decoder: ProjectDecoder | null;
  decoderCompilations: Array<Schema["Compilation"]["value"]["data"]> | null;
  decoderCompilationHashes: Set<
    Schema["Compilation"]["value"]["dataHash"]
  > | null;
  providerMessages: Map<
    number,
    ReceivedMessageLifecycle<DashboardProviderMessage>
  >;
  chainInfo: {
    id: number | null;
    name: string | null;
  };
  notice: {
    show: boolean;
    type: NoticeContent | null;
  };
  analyticsConfig: {
    enableAnalytics: boolean | null;
    analyticsSet: boolean | null;
    analyticsMessageDateTime: number | null;
  };
}
