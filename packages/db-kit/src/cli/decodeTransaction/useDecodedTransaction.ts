import { useState, useEffect } from "react";
import type { Transaction, TransactionReceipt } from "web3-core";
import type { ProjectDecoder, Log, Transaction as DecoderTransaction } from "@truffle/decoder";
import type { LogDecoding, CalldataDecoding } from "@truffle/codec";

export interface UseDecodedTransactionOptions {
  decoder: ProjectDecoder;
  transaction: Transaction;
  receipt: TransactionReceipt;
}

export interface SummaryState {
  decoding: CalldataDecoding | undefined;
  complete: boolean;
}

export interface EventState {
  log: Log;
  decoding: LogDecoding | undefined;
  complete: boolean;
}

export function useDecodedTransaction({
  decoder,
  transaction,
  receipt
}: UseDecodedTransactionOptions): {
  summary: SummaryState;
  events: EventState[];
} {
  const [summary, setSummaryState] = useState<SummaryState>({
    decoding: undefined,
    complete: false
  });

  const eventStates: {
    state: EventState;
    setState: (state: EventState) => void;
  }[] = [];
  for (const log of receipt.logs) {
    const [state, setState] = useState<EventState>({
      log,
      decoding: undefined,
      complete: false
    });
    eventStates.push({ state, setState });
  }

  useEffect(() => {
    //Using unknown below for type casting as web3-core's Transaction type is currently incorrect
    decoder.decodeTransaction(transaction as unknown as DecoderTransaction).then(decoding => {
      setSummaryState({
        decoding,
        complete: true
      });
    });

    for (const [index, log] of receipt.logs.entries()) {
      decoder.decodeLog(log).then(([decoding]) => {
        const { setState } = eventStates[index];
        setState({
          log,
          complete: true,
          decoding
        });
      });
    }
  }, []);

  return { summary, events: eventStates.map(({ state }) => state) };
}
