import Config from "@truffle/config";

export type NetworkUrl = [networkName: string, url: string];

export const networkUrlsQuery = `Object.entries(hre.config.networks)
      .flatMap(
        ([networkName, networkConfig]) =>
          (networkName === "hardhat") || !(networkConfig && "url" in networkConfig)
            ? []
            : [[networkName, networkConfig.url]]
      )
    `;

export const fromNetworkUrls = (networkUrls: NetworkUrl[]): Config => {
  return Config.default().merge({
    networks: Networks.fromNetworkUrls(networkUrls)
  });
};

namespace Networks {
  export const fromNetworkUrls = (networkUrls: NetworkUrl[]) =>
    networkUrls.reduce(
      (networks, [networkName, url]) => ({
        ...networks,
        [networkName]: {
          url,
          network_id: "*"
        }
      }),
      {}
    );
}
