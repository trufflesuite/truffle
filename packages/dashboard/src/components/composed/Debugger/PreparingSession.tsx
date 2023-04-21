import { createStyles, Flex } from "@mantine/core";

const useStyles = createStyles(() => ({
  title: {
    fontSize: 18
  }
}));

function PreparingSession(): JSX.Element {
  const { classes } = useStyles();
  return (
    <Flex
      direction="column"
      justify="center"
      align="center"
      style={{ height: "calc(100vh - 108px)" }}
    >
      <div>
        <div className={classes.title}>Preparing debugger session...</div>
        <div>some other content</div>
      </div>
    </Flex>
  );
}

export default PreparingSession;
