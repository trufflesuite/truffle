import { createElement } from "react";
import type { Icon } from "react-feather";
import { ActionIcon, createStyles, Tooltip } from "@mantine/core";
import type { ActionIconProps } from "@mantine/core";

interface ControlButtonProps extends ActionIconProps {
  icon: Icon;
  step: () => Promise<void>;
  stepEffect: () => void;
  stepping: boolean;
  setStepping: React.Dispatch<React.SetStateAction<boolean>>;
  tooltipLabel: string;
}

function ControlButton({
  icon,
  step,
  stepEffect,
  disabled,
  stepping,
  setStepping,
  tooltipLabel,
  ...props
}: ControlButtonProps): JSX.Element {
  const useStyles = createStyles(theme => ({
    button: {
      height: 42,
      width: 42,
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.colors["truffle-brown"][5]
          : theme.colors["truffle-beige"][5]
    }
  }));
  const { classes } = useStyles();

  const actionIcon = (
    <ActionIcon
      {...props}
      className={classes.button}
      disabled={stepping || disabled}
      onClick={async () => {
        setStepping(true);
        await step();
        setStepping(false);
        stepEffect();
      }}
    >
      {createElement(icon)}
    </ActionIcon>
  );

  // there is an issue with the tooltips where it doesn't vanish when the button
  // switches to disabled state - we manually remove it to make it vanish
  const output = disabled ? (
    actionIcon
  ) : (
    <Tooltip label={tooltipLabel}>{actionIcon}</Tooltip>
  );

  return output;
}

export default ControlButton;
