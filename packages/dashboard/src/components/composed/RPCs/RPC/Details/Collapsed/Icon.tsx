import { Box, createStyles, keyframes } from "@mantine/core";
import type { BoxProps } from "@mantine/core";
import type { Icon as FeatherIcon } from "react-feather";

const jump = keyframes({
  "0%, 100%": { transform: "translateY(0)" },
  "60%": { transform: "translateY(-3px)" },
  "90%": { transform: "translateY(3px)" }
});

const useStyles = createStyles((_theme, _params, _getRef) => ({
  icon: {
    position: "absolute",
    opacity: 0,
    transition: "opacity 0.2s"
  },
  iconShow: {
    opacity: 1,
    transitionDelay: "0.1s"
  },
  jump: {
    animation: `${jump} 1s linear infinite`
  }
}));

interface IconProps extends BoxProps {
  component: FeatherIcon;
  show: boolean;
  color?: string;
  animate?: boolean;
}

function Icon({ component, show, color, animate }: IconProps): JSX.Element {
  const { classes } = useStyles();

  return (
    <Box
      component={component}
      color={color}
      size={16}
      strokeWidth={3}
      className={`${classes.icon} ${show ? classes.iconShow : ""} ${
        animate ? classes.jump : ""
      }`}
    />
  );
}

export default Icon;
