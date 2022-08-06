import { Center, useMantineTheme, createStyles } from "@mantine/core";
import { ChevronDown, ChevronsDown, X, Check } from "react-feather";
import type { HoverState } from "src/components/composed/RPCs/RPC/Details/types";
import Icon from "src/components/composed/RPCs/RPC/Details/Collapsed/Icon";

const useStyles = createStyles((_theme, _params, _getRef) => ({
  container: {
    height: 26,
    position: "relative",
    cursor: "pointer"
  }
}));

type CollapsedProps = {
  hoverState: HoverState;
  onClick: React.MouseEventHandler<HTMLDivElement>;
};

function Collapsed({ onClick, hoverState }: CollapsedProps): JSX.Element {
  const { colors, colorScheme } = useMantineTheme();
  const { classes } = useStyles();

  const {
    overviewBackHovered,
    rejectButtonHovered,
    confirmButtonHovered,
    detailsHovered
  } = hoverState;

  const showChevronDown = !(
    overviewBackHovered ||
    rejectButtonHovered ||
    confirmButtonHovered ||
    detailsHovered
  );
  const showChevronsDown =
    !(rejectButtonHovered || confirmButtonHovered) &&
    (overviewBackHovered || detailsHovered);
  const showCheck = confirmButtonHovered;
  const showX = rejectButtonHovered;

  return (
    <Center onClick={onClick} className={classes.container}>
      <Icon
        component={ChevronDown}
        show={showChevronDown}
        color={
          colorScheme === "dark"
            ? colors["truffle-brown"][3]
            : colors["truffle-beige"][6]
        }
      />
      <Icon
        component={ChevronsDown}
        show={showChevronsDown}
        color={colors["truffle-teal"][7]}
        animate={true}
      />
      <Icon component={Check} show={showCheck} color={colors.green[8]} />
      <Icon component={X} show={showX} color={colors.red[6]} />
    </Center>
  );
}

export default Collapsed;
