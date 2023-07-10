import { Link } from "react-router-dom";
import { UnstyledButton, Group, Text, createStyles } from "@mantine/core";
import { useLocation } from "react-router-dom";

const useStyles = createStyles((theme, _params, _getRef) => {
  const { colors, colorScheme, radius, fn } = theme;
  return {
    button: {
      display: "block",
      borderRadius: radius.sm
    },
    disabled: {
      cursor: "default",
      pointerEvents: "none",
      color:
        colorScheme === "dark"
          ? colors["truffle-brown"][4]
          : colors["truffle-beige"][5]
    },
    active: {
      backgroundColor:
        colorScheme === "dark"
          ? colors["truffle-brown"][6]
          : colors["truffle-beige"][2]
    },
    inactive: {
      "&:hover": {
        backgroundColor:
          colorScheme === "dark"
            ? fn.lighten(colors["truffle-brown"][8], 0.08)
            : fn.darken(colors["truffle-beige"][4], 0.08)
      }
    }
  };
});

type NavButtonProps = {
  to: string;
  label?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
};

function NavButton({
  to,
  label,
  icon,
  badge,
  disabled
}: NavButtonProps): JSX.Element {
  const { classes } = useStyles();
  const location = useLocation();

  return (
    <UnstyledButton
      component={Link}
      to={to}
      p="xl"
      className={`${classes.button} ${
        disabled ? classes.disabled : undefined
      } ${
        location.pathname.startsWith(to) ? classes.active : classes.inactive
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

export default NavButton;
