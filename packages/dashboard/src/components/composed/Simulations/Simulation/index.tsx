import { useEffect, useState, useRef } from "react";
import type { Ethereum } from "ganache";
import { Stack, Text } from "@mantine/core";
import { useListState } from "@mantine/hooks";
import { useNavigate } from "react-router-dom";
import Transaction from "src/components/composed/Simulations/Simulation/Transaction";
import { useDash } from "src/hooks";

interface SimulationProps {
  id: number;
}

export default function Simulation({ id }: SimulationProps): JSX.Element {
  const { state } = useDash()!;
  const navigate = useNavigate();
  const activeId = useRef(id);
  const [transactions, transactionsHandler] = useListState<{
    data: any;
    receipt: Ethereum.Transaction.Receipt;
  }>([]);
  const [forkBlockNumber, setForkBlockNumber] = useState<number>();
  const [latestBlockNumber, setLatestBlockNumber] = useState<number>();
  const lastLatestBlockNumber = useRef<number>();

  useEffect(() => {
    const init = async () => {
      const simulation = state.simulations.get(id)!;
      if (!simulation) return navigate("/simulations");

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
          const receipt = await simulation.provider.request({
            method: "eth_getTransactionReceipt",
            params: [(transaction as Exclude<typeof transaction, string>).hash]
          });
          transactionsHandler.append({ data: transaction, receipt });
        }
      }
    };

    if (activeId.current !== id) {
      activeId.current = id;
      lastLatestBlockNumber.current = undefined;
      transactionsHandler.setState([]);
    }
    init();
  }, [id, state.simulations, transactionsHandler, navigate]);

  return (
    <Stack>
      <Text>
        Number of blocks after forking:
        {latestBlockNumber &&
          forkBlockNumber &&
          latestBlockNumber - forkBlockNumber}
      </Text>
      {transactions.map(({ data, receipt }) => (
        <Transaction
          key={`simulated-transaction-${data.hash}`}
          transaction={data}
          receipt={receipt}
        />
      ))}
    </Stack>
  );
}
