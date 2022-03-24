import { useState, useEffect } from "react";
import type { WorkflowCompileResult } from "@truffle/compile-common";
import { ProjectDecoder, forProject } from "@truffle/decoder";

export interface UseDecoderOptions {
  workflowCompileResult: WorkflowCompileResult | undefined;
  provider: any | undefined;
}

export const useDecoder = (options: UseDecoderOptions) => {
  const { workflowCompileResult, provider } = options;

  const [decoder, setDecoder] = useState<ProjectDecoder | undefined>();

  useEffect(() => {
    if (!provider) {
      return;
    }

    const { compilations = [] } = workflowCompileResult || {};

    console.debug("initializing decoder");
    console.debug("provider: %o", provider);
    console.debug("compilations: %o", compilations);
    forProject({
      projectInfo: {
        commonCompilations: compilations
      },
      provider
    }).then(decoder => {
      console.debug("decoder %o", decoder);
      setDecoder(decoder);
    });
  }, [provider, workflowCompileResult]);

  return decoder;
};
