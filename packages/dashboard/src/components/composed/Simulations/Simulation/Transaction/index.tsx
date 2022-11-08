import type { Ethereum } from "ganache";
import Card from "src/components/common/Card";
import Overview from "src/components/composed/Simulations/Simulation/Transaction/Overview";
import Details from "src/components/composed/Simulations/Simulation/Transaction/Details";

interface TransactionProps {
  receipt: Ethereum.Transaction.Receipt;
}

export default function Transaction({
  receipt
}: TransactionProps): JSX.Element {
  const { transactionHash } = receipt;

  return (
    <Card
      overviewComponent={Overview}
      overviewProps={{ transactionHash }}
      detailsComponent={Details}
      detailsProps={{ receipt }}
    />
  );
}
