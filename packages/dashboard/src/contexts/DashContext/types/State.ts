import type { providers } from "ethers";
import type {
  DashboardMessageBusClient,
  ReceivedMessageLifecycle
} from "@truffle/dashboard-message-bus-client";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import type { NoticeContent } from "src/components/composed/Notice/content/types";

export interface State {
  busClient: DashboardMessageBusClient;
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
