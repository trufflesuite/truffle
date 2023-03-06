import { useEffect, useState } from "react";
import type { Session } from "src/utils/debugger";
import inspect from "browser-util-inspect";
import { Container } from "@mantine/core";
import * as Codec from "@truffle/codec";

type VariablesArgs = {
  session: Session;
  currentStep: string;
};

function Variables({
  session,
  currentStep
}: VariablesArgs): JSX.Element | null {
  const [variables, setVariables] = useState({});
  // when the debugger step changes, update variables
  useEffect(() => {
    async function getVariables() {
      const variables = await session!.variables();
      setVariables(variables);
    }
    getVariables();
  }, [currentStep, session]);

  return (
    <Container>
      {Object.entries(variables).map(([name, result]) => {
        return (
          <div key={name}>
            <>
              {name} -{" "}
              {inspect(new Codec.Export.ResultInspector(result as any))}
            </>
          </div>
        );
      })}
    </Container>
  );
}

export default Variables;
