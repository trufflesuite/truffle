import { useState, useEffect } from "react";
import { createStyles, Flex } from "@mantine/core";

const useStyles = createStyles(() => ({
  title: {
    fontSize: 18
  }
}));

function PreparingSession({ ganacheLoggingOutput }: any): JSX.Element {
  const { classes } = useStyles();
  const [ganacheOutput, setGanacheOutput] = useState<string>("");

  useEffect(() => {
    if (ganacheLoggingOutput.length > 0) {
      if (ganacheOutput.length === 0) {
        setGanacheOutput(ganacheLoggingOutput);
      } else {
        setGanacheOutput(ganacheOutput + "<br>" + ganacheLoggingOutput);
      }
    }
  }, [ganacheLoggingOutput]);

  return (
    <Flex
      direction="column"
      justify="center"
      align="center"
      style={{ height: "calc(100vh - 108px)" }}
    >
      <div>
        <div className={classes.title}>Preparing your debugger session...</div>
        {ganacheOutput ? (
          <div dangerouslySetInnerHTML={{ __html: ganacheOutput }} />
        ) : null}
      </div>
    </Flex>
  );
}

export default PreparingSession;
