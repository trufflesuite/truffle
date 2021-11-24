import Card from "./common/Card";
import Button from "./common/Button";
import NetworkIndicator from "./common/NetworkIndicator";

interface Props {
  confirm: () => void;
  newChainId: number;
  previousChainId: number;
}

function ConfirmNetworkChanged({
  confirm,
  newChainId,
  previousChainId
}: Props) {
  const confirmBody = (
    <div className="flex flex-col gap-2">
      <div>
        We detected that your connected network changed. Please confirm that
        this was your intention or switch back to the previous network.
      </div>
      <div>Your previous connected network was:</div>
      <div className="flex justify-center">
        <NetworkIndicator chainId={previousChainId} />
      </div>
      <div>Your new connected network is:</div>
      <div className="flex justify-center">
        <NetworkIndicator chainId={newChainId} />
      </div>
    </div>
  );

  const confirmButton = <Button text="CONFIRM" onClick={confirm} />;

  return (
    <div className="flex justify-center items-center py-20">
      <div className="mx-3 w-3/4 max-w-4xl h-2/3 text-center">
        <Card
          header="CONFIRM NETWORK CHANGED"
          body={confirmBody}
          footer={confirmButton}
        />
      </div>
    </div>
  );
}

export default ConfirmNetworkChanged;
