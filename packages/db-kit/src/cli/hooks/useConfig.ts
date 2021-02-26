import { useState, useEffect } from "react";
import TruffleConfig from "@truffle/config";
import { Environment } from "@truffle/environment";

import type { Resources } from "@truffle/db";

export interface UseConfigOptions {
  network: Pick<Resources.Resource<"networks">, "name">;
}

export function useConfig({ network: { name } }) {
  const [config, setConfig] = useState<TruffleConfig | undefined>(undefined);

  useEffect(() => {
    setImmediate(() => {
      const config = TruffleConfig.detect({ network: name });

      Environment.detect(config).then(() => setConfig(config));
    });
  }, []);

  return config;
}
