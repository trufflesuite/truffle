import { Navbar } from "@mantine/core";
import Logo from "src/components/common/Logo";

const width = { base: 316 };

function Nav(): JSX.Element {
  return (
    <Navbar width={width} p="xs">
      <Navbar.Section>
        <Logo />
      </Navbar.Section>
    </Navbar>
  );
}

export default Nav;
