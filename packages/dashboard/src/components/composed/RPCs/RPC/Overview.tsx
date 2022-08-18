import { Group, Button, Text, createStyles } from "@mantine/core";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import { useDash } from "src/hooks";
import ChainIcon from "src/components/common/ChainIcon";

const useStyles = createStyles((theme, _params, getRef) => {
  const { colors, colorScheme, white, radius, fontFamilyMonospace, fn } = theme;
  return {
    container: {
      backgroundColor:
        colorScheme === "dark"
          ? fn.rgba(colors["truffle-beige"][8], 0.12)
          : colors["truffle-beige"][1],
      transition: "background-color 0.2s",
      borderRadius: `${radius.sm}px ${radius.sm}px 0 0`,
      cursor: "pointer"
    },
    activeContainer: {
      backgroundColor:
        colorScheme === "dark"
          ? fn.rgba(colors["truffle-beige"][8], 0.2)
          : white,
      [`& .${getRef("button")}`]: {
        opacity: 1
      },
      [`& .${getRef("rejectButton")}`]: {
        "backgroundColor": fn.rgba(colors.red[8], 0.5),
        "&:hover": {
          backgroundColor: colors.red[8]
        }
      },
      [`& .${getRef("confirmButton")}`]: {
        "backgroundColor": fn.rgba(colors["truffle-teal"][9], 0.5),
        "&:hover": {
          backgroundColor: colors["truffle-teal"][9]
        }
      }
    },
    methodName: {
      fontFamily: fontFamilyMonospace,
      fontWeight: 700,
      color:
        colorScheme === "dark"
          ? colors["truffle-beige"][3]
          : colors["truffle-beige"][8]
    },
    button: {
      ref: getRef("button"),
      backgroundColor: colors.gray[7],
      transition: "all 0.2s",
      opacity: 0.15
    },
    rejectButton: { ref: getRef("rejectButton") },
    confirmButton: { ref: getRef("confirmButton") },
    confirmButtonRightIcon: {
      marginLeft: 4,
      marginRight: 6
    }
  };
});

type OverviewProps = {
  lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>;
  active: boolean;
  onBackClick: React.MouseEventHandler<HTMLDivElement>;
  onBackEnter: React.MouseEventHandler<HTMLDivElement>;
  onBackLeave: React.MouseEventHandler<HTMLDivElement>;
  onRejectButtonEnter: React.MouseEventHandler<HTMLButtonElement>;
  onRejectButtonLeave: React.MouseEventHandler<HTMLButtonElement>;
  onConfirmButtonEnter: React.MouseEventHandler<HTMLButtonElement>;
  onConfirmButtonLeave: React.MouseEventHandler<HTMLButtonElement>;
};

function Overview({
  lifecycle,
  active,
  onBackClick,
  onBackEnter,
  onBackLeave,
  onRejectButtonEnter,
  onRejectButtonLeave,
  onConfirmButtonEnter,
  onConfirmButtonLeave
}: OverviewProps): JSX.Element {
  const { method } = lifecycle.message.payload;
  const {
    state: { chainInfo },
    operations: { userConfirmMessage, userRejectMessage }
  } = useDash()!;
  const { classes } = useStyles();

  const onConfirmButtonClick = () => void userConfirmMessage(lifecycle);
  const onRejectButtonClick = () => void userRejectMessage(lifecycle);

  return (
    <Group
      onClick={onBackClick}
      onMouseEnter={onBackEnter}
      onMouseLeave={onBackLeave}
      position="apart"
      spacing={50}
      pl={42}
      pr={35}
      py="lg"
      className={`${classes.container} ${
        active ? classes.activeContainer : ""
      }`}
      tabIndex={0}
    >
      <Text size="xl" className={classes.methodName}>
        {method}
      </Text>
      <Group>
        <Button
          size="md"
          onClick={onRejectButtonClick}
          onMouseEnter={onRejectButtonEnter}
          onMouseLeave={onRejectButtonLeave}
          className={`${classes.button} ${classes.rejectButton}`}
        >
          Reject
        </Button>
        <Button
          size="md"
          onClick={onConfirmButtonClick}
          onMouseEnter={onConfirmButtonEnter}
          onMouseLeave={onConfirmButtonLeave}
          rightIcon={<ChainIcon chainID={chainInfo.id!} height={16} />}
          className={`${classes.button} ${classes.confirmButton}`}
          classNames={{ rightIcon: classes.confirmButtonRightIcon }}
        >
          Confirm
        </Button>
      </Group>
    </Group>
  );
}

export default Overview;
