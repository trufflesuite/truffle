import {
  Modal,
  Group,
  Table,
  Button,
  Title,
  createStyles
} from "@mantine/core";
import { Prism } from "@mantine/prism";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import { useDash } from "src/hooks";
import ChainIcon from "src/components/common/ChainIcon";

const useStyles = createStyles((theme, _params, _getRef) => ({
  modal: {
    width: "60vw",
    minWidth: 480,
    maxWidth: 780
  },
  modalTitle: {
    marginLeft: 10
  },
  modalClose: {
    marginRight: theme.spacing.lg
  },
  table: {
    tableLayout: "fixed",
    color: theme.colors["truffle-teal"][9],
    "tbody > tr > td:first-of-type": {
      width: "20%"
    },
    "tbody > tr > td:nth-of-type(2)": {
      width: "80%"
    }
  },
  confirmButtonRightIcon: {
    marginLeft: 4,
    marginRight: 6
  }
}));

type RPCModalProps = {
  lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>;
  opened: boolean;
  close: () => void;
};

function RPCModal({ lifecycle, opened, close }: RPCModalProps): JSX.Element {
  const { method, params } = lifecycle.message.payload;
  const paramsStringified = JSON.stringify(params, null, 2);
  const paramsNumLines = (paramsStringified.match(/\n/g)?.length || 0) + 1;
  const {
    state: { chainInfo },
    operations: { userConfirmMessage, userRejectMessage }
  } = useDash()!;
  const { classes } = useStyles();
  const title = <Title order={4}>Review RPC method call details</Title>;

  const onClickConfirm = async () => {
    await userConfirmMessage(lifecycle);
  };
  const onClickReject = () => void userRejectMessage(lifecycle);

  return (
    <Modal
      opened={opened}
      onClose={close}
      title={title}
      centered
      classNames={{
        modal: classes.modal,
        title: classes.modalTitle,
        close: classes.modalClose
      }}
    >
      <Table className={classes.table}>
        <tbody>
          <tr>
            <td>
              <Title order={6}>RPC method</Title>
            </td>
            <td>
              <Prism language="javascript" copyLabel="Copy RPC method">
                {method}
              </Prism>
            </td>
          </tr>
          <tr>
            <td
              style={
                paramsNumLines > 16
                  ? { verticalAlign: "top", paddingTop: "4em" }
                  : undefined
              }
            >
              <Title order={6}>Params</Title>
            </td>
            <td>
              <Prism language="json" copyLabel="Copy params" withLineNumbers>
                {paramsStringified}
              </Prism>
            </td>
          </tr>
        </tbody>
      </Table>

      <Group position="right" mt="lg" mr="xs">
        <Button onClick={onClickReject} color="truffle-beige">
          Reject
        </Button>
        <Button
          onClick={onClickConfirm}
          rightIcon={<ChainIcon chainID={chainInfo.id!} height={16} />}
          classNames={{ rightIcon: classes.confirmButtonRightIcon }}
        >
          Confirm
        </Button>
      </Group>
    </Modal>
  );
}

export default RPCModal;
