import { useEffect, useState, useRef } from "react";
import { Stack, Text } from "@mantine/core";
import { useListState } from "@mantine/hooks";
import { useNavigate } from "react-router-dom";
import Transaction from "src/components/composed/Simulations/Simulation/Transaction";
import type { TransactionProps } from "src/components/composed/Simulations/Simulation/Transaction";
import { decodeTransaction } from "src/utils/dash";
import { useDash } from "src/hooks";

interface SimulationProps {
  id: number;
}

export default function Simulation({ id }: SimulationProps): JSX.Element {
  const { state } = useDash()!;
  const navigate = useNavigate();
  const activeId = useRef(id);
  const [transactions, transactionsHandler] = useListState<TransactionProps>(
    []
  );
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
        const block = (await simulation.provider.request({
          method: "eth_getBlockByNumber",
          params: ["0x" + i.toString(16), true]
        }))!;
        for (const transaction of block!.transactions as Exclude<
          typeof block.transactions[number],
          string
        >[]) {
          const receipt = await simulation.provider.request({
            method: "eth_getTransactionReceipt",
            params: [transaction.hash]
          });
          const { result, failed } = await decodeTransaction(
            {
              from: transaction.from,
              to: transaction.to,
              input: transaction.input,
              value: transaction.value,
              blockNumber: parseInt(transaction.blockNumber!, 16),
              nonce: parseInt(transaction.nonce, 16),
              gas: transaction.gas,
              gasPrice: transaction.gasPrice
            },
            state.decoder!
          );
          transactionsHandler.append({
            data: transaction,
            receipt,
            decoding: result,
            decodingSucceeded: !failed
          });
        }
      }
    };

    if (activeId.current !== id) {
      activeId.current = id;
      lastLatestBlockNumber.current = undefined;
      transactionsHandler.setState([]);
    }
    init();
  }, [id, state.simulations, state.decoder, transactionsHandler, navigate]);

  return (
    <Stack>
      <Text>
        Number of blocks after forking:
        {latestBlockNumber &&
          forkBlockNumber &&
          latestBlockNumber - forkBlockNumber}
      </Text>
      {transactions.map(props => (
        <Transaction
          key={`simulated-transaction-${props.data.hash}`}
          {...props}
        />
      ))}
    </Stack>
  );
}
