import { Navbar, Group } from "@mantine/core";
import Logo from "src/components/common/Logo";
import ColorSchemeToggle from "src/components/composed/Sidebar/Top/ColorSchemeToggle";

function Top(): JSX.Element {
  return (
    <Navbar.Section>
      <Group position="apart" px="sm" py="xl">
        <Logo size="sm" />
        <ColorSchemeToggle />
      </Group>
    </Navbar.Section>
  );
}

export default Top;
