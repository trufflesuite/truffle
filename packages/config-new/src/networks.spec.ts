// import * as t from "io-ts";
// import { isRight } from "fp-ts/lib/Either";
import { PathReporter } from "io-ts/PathReporter";

// import { DualConfig, IpfsNetwork, EthereumNetwork } from "test/networks";
import { ethereumConfig } from "test/networks";

describe("Network configuration", () => {
  it("decodes blank config", () => {
    const result = ethereumConfig.decode({
      networks: {
        ethereum: {}
      },
      environments: {}
    });

    console.log(PathReporter.report(result));
  });
});
