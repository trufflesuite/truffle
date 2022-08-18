import React from "react";
import { Button as MantineButton, createStyles } from "@mantine/core";
import { useAccount } from "wagmi";
import ConnectedContent from "src/components/composed/Sidebar/Bottom/MenuButton/Button/ConnectedContent";
import DisconnectedContent from "src/components/composed/Sidebar/Bottom/MenuButton/Button/DisconnectedContent";

const useStyles = createStyles((theme, _params, _getRef) => {
  const { colors, colorScheme, radius } = theme;
  return {
    root: {
      width: "100%",
      border: "none",
      borderRadius: radius.sm,
      backgroundColor:
        colorScheme === "dark"
          ? colors["truffle-brown"][6]
          : colors["truffle-beige"][2],
      "&:hover": {
        cursor: "pointer",
        backgroundColor:
          colorScheme === "dark"
            ? colors["truffle-brown"][7]
            : colors["truffle-beige"][3]
      }
    }
  };
});

type ButtonProps = {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ onClick, ...args }: ButtonProps, ref) => {
    const { isConnected } = useAccount();
    const { classes } = useStyles();

    return (
      <MantineButton
        ref={ref}
        onClick={onClick}
        px="xl"
        py="md"
        unstyled
        classNames={{ root: classes.root }}
        {...args}
      >
        {isConnected ? <ConnectedContent /> : <DisconnectedContent />}
      </MantineButton>
    );
  }
);

export default Button;
