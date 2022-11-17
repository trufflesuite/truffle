import type { IDBPDatabase } from "idb";
import type { providers } from "ethers";
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
  provider: providers.Web3Provider;
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
}
