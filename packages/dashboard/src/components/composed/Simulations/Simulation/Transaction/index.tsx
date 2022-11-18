import type { Ethereum } from "ganache";
import Card from "src/components/common/Card";
import Overview from "src/components/composed/Simulations/Simulation/Transaction/Overview";
import Details from "src/components/composed/Simulations/Simulation/Transaction/Details";
import type { Decoding } from "src/utils/dash";

export interface TransactionProps {
  data: any;
  receipt: Ethereum.Transaction.Receipt;
  decoding: Decoding;
  decodingSucceeded: boolean;
}

export default function Transaction(props: TransactionProps): JSX.Element {
  return (
    <Card
      overviewComponent={Overview}
      overviewProps={props}
      detailsComponent={Details}
      detailsProps={props}
    />
  );
}
