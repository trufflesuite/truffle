import type { IDBPDatabase } from "idb/with-async-ittr";
import type { Provider } from "ganache";
import type { ProjectDecoder } from "@truffle/decoder";
import type {
  DashboardMessageBusClient,
  ReceivedMessageLifecycle
} from "@truffle/dashboard-message-bus-client";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import type { Schema } from "src/contexts/DashContext";
import type { NoticeContent } from "src/components/composed/Notice/content/types";

export interface State {
  busClient: DashboardMessageBusClient;
  dbPromise: Promise<IDBPDatabase<Schema>>;
  decoder: ProjectDecoder | null;
  decoderCompilations: Array<Schema["Compilation"]["value"]["data"]> | null;
  decoderCompilationHashes: Set<
    Schema["Compilation"]["value"]["dataHash"]
  > | null;
  providerMessages: Map<
    number,
    ReceivedMessageLifecycle<DashboardProviderMessage>
  >;
  simulations: Map<number, { provider: Provider; label: string }>;
  simulationNonce: number;
  chainInfo: {
    id: number | null;
    name: string | null;
  };
  notice: {
    show: boolean;
    type: NoticeContent | null;
  };
}
