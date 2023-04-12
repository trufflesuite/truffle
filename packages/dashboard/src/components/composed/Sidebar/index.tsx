import { Navbar, createStyles } from "@mantine/core";
import Top from "src/components/composed/Sidebar/Top";
import Middle from "src/components/composed/Sidebar/Middle";
import Bottom from "src/components/composed/Sidebar/Bottom";
import Divider from "src/components/composed/Sidebar/Divider";

const useStyles = createStyles((theme, _params, _getRef) => ({
  sideBar: {
    height: "100vh",
    width: 370,
    borderRight: "none",
    backgroundColor:
      theme.colorScheme === "dark"
        ? theme.colors["truffle-brown"][8]
        : theme.colors["truffle-beige"][3]
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
