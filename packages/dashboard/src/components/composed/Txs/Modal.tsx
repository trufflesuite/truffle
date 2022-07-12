import { Modal as MantineModal, Button, Group } from "@mantine/core";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import useDash from "src/contexts/DashContext/useDash";

type ModalProps = {
  lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>;
  opened: boolean;
  close: () => void;
};

function Modal({ lifecycle, opened, close }: ModalProps): JSX.Element {
  const { method } = lifecycle.message.payload;
  const {
    ops: { userConfirmMessage, userRejectMessage }
  } = useDash()!;

  const onConfirmBtnClick = async () => {
    await userConfirmMessage(lifecycle);
  };
  const onRejectBtnClick = () => void userRejectMessage(lifecycle);

  return (
    <MantineModal title={method} opened={opened} onClose={close} centered>
      <Group position="center">
        <Button onClick={onRejectBtnClick} color="gray">
          Reject
        </Button>
        <Button onClick={onConfirmBtnClick}>Confirm</Button>
      </Group>
    </MantineModal>
  );
}

export default Modal;
