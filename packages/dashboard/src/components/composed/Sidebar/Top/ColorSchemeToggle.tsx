import { ActionIcon, useMantineColorScheme, createStyles } from "@mantine/core";
import { Moon, Sun } from "react-feather";

const useStyles = createStyles((theme, _params, _getRef) => {
  const { colors, colorScheme } = theme;
  return {
    actionIcon: {
      color: colorScheme === "dark" ? colors.yellow[4] : colors.blue[6],
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

function ColorSchemeToggle(): JSX.Element {
  const { classes } = useStyles();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const featherIconProps = { size: 16 };

  const handleClick = () => void toggleColorScheme();

  return (
    <ActionIcon onClick={handleClick} size="lg" className={classes.actionIcon}>
      {colorScheme === "dark" ? (
        <Sun {...featherIconProps} />
      ) : (
        <Moon {...featherIconProps} />
      )}
    </ActionIcon>
  );
}

export default ColorSchemeToggle;
