import type { HardhatConfig } from "hardhat/types";

import Config from "@truffle/config";

export const fromHardhatConfig = (hardhatConfig: HardhatConfig): Config => {
  return Config.default().merge({
    networks: Networks.fromHardhatConfig(hardhatConfig)
  });
};

namespace Networks {
  export const fromHardhatConfig = (hardhatConfig: HardhatConfig) =>
    Object.entries(hardhatConfig.networks)
      .flatMap(([networkName, networkConfig]) => {
        // exclude hardhat network as not supported
        if (networkName === "hardhat") {
          return [];
        }

        // only accept netowrks that specify `url`
        if (!networkConfig || !("url" in networkConfig)) {
          return [];
        }

        const { url } = networkConfig;
        return [
          {
            [networkName]: {
              url,
              network_id: "*"
            }
          }
        ];
      })
      .reduce((a, b) => ({ ...a, ...b }), {});
}
