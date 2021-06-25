import * as t from "io-ts";
import * as x from "io-ts-extra";

export const networksConfig = <
  NetworkKind extends string,
  Network extends unknown
>(options: {
  networkKind: NetworkKind;
  network: t.Type<Network>;
}) => {
  const { networkKind, network } = options;

  const networkName = t.string;

  type NetworkKindNetworks = t.RecordC<t.StringC, t.Type<Network>>;
  type Networks = {
    [K in NetworkKind]: NetworkKindNetworks;
  };

  return t.type({
    networks: t.type({
      [networkKind]: t.record(networkName, network)
    } as Networks)
  });
};

export const environmentsConfig = <
  NetworkKind extends string,
  Network extends unknown,
  Environment extends unknown,
  NetworkName extends string
>(options: {
  networkKind: NetworkKind;
  network: t.Type<Network>;
  environment?: t.Type<Environment>;
  networkName?: t.Type<NetworkName>;
}) => {
  const {
    networkKind,
    network,
    environment = t.unknown,
    networkName
  } = options;

  const environmentName = t.string;

  const environmentNetworkKind = t.type({
    network: networkName
      ? t.union([
          t.type({
            name: networkName
          }),
          network
        ])
      : network
  });

  return t.type({
    environments: t.record(
      environmentName,
      t.intersection([
        environment,
        t.type({
          [networkKind]: environmentNetworkKind
        } as { [K in NetworkKind]: typeof environmentNetworkKind })
      ])
    )
  });
};

export const config = <
  NetworkKind extends string,
  Network extends unknown,
  Environment extends unknown,
  NetworkName extends string
>(options: {
  networkKind: NetworkKind;
  network: t.Type<Network>;
  environment?: t.Type<Environment>;
  networkName?: t.Type<NetworkName>;
}) => {
  const { networkKind } = options;

  const config = t.intersection([
    networksConfig(options),

    // first allow any network name
    environmentsConfig({
      ...options,
      networkName: t.string
    })
  ]);

  return x.narrow(config, ({ networks: { [networkKind]: networks } }) => {
    const networkNames = Object.keys(networks);
    const networkName =
      networkNames.length === 0
        ? undefined
        : networkNames.length === 1
        ? // @ts-ignore since this will always exist
          (t.literal(networkNames[0]) as t.LiteralC<string>)
        : // @ts-ignore to ignore io-ts's confusion here
          t.union(networkNames.map(t.literal) as t.LiteralC<string>[]);

    return networkName
      ? environmentsConfig({
          ...options,
          networkName
        })
      : environmentsConfig(options);
  });

  // return t.brand(
  //   config,
  //   (config: Config): config is t.Branded<Config,ConsistentlyReferencedBrand<NetworkKind>>  => {
  //     const {
  //       networks: {
  //         [networkKind]: networks = {}
  //       },
  //       environments
  //     } = config;

  //     const definedNetworkNames = new Set(Object.keys(networks));

  //     return Object.values(environments)
  //       .filter(
  //         (environment): environment is {
  //           [K in NetworkKind]: {
  //             network: { name: string }
  //           }
  //         } => (
  //           networkKind in environment &&
  //           "network" in (environment[networkKind] || {})
  //         )
  //       )
  //       .every(
  //         ({
  //           [networkKind]: {
  //             network: { name }
  //           }
  //         }) => definedNetworkNames.has(name)
  //       );
  //   },
  //   `ConsistentlyReferenced<${networkKind}>` as const
  // );
};
