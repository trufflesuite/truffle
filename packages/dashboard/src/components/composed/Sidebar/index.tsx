import { Navbar, Divider } from "@mantine/core";
import Top from "src/components/composed/Sidebar/Top";
import Middle from "src/components/composed/Sidebar/Middle";
import Bottom from "src/components/composed/Sidebar/Bottom";

const width = { base: 366 };

function Sidebar(): JSX.Element {
  return (
    <Navbar width={width} px="sm">
      <Top />
      <Divider />
      <Middle />
      <Divider />
      <Bottom />
    </Navbar>
  );
}

export default Sidebar;
