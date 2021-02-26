import { useState, useEffect } from "react";
import type * as Decoder from "@truffle/decoder";

export interface UseDecodedAddressOptions {
  decoder: Decoder.WireDecoder;
  address: string;
}

export interface SummaryState {
  contract: Decoder.ContractState | undefined;
  complete: boolean;
}

export interface VariablesState {
  variables: Decoder.StateVariable[] | undefined;
  complete: boolean;
}

export function useDecodedAddress({
  decoder,
  address
}: UseDecodedAddressOptions): {
  summary: SummaryState;
  variables: VariablesState;
} {
  const [summary, setSummaryState] = useState<SummaryState>({
    contract: undefined,
    complete: false
  });

  const [variables, setVariablesState] = useState<VariablesState>({
    variables: undefined,
    complete: false
  });

  useEffect(() => {
    decoder.forAddress(address).then(instanceDecoder => {
      instanceDecoder.state().then(contract => {
        setSummaryState({
          contract,
          complete: true
        });
      });

      instanceDecoder
        .variables()
        .then(variables => {
          setVariablesState({
            variables,
            complete: true
          });
        })
        .catch(() => {
          setVariablesState({
            variables: undefined,
            complete: true
          });
        });
    });
  }, []);

  return { summary, variables };
}
