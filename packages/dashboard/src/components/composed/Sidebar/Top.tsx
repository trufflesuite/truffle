import {
  Navbar,
  Group,
  ActionIcon,
  useMantineColorScheme
} from "@mantine/core";
import Logo from "src/components/common/Logo";

function Top(): JSX.Element {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  const handleClick = () => void toggleColorScheme();

  return (
    <Navbar.Section>
      <Group position="apart" px="sm" py="xl">
        <Logo size="sm" />
        <ActionIcon
          onClick={handleClick}
          size="lg"
          sx={theme => ({
            backgroundColor:
              theme.colorScheme === "dark"
                ? theme.colors.dark[6]
                : theme.colors.gray[0],
            "&:hover": {
              backgroundColor:
                theme.colorScheme === "dark"
                  ? theme.colors.dark[8]
                  : theme.colors.gray[2]
            }
          })}
        >
          {colorScheme === "dark" ? "☀️" : "✨"}
        </ActionIcon>
      </Group>
    </Navbar.Section>
  );
}

export default Top;
