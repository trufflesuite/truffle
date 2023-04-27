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
    },
    active: {
      backgroundColor:
        colorScheme === "dark"
          ? colors["truffle-brown"][6]
          : colors["truffle-beige"][3]
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

function NavButton({ to, label, icon, badge }: NavButtonProps): JSX.Element {
  const { classes } = useStyles();
  const location = useLocation();

  return (
    <UnstyledButton
      component={Link}
      to={to}
      p="xl"
      className={`${classes.button} ${
        location.pathname.startsWith(to) ? classes.active : undefined
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
