import { useEffect, useState } from "react";
import type { Session } from "src/components/composed/Debugger/utils";
import * as CodecComponents from "@truffle/codec-components/react";
import "@truffle/codec-components/react-styles";
import { createStyles, Flex } from "@mantine/core";

const useStyles = createStyles(theme => ({
  sectionHeader: {
    height: 42,
    fontSize: 16,
    paddingTop: 10,
    paddingLeft: 16,
    backgroundColor:
      theme.colorScheme === "dark"
        ? `${theme.colors["truffle-beige"][8]}33`
        : theme.colors["truffle-beige"][2],
    borderBottom: "1px solid",
    borderColor:
      theme.colorScheme === "dark"
        ? theme.colors["truffle-brown"][5]
        : `${theme.colors["truffle-beige"][5]}73`
  },
  variablesContainer: {
    overflow: "hidden",
    height: "40%",
    borderWidth: 1,
    borderStyle: "solid",
    borderRadius: 4,
    marginBottom: 20,
    borderColor:
      theme.colorScheme === "dark"
        ? theme.colors["truffle-brown"][5]
        : `${theme.colors["truffle-beige"][5]}73`
  },
  variables: {
    overflow: "scroll",
    height: "100%",
    backgroundColor:
      theme.colorScheme === "dark" ? theme.colors["truffle-brown"][8] : "white"
  },
  variablesContent: {
    paddingLeft: 10
  },
  variablesSection: {
    listStyleType: "none",
    marginBlockStart: "0em",
    marginBlockEnd: "0em",
    marginInlineStart: "0em",
    marginInlineEnd: "0em",
    paddingInlineStart: "0em",
    marginBottom: "1em"
  },
  variablesTypes: {
    fontSize: 12,
    fontWeight: 800,
    textDecoration: "underline",
    marginBottom: "0.5em"
  }
}));

type VariablesArgs = {
  session: Session;
  currentStep: string;
};

function Variables({
  session,
  currentStep
}: VariablesArgs): JSX.Element | null {
  const { classes } = useStyles();
  const [variables, setVariables] = useState<any>(null);

  // when the debugger step changes, update variables
  useEffect(() => {
    async function getVariables() {
      const sections = session.view(
        session.selectors.data.current.identifiers.sections
      );
      const vars = await session.variables();
      if (!vars || Object.keys(vars).length === 0) return;

      const variableValues: { [key: string]: any } = {};
      // section here is a variable category such as a Solidity built-in
      // or contract variable
      Object.keys(sections).forEach((section: string) => {
        const sectionVars = sections[section];
        if (!sectionVars || sectionVars.length === 0) return;
        sectionVars.forEach((varName: string) => {
          variableValues[section] = {
            ...variableValues[section],
            [varName]: vars[varName]
          };
        });
      });
      setVariables(variableValues);
    }

    getVariables();
  }, [currentStep, session, classes.variablesTypes, classes.variablesSection]);

  let output;
  if (variables) {
    output = Object.keys(variables).map(sectionName => {
      if (
        !variables[sectionName] ||
        Object.keys(variables[sectionName]).length === 0
      ) {
        return (
          <div key={sectionName}>
            <div className={classes.variablesTypes}>{sectionName}</div>
            <ul className={classes.variablesSection}></ul>
          </div>
        );
      }
      const variableVals = Object.keys(variables[sectionName]).map(
        (variableName: string) => {
          return (
            <li key={variableName}>
              <CodecComponents.NameValuePair
                data={{
                  name: `${variableName}`,
                  value: variables[sectionName][variableName]
                }}
              />
            </li>
          );
        }
      );
      return (
        <div key={sectionName}>
          <div className={classes.variablesTypes}>{sectionName}</div>
          <ul className={classes.variablesSection}>{variableVals}</ul>
        </div>
      );
    });
  }

  return (
    <Flex direction="column" className={classes.variablesContainer}>
      <div className={classes.sectionHeader}>Variables</div>
      <div className={classes.variables}>
        <pre className={classes.variablesContent}>{output}</pre>
      </div>
    </Flex>
  );
}

export default Variables;
