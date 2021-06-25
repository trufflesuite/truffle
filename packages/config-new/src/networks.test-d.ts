import { expectAssignable } from "tsd";

import * as t from "io-ts";

import { DualConfig, IpfsNetwork, EthereumNetwork } from "test/networks";

declare const example: DualConfig;

const { networks: { ipfs, ethereum } = {}, environments = {} } = example;

expectAssignable<IpfsNetwork[]>(Object.values(ipfs || {}));
expectAssignable<EthereumNetwork[]>(Object.values(ethereum || {}));

type Environment = Exclude<DualConfig["environments"], undefined>[string];

for (const { ipfs, ethereum } of Object.values(environments) as Environment[]) {
  if (ipfs) {
    const { network } = ipfs;

    const reference = t.type({
      name: t.string
    });

    if (!reference.is(network)) {
      expectAssignable<IpfsNetwork>(network);
    }
  }

  if (ethereum) {
    const { network } = ethereum;

    const reference = t.type({
      name: t.string
    });

    if (!reference.is(network)) {
      expectAssignable<EthereumNetwork>(network);
    }
  }
}
