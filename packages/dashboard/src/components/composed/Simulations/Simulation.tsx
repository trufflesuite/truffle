import { useEffect, useState, useRef } from "react";
import { Stack, Code } from "@mantine/core";
import { useDash } from "src/hooks";

interface SimulationProps {
  id: number;
}

export default function Simulation({ id }: SimulationProps): JSX.Element {
  const { state } = useDash()!;
  const [transactions, setTransactions] = useState<any[]>([]);
  const [forkBlockNumber, setForkBlockNumber] = useState<number>();
  const [latestBlockNumber, setLatestBlockNumber] = useState<number>();
  const initCalled = useRef(false);

  useEffect(() => {
    if (initCalled.current) return;
    initCalled.current = true;

    const init = async () => {
      const simulation = state.simulations.get(id)!;

      // Note that block at `fork` is empty
      // github.com/trufflesuite/ganache/issues/2911
      const fork = simulation.provider.getOptions().fork.blockNumber as number;
      setForkBlockNumber(fork);

      const latestHex = await simulation.provider.request({
        method: "eth_blockNumber",
        params: undefined
      });
      const latest = parseInt(latestHex, 16);
      setLatestBlockNumber(latest);

      for (let i = fork + 1; i <= latest; i++) {
        const block = await simulation.provider.request({
          method: "eth_getBlockByNumber",
          params: ["0x" + i.toString(16), true]
        });
        for (const transaction of block!.transactions) {
          setTransactions([...transactions, transaction]);
        }
      }
    };

    init();
  }, [id, state.simulations, transactions]);

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
