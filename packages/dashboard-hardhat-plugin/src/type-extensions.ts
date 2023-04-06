import type { HttpNetworkConfig, HttpNetworkUserConfig } from "hardhat/types";
import "hardhat/types/config";
import "hardhat/types/runtime";

declare module "hardhat/types/config" {
  export type TruffleDashboardNetworkConfigurableKeys = Exclude<
    keyof HttpNetworkUserConfig,
    "chainId" | "from" | "url" | "accounts"
  >;

  export interface HardhatUserConfig {
    truffle?: {
      dashboardNetworkName?: string;
      dashboardNetworkConfig?: Pick<
        HttpNetworkUserConfig,
        TruffleDashboardNetworkConfigurableKeys
      >;
    };
  }

  export interface HardhatConfig {
    truffle: {
      dashboardNetworkName: string;
      dashboardNetworkConfig: HttpNetworkConfig;
    };
  }
}
