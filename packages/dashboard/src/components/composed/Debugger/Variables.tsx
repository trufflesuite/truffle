import { useEffect, useState } from "react";
import type { Session } from "src/utils/debugger";
import inspect from "browser-util-inspect";
import * as Codec from "@truffle/codec";

type VariablesArgs = {
  session: Session;
  currentStep: string;
};

function Variables({
  session,
  currentStep
}: VariablesArgs): JSX.Element | null {
  const [output, setOutput] = useState<JSX.Element[] | null>(null);
  // when the debugger step changes, update variables
  useEffect(() => {
    async function getVariables() {
      const sections = session.view(
        session.selectors.data.current.identifiers.sections
      );
      const variables = await session!.variables();
      const entries = [];
      // section here is a variable category such as a Solidity built-in
      // or contract variable
      for (const section in sections) {
        const variableValues: Array<JSX.Element> = sections[section].map(
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
        if (variableValues.length > 0) {
          entries.push(
            <dl key={section}>
              <div className="truffle-debugger-variables-types">{section}</div>
              {...variableValues}
            </dl>
          );
        }
      }

      setOutput(entries);
    }
    getVariables();
  }, [currentStep, session]);

  return (
    <div className="truffle-debugger-variables">
      <div className="truffle-debugger-section-header">Variables</div>
      <pre>{output ? output : ""}</pre>
    </div>
  );
}

export default Variables;
