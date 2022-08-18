import { Navbar, Group } from "@mantine/core";
import LogoWithText from "src/components/common/LogoWithText";
import ColorSchemeToggle from "src/components/composed/Sidebar/Top/ColorSchemeToggle";

function Top(): JSX.Element {
  return (
    <Navbar.Section>
      <Group position="apart" px="sm" py="xl">
        <LogoWithText size="sm" mt={10} />
        <ColorSchemeToggle />
      </Group>
    </Navbar.Section>
  );
}

export default Top;
