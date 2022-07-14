import { Navbar } from "@mantine/core";
import Top from "src/components/composed/Sidebar/Top";
import Middle from "src/components/composed/Sidebar/Middle";
import Bottom from "src/components/composed/Sidebar/Bottom";
import Divider from "src/components/composed/Sidebar/Divider";

function Sidebar(): JSX.Element {
  return (
    <Navbar px="sm" sx={{ minWidth: 366, maxWidth: 366 }}>
      <Top />
      <Divider />
      <Middle />
      <Divider />
      <Bottom />
    </Navbar>
  );
}

export default Sidebar;
