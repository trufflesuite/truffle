import { useState, useEffect } from "react";
import { createStyles, Flex, Loader } from "@mantine/core";

const useStyles = createStyles(() => ({
  title: {
    fontSize: 18,
    marginLeft: 20
  }
}));

function PreparingSession({ ganacheLoggingOutput }: any): JSX.Element {
  const { classes } = useStyles();
  const [ganacheOutput, setGanacheOutput] = useState<string[]>([]);

  useEffect(() => {
    setGanacheOutput(ganacheOutput.concat(ganacheLoggingOutput));
  }, [ganacheLoggingOutput]);

  return (
    <Flex
      direction="column"
      justify="center"
      align="center"
      style={{ height: "calc(100vh - 108px)" }}
    >
      <div>
        <Flex>
          <Loader />
          <div className={classes.title}>
            Preparing your debugger session, this may take a minute.
          </div>
        </Flex>
        {ganacheLoggingOutput.length > 0 ? (
          <pre
            dangerouslySetInnerHTML={{ __html: ganacheOutput.join("<br>") }}
          />
        ) : null}
      </div>
    </Flex>
  );
}

export default PreparingSession;
