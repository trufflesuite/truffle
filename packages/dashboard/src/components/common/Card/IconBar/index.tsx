import { Center, useMantineTheme, createStyles } from "@mantine/core";
import { useId } from "@mantine/hooks";
import {
  ChevronDown,
  ChevronsDown,
  ChevronUp,
  ChevronsUp
} from "react-feather";
import type { CardState, CardSetState } from "src/components/common/Card";
import Icon from "src/components/common/Card/IconBar/Icon";
import type { IconProps } from "src/components/common/Card/IconBar/Icon";

const useStyles = createStyles((theme, _params, _getRef) => {
  const { colors, colorScheme } = theme;
  return {
    container: {
      height: 26,
      position: "relative",
      cursor: "pointer",
      transition: "background-color 0.2s"
    },
    containerBright: {
      backgroundColor:
        colorScheme === "dark"
          ? colors["truffle-brown"][9]
          : colors["truffle-beige"][2]
    }
  };
});

interface IconBarProps {
  state: CardState;
  setState: CardSetState;
  extraIcons?: IconProps[];
}

export default function IconBar({
  state,
  setState,
  extraIcons
}: IconBarProps): JSX.Element {
  const id = useId();
  const { colors, colorScheme } = useMantineTheme();
  const { classes } = useStyles();

  const defaultIconColor =
    colorScheme === "dark"
      ? colors["truffle-brown"][3]
      : colors["truffle-beige"][6];

  const handleClick = () => setState({ open: !state.open });
  const handleMouseEnter = () =>
    setState({ bright: { overview: true, details: true, iconBar: true } });
  const handleMouseLeave = () =>
    setState({
      bright: { overview: state.open, details: false, iconBar: state.open }
    });

  const showExtraIcon = extraIcons?.some(({ show }) => show);
  const showChevronDown =
    !state.open && !state.bright.iconBar && !showExtraIcon;
  const showChevronsDown =
    !state.open && state.bright.iconBar && !showExtraIcon;
  const showChevronUp =
    !state.bright.details && state.bright.iconBar && !showExtraIcon;
  const showChevronsUp = state.bright.details && state.open && !showExtraIcon;

  return (
    <Center
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`${classes.container} ${
        state.bright.iconBar ? classes.containerBright : ""
      }`}
    >
      <Icon
        component={ChevronDown}
        show={showChevronDown}
        color={defaultIconColor}
      />
      <Icon
        component={ChevronsDown}
        show={showChevronsDown}
        color={colors["truffle-teal"][7]}
        animate={true}
      />
      <Icon
        component={ChevronUp}
        show={showChevronUp}
        color={defaultIconColor}
      />
      <Icon
        component={ChevronsUp}
        show={showChevronsUp}
        color={colorScheme === "dark" ? colors.pink[5] : colors.orange[5]}
        animate={true}
      />
      {extraIcons?.map((props, index) => (
        <Icon key={`iconBar-${id}-extraIcon-${index}`} {...props} />
      ))}
    </Center>
  );
}
