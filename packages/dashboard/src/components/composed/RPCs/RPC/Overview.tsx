import { Group, Stack, Button, Badge, Text, createStyles } from "@mantine/core";
import type { CalldataDecoding } from "@truffle/codec";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import { useDash } from "src/hooks";
import { inspectDecoding } from "src/utils/dash";
import ChainIcon from "src/components/common/ChainIcon";

const useStyles = createStyles((theme, _params, getRef) => {
  const { colors, colorScheme, white, radius, fontFamilyMonospace, fn } = theme;
  return {
    container: {
      flexWrap: "nowrap",
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
    methodBadge: {
      textTransform: "initial",
      cursor: "pointer",
      transition: "background-color 0.2s"
    },
    activeMethodBadge: {
      backgroundColor:
        colorScheme === "dark"
          ? fn.darken(colors["truffle-beige"][9], 0.56)
          : colors["yellow"][1]
    },
    decoding: {
      fontFamily: fontFamilyMonospace,
      fontWeight: 700,
      color:
        colorScheme === "dark"
          ? colors["truffle-beige"][3]
          : colors["truffle-beige"][8]
    },
    buttons: {
      minWidth: 234
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
  showDecoding: boolean;
  decoding: CalldataDecoding | string;
  decodingFallback?: string;
  decodingSucceeded: boolean;
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
  showDecoding,
  decoding,
  decodingFallback = "?",
  decodingSucceeded,
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
  const decodingInspected = inspectDecoding(decoding);
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
      <Stack align="flex-start" spacing="xs">
        <Badge
          size="lg"
          variant="outline"
          color="truffle-beige"
          radius="sm"
          className={`${classes.methodBadge} ${
            active ? classes.activeMethodBadge : ""
          }`}
        >
          {method}
        </Badge>
        {showDecoding && (
          <Text size="xl" className={classes.decoding} lineClamp={1}>
            {decodingSucceeded ? decodingInspected : decodingFallback}
          </Text>
        )}
      </Stack>
      <Group className={classes.buttons}>
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
