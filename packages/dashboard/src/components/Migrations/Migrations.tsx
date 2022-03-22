import Card from "../common/Card";
import Step from "./Step";

interface Props {
  migrations: any;
}

function Migrations({ migrations }: Props) {

    const steps = migrations.map((step: any) => {
         return <Step name={step.name} completed={step.completed} />;
    });

    const stages = (
        <div>
          {steps}
        </div>
      );

    return (
        <Card header="Migrations" body={stages} />
    );
    }

export default Migrations;
