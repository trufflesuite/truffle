import { Navbar, createStyles } from "@mantine/core";
import Top from "src/components/composed/Sidebar/Top";
import Middle from "src/components/composed/Sidebar/Middle";
import Bottom from "src/components/composed/Sidebar/Bottom";
import Divider from "src/components/composed/Sidebar/Divider";

const useStyles = createStyles((_theme, _params, _getRef) => ({
  sideBar: {
    minWidth: 366,
    maxWidth: 366,
    borderRight: "none"
  }
}));

function Sidebar(): JSX.Element {
  const { classes } = useStyles();

  return (
    <Navbar px="sm" className={classes.sideBar}>
      <Top />
      <Divider />
      <Middle />
      <Divider />
      <Bottom />
    </Navbar>
  );
}

export default Sidebar;
