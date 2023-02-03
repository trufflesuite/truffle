import { createElement } from "react";
import type { Icon } from "react-feather";
import { ActionIcon } from "@mantine/core";
import type { ActionIconProps } from "@mantine/core";

interface ControlButtonProps extends ActionIconProps {
  icon: Icon;
  step: () => Promise<void>;
  stepEffect: () => void;
  stepping: boolean;
  setStepping: React.Dispatch<React.SetStateAction<boolean>>;
}

function ControlButton({
  icon,
  step,
  stepEffect,
  disabled,
  stepping,
  setStepping,
  ...props
}: ControlButtonProps): JSX.Element {
  return (
    <ActionIcon
      {...props}
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
}

export default ControlButton;
