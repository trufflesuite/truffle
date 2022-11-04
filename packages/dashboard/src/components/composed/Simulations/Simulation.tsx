import { useEffect, useState, useRef } from "react";
import type { Ethereum } from "ganache";
import { Stack, Code } from "@mantine/core";
import { useListState } from "@mantine/hooks";
import { useDash } from "src/hooks";

interface SimulationProps {
  id: number;
}

export default function Simulation({ id }: SimulationProps): JSX.Element {
  const { state } = useDash()!;
  const lastId = useRef(id);
  const [transactions, transactionsHandlers] =
    useListState<Ethereum.Transaction>([]);
  const [forkBlockNumber, setForkBlockNumber] = useState<number>();
  const [latestBlockNumber, setLatestBlockNumber] = useState<number>();
  const lastLatestBlockNumber = useRef<number>();

  useEffect(() => {
    const init = async () => {
      const simulation = state.simulations.get(id)!;

      const latestHex = await simulation.provider.request({
        method: "eth_blockNumber",
        params: undefined
      });
      const latest = parseInt(latestHex, 16);
      if (latest === lastLatestBlockNumber.current) return;
      lastLatestBlockNumber.current = latest;
      setLatestBlockNumber(latest);

      // Note that block at `fork` is empty
      // github.com/trufflesuite/ganache/issues/2911
      const fork = simulation.provider.getOptions().fork.blockNumber as number;
      setForkBlockNumber(fork);

      for (let i = fork + 1; i <= latest; i++) {
        const block = await simulation.provider.request({
          method: "eth_getBlockByNumber",
          params: ["0x" + i.toString(16), true]
        });
        for (const transaction of block!.transactions) {
          transactionsHandlers.append(transaction as Ethereum.Transaction);
        }
      }
    };

    init();
  }, [id, state.simulations, transactionsHandlers]);

  useEffect(() => {
    if (lastId.current !== id) {
      lastId.current = id;
      lastLatestBlockNumber.current = undefined;
      transactionsHandlers.setState([]);
    }
  }, [id, transactionsHandlers]);

  return (
    <Stack>
      <Code block>
        Number of blocks after forking:&nbsp;
        {latestBlockNumber &&
          forkBlockNumber &&
          latestBlockNumber - forkBlockNumber}
        <br />
        {JSON.stringify(transactions, null, 2)}
      </Code>
    </Stack>
  );
}
