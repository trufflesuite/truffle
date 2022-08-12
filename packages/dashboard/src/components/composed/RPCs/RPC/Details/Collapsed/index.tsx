import { Center, useMantineTheme, createStyles } from "@mantine/core";
import {
  ChevronDown,
  ChevronsDown,
  ChevronUp,
  ChevronsUp,
  X,
  Check
} from "react-feather";
import type {
  HoverState,
  DetailsView
} from "src/components/composed/RPCs/RPC/Details/types";
import Icon from "src/components/composed/RPCs/RPC/Details/Collapsed/Icon";

const useStyles = createStyles((theme, _params, _getRef) => {
  const { colors, colorScheme } = theme;
  return {
    container: {
      height: 26,
      position: "relative",
      cursor: "pointer"
    },
    containerTinted: {
      backgroundColor:
        colorScheme === "dark"
          ? colors["truffle-brown"][9]
          : colors["truffle-beige"][2]
    }
  };
});

type CollapsedProps = {
  hoverState: HoverState;
  currentDetailsView: DetailsView;
  onClick: React.MouseEventHandler<HTMLDivElement>;
  onEnter: React.MouseEventHandler<HTMLDivElement>;
  onLeave: React.MouseEventHandler<HTMLDivElement>;
};

function Collapsed({
  hoverState,
  currentDetailsView,
  onClick,
  onEnter,
  onLeave
}: CollapsedProps): JSX.Element {
  const { colors, colorScheme } = useMantineTheme();
  const { classes } = useStyles();

  const {
    overviewBackHovered,
    rejectButtonHovered,
    confirmButtonHovered,
    collapsedDetailsHovered
  } = hoverState;

  const iconColors = {
    default:
      colorScheme === "dark"
        ? colors["truffle-brown"][3]
        : colors["truffle-beige"][6],
    accent: colorScheme === "dark" ? colors.pink[5] : colors.orange[5],
    truffleTeal: colors["truffle-teal"][7],
    green: colors.green[8],
    red: colors.red[6]
  };

  const showChevron = !(
    overviewBackHovered ||
    rejectButtonHovered ||
    confirmButtonHovered ||
    collapsedDetailsHovered
  );
  const showChevrons =
    !(rejectButtonHovered || confirmButtonHovered) &&
    (overviewBackHovered || collapsedDetailsHovered);

  const showChevronDown = showChevron && currentDetailsView === "collapsed";
  const showChevronsDown = showChevrons && currentDetailsView === "collapsed";
  const showChevronUp = showChevron && currentDetailsView === "expanded";
  const showChevronsUp = showChevrons && currentDetailsView === "expanded";
  const showCheck = confirmButtonHovered;
  const showX = rejectButtonHovered;

  return (
    <Center
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={`${classes.container} ${
        currentDetailsView === "expanded" ? classes.containerTinted : ""
      }`}
    >
      <Icon
        component={ChevronDown}
        show={showChevronDown}
        color={iconColors.default}
      />
      <Icon
        component={ChevronsDown}
        show={showChevronsDown}
        color={iconColors.truffleTeal}
        animate={true}
      />
      <Icon
        component={ChevronUp}
        show={showChevronUp}
        color={iconColors.default}
      />
      <Icon
        component={ChevronsUp}
        show={showChevronsUp}
        color={iconColors.accent}
        animate={true}
      />
      <Icon component={Check} show={showCheck} color={iconColors.green} />
      <Icon component={X} show={showX} color={iconColors.red} />
    </Center>
  );
}

export default Collapsed;
