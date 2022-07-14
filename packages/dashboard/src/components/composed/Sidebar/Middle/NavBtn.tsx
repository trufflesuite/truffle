import { Link } from "react-router-dom";
import { UnstyledButton, Group, Text, createStyles } from "@mantine/core";

const useStyles = createStyles((theme, _params, _getRef) => {
  const { colors, colorScheme, radius, fn } = theme;
  return {
    btn: {
      display: "block",
      borderRadius: radius.sm
    },
    enabled: {
      "&:hover": {
        backgroundColor:
          colorScheme === "dark"
            ? fn.darken(colors["truffle-brown"][8], 0.08)
            : fn.darken(colors["truffle-beige"][4], 0.08)
      }
    },
    disabled: {
      cursor: "default",
      pointerEvents: "none",
      color:
        colorScheme === "dark"
          ? colors["truffle-brown"][4]
          : colors["truffle-beige"][5]
    }
  };
});

type NavBtnProps = {
  to: string;
  label?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
};

function NavBtn({
  to,
  label,
  icon,
  badge,
  disabled
}: NavBtnProps): JSX.Element {
  const { classes } = useStyles();

  return (
    <UnstyledButton
      component={Link}
      to={to}
      px="lg"
      py="md"
      className={`${classes.btn} ${
        disabled ? classes.disabled : classes.enabled
      }`}
    >
      <Group position="apart">
        <Group>
          {icon}
          <Text>{label}</Text>
        </Group>
        {badge}
      </Group>
    </UnstyledButton>
  );
}

export default NavBtn;
