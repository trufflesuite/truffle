import { Button, createStyles } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { ChevronRight } from "react-feather";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import TxModal from "src/components/composed/Txs/Tx/TxModal";

const useStyles = createStyles((theme, _params, getRef) => ({
  root: {
    [`&:hover .${getRef("rightIcon")}`]: {
      opacity: 1,
      color: theme.colors["truffle-teal"][7]
    }
  },
  label: {
    fontFamily: theme.fontFamilyMonospace
  },
  rightIcon: {
    ref: getRef("rightIcon"),
    opacity: 0.2,
    transition: "opacity 0.2s"
  }
}));

type TxProps = {
  lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>;
};

function Tx({ lifecycle }: TxProps): JSX.Element {
  const { method } = lifecycle.message.payload;
  const [modalOpened, modalHandlers] = useDisclosure(false);
  const { classes } = useStyles();

  return (
    <>
      <TxModal
        lifecycle={lifecycle}
        opened={modalOpened}
        close={modalHandlers.close}
      />

      <Button
        onClick={modalHandlers.open}
        rightIcon={<ChevronRight />}
        size="xl"
        color="truffle-beige"
        variant="light"
        classNames={{
          root: classes.root,
          label: classes.label,
          rightIcon: classes.rightIcon
        }}
      >
        {method}
      </Button>
    </>
  );
}

export default Tx;
