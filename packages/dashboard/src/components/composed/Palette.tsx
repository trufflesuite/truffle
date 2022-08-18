import { useMantineTheme, SimpleGrid, Center, Text } from "@mantine/core";

function Palette(): JSX.Element {
  const theme = useMantineTheme();
  const colors = Object.keys(theme.colors);
  const shades = [...Array(10).keys()];
  const cells = colors.map(color =>
    shades.map(shade => {
      const key = `${color}-${shade}`;
      return (
        <Center
          // @ts-ignore
          sx={{ backgroundColor: theme.colors[color][shade], height: 36 }}
          key={key}
        >
          <Text color={color} size="xs">
            {key}
          </Text>
        </Center>
      );
    })
  );

  return (
    <SimpleGrid cols={10} spacing={0}>
      {cells}
    </SimpleGrid>
  );
}

export default Palette;
