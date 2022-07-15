import React from "react";
import { UnstyledButton, createStyles } from "@mantine/core";
import { useAccount } from "wagmi";
import ConnectedContent from "src/components/composed/Sidebar/Bottom/MenuBtn/Btn/ConnectedContent";
import DisconnectedContent from "src/components/composed/Sidebar/Bottom/MenuBtn/Btn/DisconnectedContent";

const useStyles = createStyles((theme, _params, _getRef) => {
  const { colors, colorScheme, radius } = theme;
  return {
    btn: {
      width: "100%",
      borderRadius: radius.sm,
      backgroundColor:
        colorScheme === "dark"
          ? colors["truffle-brown"][6]
          : colors["truffle-beige"][2],
      "&:hover": {
        backgroundColor:
          colorScheme === "dark"
            ? colors["truffle-brown"][7]
            : colors["truffle-beige"][3]
      }
    }
  };
});

type BtnProps = {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

const Btn = React.forwardRef<HTMLButtonElement, BtnProps>(
  ({ onClick, ...args }: BtnProps, ref) => {
    const { isConnected } = useAccount();
    const { classes } = useStyles();

    return (
      <UnstyledButton
        ref={ref}
        onClick={onClick}
        px="xl"
        py="md"
        className={classes.btn}
        {...args}
      >
        {isConnected ? <ConnectedContent /> : <DisconnectedContent />}
      </UnstyledButton>
    );
  }
);

export default Btn;
