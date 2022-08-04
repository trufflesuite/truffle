import type {
  Block,
  HexString,
  Web3BaseProvider as Provider,
  Web3ProviderRequestCallback as Callback
} from "web3-types";
import type { parsedUriObject } from "typings";

type BlockChainType = {
  getBlockByNumber(
    blockNumber: string,
    provider: Provider,
    callback: Callback<Block>
  ): void;
  getBlockByHash(
    blockHash: string,
    provider: Provider,
    callback: Callback<Block>
  ): void;
  parse(uri: string): parsedUriObject;
  asURI(provider: Provider): Promise<unknown>;
  matches(uri: string, provider: Provider): Promise<unknown>;
};

const Blockchain: BlockChainType = {
  getBlockByNumber(
    blockNumber: string,
    provider: Provider,
    callback: Callback<Block>
  ) {
    const params: [string, boolean] = [blockNumber, true];
    provider.send(
      {
        jsonrpc: "2.0",
        method: "eth_getBlockByNumber",
        params,
        id: Date.now()
      },
      callback
    );
  },

  getBlockByHash(
    blockHash: string,
    provider: Provider,
    callback: Callback<Block>
  ) {
    const params: [string, boolean] = [blockHash, true];
    provider.send(
      {
        jsonrpc: "2.0",
        method: "eth_getBlockByHash",
        params,
        id: Date.now()
      },
      callback
    );
  },

  parse(uri: string) {
    const parsed: parsedUriObject = {};
    if (uri.indexOf("blockchain://") !== 0) return parsed;

    const cleanUri = uri.replace("blockchain://", "");

    const pieces = cleanUri.split("/block/");

    parsed.genesis_hash = `0x${pieces[0]}`;
    parsed.block_hash = `0x${pieces[1]}`;

    return parsed;
  },

  asURI(this: BlockChainType, provider: Provider) {
    return new Promise((resolve, reject) => {
      let genesis: any, latest;

      this.getBlockByNumber("0x0", provider, (err: Error, { result }) => {
        if (err) return reject(err);
        genesis = result;

        this.getBlockByNumber("latest", provider, (err: Error, { result }) => {
          if (err) return reject(err);
          latest = result;
          const url = `blockchain://${genesis.hash.replace("0x", "")}/block/${(
            latest.hash as HexString
          ).replace("0x", "")}`;
          resolve(url);
        });
      });
    });
  },

  matches(this: BlockChainType, uri: string, provider: Provider) {
    return new Promise((resolve, reject) => {
      const parsedUri = this.parse(uri);

      const expectedGenesis = parsedUri.genesis_hash;
      const expectedBlock = parsedUri.block_hash;

      this.getBlockByNumber("0x0", provider, (err: Error, { result }) => {
        if (err) return reject(err);
        const block = result;
        if (block.hash !== expectedGenesis) return resolve(false);

        this.getBlockByHash(
          expectedBlock,
          provider,
          (err: Error, { result }) => {
            // Treat an error as if the block didn't exist. This is because
            // some clients respond differently.
            const block = result;
            if (err || block == null) {
              return resolve(false);
            }

            resolve(true);
          }
        );
      });
    });
  }
};

export = Blockchain;
