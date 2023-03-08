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
  const [output, setOutput] = useState(null as any);
  // when the debugger step changes, update variables
  useEffect(() => {
    async function getVariables() {
      const sections = session.view(
        session.selectors.data.current.identifiers.sections
      );
      const variables = await session!.variables();
      const entries = [];
      for (const section in sections) {
        const list: Array<any> = sections[section].map(
          (variableName: keyof typeof variables) => {
            if (variables)
              return (
                <>
                  <dt>{variableName}</dt>
                  <dd>
                    {inspect(
                      new Codec.Export.ResultInspector(variables[variableName])
                    )}
                  </dd>
                </>
              );
          }
        );
        if (list.length > 0) {
          entries.push(
            <dl key={section}>
              <h1>{section}</h1>
              {...list}
            </dl>
          );
        }
      }

      setOutput(entries);
    }
    getVariables();
  }, [currentStep, session]);

  return output ? <Container>{output}</Container> : null;
}

export default Variables;
