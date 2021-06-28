import * as t from "io-ts";

export type Networks<
  NetworkKind extends string,
  Network extends unknown
> = {
  [K in NetworkKind]?: {
    [networkName: string]: Network
  }
};

export const networks = <
  NetworkKind extends string,
  Network extends unknown
>(options: {
  networkKind: NetworkKind;
  network: t.Type<Network>;
}): t.Type<Networks<NetworkKind, Network>> => {
  const { networkKind, network } = options;

  const networkName = t.string;

  const codec = t.partial({
    [networkKind]: t.record(
      networkName,
      new t.Type(
        `Network<${networkKind}>`,
        network.is,
        network.validate,
        network.encode
      )
    )
  });

  return new t.Type(
    `Networks<${networkKind}>`,
    codec.is,
    codec.validate,
    codec.encode
  );
};

export type Config<
  NetworkKind extends string,
  Network extends unknown
> = {
  networks?: Networks<NetworkKind, Network>
};

export const config = <
  NetworkKind extends string,
  Network extends unknown
>(options: {
  networkKind: NetworkKind;
  network: t.Type<Network>;
}): t.Type<Config<NetworkKind, Network>> => {
  const networksCodec = networks(options);

  const codec = t.partial({ networks: networksCodec });

  return new t.Type(
    `Config<${networksCodec.name}>`,
    codec.is,
    codec.validate,
    codec.encode
  );
};

// export type NetworkEnvironment<
//   NetworkKind extends string,
//   Network extends unknown,
//   NetworkName extends string | undefined
// > = {
//   [K in NetworkKind]?: {
//     network: NetworkName extends string
//       ? Network | { name: NetworkName }
//       : Network
//   }
// };

// export const networkEnvironment = <
//   NetworkKind extends string,
//   Network extends unknown,
//   NetworkName extends string | undefined
// >(options: {
//   networkKind: NetworkKind;
//   network: t.Type<Network>;
//   networkName?: t.Type<Exclude<NetworkName, undefined>>
// }): t.Type<NetworkEnvironment<NetworkKind, Network, NetworkName>> => {
//   const {
//     networkKind,
//     network,
//     networkName
//   } = options;

//   return t.partial({
//     [networkKind]: t.type({
//       network: networkName
//         ? t.union([network, t.type({ name: networkName })])
//         : network
//     })
//   }) as t.Type<NetworkEnvironment<NetworkKind, Network, NetworkName>>;
// };

// export type ConfigType<
//   NetworkKind extends string,
//   Network extends unknown,
//   NetworkName extends string | undefined
// > = t.Type<
//   {
//     networks?: {
//       [K in NetworkKind]?: {
//         [networkName: string]: Network;
//       };
//     };

//     environments?: {
//       [environmentName: string]: {
//         [K in NetworkKind]?: {
//           network:
//             | Network
//             | (NetworkName extends string ? { name: NetworkName } : never)
//         }
//       }
//     }
//   }
// >;

// export const config = <
//   NetworkKind extends string,
//   Network extends unknown,
//   Environment extends unknown,
//   NetworkName extends string | undefined
// >(options: {
//   networkKind: NetworkKind;
//   network: t.Type<Network>;
//   environment?: t.Type<Environment>;
//   networkName?: t.Type<NetworkName>;
// }): ConfigType<NetworkKind, Network, NetworkName> => {
//   const { network, networkKind } = options;

//   const configType: ConfigType<NetworkKind, Network, string> = t.partial({
//     networks: t.partial({
//       [networkKind]: networks(options),
//     }),

//     environments: t.record(
//       t.string,
//       networkEnvironment({
//         networkKind,
//         network,
//         networkName: t.string
//       })
//     )
//   });

//   const consistentConfig: ConfigType<NetworkKind, Network, string> = x.narrow(
//     configType,
//     config => {
//       const { networks: { [networkKind]: networks = {} as any } = {} } = config;
//       const networkNames = Object.keys(networks);
//       const networkName =
//         networkNames.length === 0
//           ? undefined
//           : networkNames.length === 1
//           ? // @ts-ignore since this will always exist
//             (t.literal(networkNames[0]) as t.LiteralC<string>)
//           : // @ts-ignore to ignore io-ts's confusion here
//             t.union(networkNames.map(t.literal) as t.LiteralC<string>[]);

//       return withMessage(
//         t.partial({
//           environments: t.record(
//             t.string,
//             networkEnvironment({
//               networkKind,
//               network,
//               ...(networkName ? { networkName } : {})
//             })
//           )
//         }),
//         () => "Invalid network reference"
//       );
//     }
//   );

//   return new t.Type(
//     `Config<${networkKind}>`,
//     consistentConfig.is,
//     consistentConfig.validate,
//     consistentConfig.encode
//   ) as ConfigType<NetworkKind, Network, NetworkName>;
// };
