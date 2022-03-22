import Card from "../common/Card";
import Step from "./Step";

interface Props {
  migrations: any;
}

function Migrations({ migrations }: Props) {

    const stages = (
        <div>
          <Step name={migrations[0]} completed={true} />
          <Step name={migrations[1]} completed={false} />
        </div>
      );

    return (
        <Card header="Migrations" body={stages} />
    );
    }

export default Migrations;
