import { expectAssignable } from "tsd";

import * as t from "io-ts";

import { DualConfig, IpfsNetwork, EthereumNetwork } from "test/networks";

declare const example: DualConfig;

const {
  networks: { ipfs, ethereum },
  environments
} = example;

expectAssignable<IpfsNetwork[]>(Object.values(ipfs));
expectAssignable<EthereumNetwork[]>(Object.values(ethereum));

type Environment = DualConfig["environments"][string];

for (const environment of Object.values(environments) as Environment[]) {
  {
    const {
      ipfs: { network }
    } = environment;

    const reference = t.type({
      name: t.string
    });

    if (!reference.is(network)) {
      expectAssignable<IpfsNetwork>(network);
    }
  }
}
