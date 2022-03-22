import Card from "../common/Card";
import Step from "./Step";

interface Props {
  migrations: any;
}

function Migrations({ migrations }: Props) {

    const stages = (
        <div>
          <Step step={migrations[0]} />
          <Step step={migrations[1]} />
        </div>
      );

    return (
        <Card header="Migrations" body={stages} />
    );
    }

export default Migrations;
