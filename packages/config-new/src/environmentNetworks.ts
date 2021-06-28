import * as t from "io-ts";
import * as x from "io-ts-extra";

import * as Networks from "./networks";
import * as Environments from "./environments";

export type NetworkEnvironment<
  FieldName extends string,
  Network extends unknown,
  NetworkName extends string | undefined
> = {
  [K in FieldName]?: {
    network: NetworkName extends string
      ? Network | { name: NetworkName }
      : Network
  }
};

export const networkEnvironment = <
  FieldName extends string,
  Network extends unknown,
  NetworkName extends string | undefined
>(options: {
  fieldName: FieldName;
  network: t.Type<Network>;
  networkNames?: Exclude<NetworkName, undefined>[];
}): t.Type<NetworkEnvironment<FieldName, Network, NetworkName>> => {
  const {
    fieldName,
    network,
    networkNames
  } = options;

  const allowedNetworks: [t.Mixed, ...t.Mixed[]] = Array.isArray(networkNames)
    ? [
        network,
        ...networkNames.map(
          networkName => x.strict({ name: t.literal(networkName) })
        )
      ]
    : [network, x.strict({ name: t.string })];

  const networkCodec = allowedNetworks.length === 1
    ? allowedNetworks[0]
    : t.union(allowedNetworks as [t.Mixed, t.Mixed, ...t.Mixed[]]);

  const codec = t.partial({
    [fieldName]: t.type({
      network: networkCodec
    })
  }) as t.Type<NetworkEnvironment<FieldName, Network, NetworkName>>;

  return new t.Type(
    `NetworkEnvironment<{ ${fieldName}: ${network.name} }>`,
    codec.is,
    codec.validate,
    codec.encode
  );
};

export const config = <
  NetworkKind extends string,
  Network extends unknown,
  FieldName extends string
>(options: {
  networkKind: NetworkKind;
  network: t.Type<Network>;
  fieldName?: FieldName;
}) => {
  const {
    networkKind,
    network,
    fieldName = networkKind
  } = options;

  const networks = Networks.config(options);

  const environment = networkEnvironment({ fieldName, network });
  const environments = Environments.config({ environment });

  const rawCodec = t.intersection([
    networks,
    environments
  ]);

  const codec = x.narrow(
    rawCodec,
    config => {
      const { networks: { [networkKind]: networks = {} as any } = {} } = config;
      const networkNames = Object.keys(networks);

      const environment = networkEnvironment({
        fieldName,
        network,
        networkNames
      });

      return Environments.config({ environment });
    }
  );


  return new t.Type(
    `Config<${networks.name}, ${environments.name}>`,
    codec.is,
    codec.validate,
    codec.encode
  );
};
