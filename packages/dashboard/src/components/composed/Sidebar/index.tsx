import { Navbar } from "@mantine/core";
import Logo from "src/components/common/Logo";

const width = { base: 316 };

function Sidebar(): JSX.Element {
  return (
    <Navbar width={width} py="lg">
      <Navbar.Section>
        <Logo />
      </Navbar.Section>
    </Navbar>
  );
}

export default Sidebar;
