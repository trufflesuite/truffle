import * as React from "react";
import codec from "../../codec";
import { ResultComponentOptions } from "./types/ResultComponentProps";
import { Result } from "../../codec/dist/lib/format/values";
import ResultComponent from "./ResultComponent";

type ContractComponentOptions = ResultComponentOptions & {
  wrapper: keyof JSX.IntrinsicElements;
};

type ContractComponentProps = {
  options?: ContractComponentOptions;
  name: string;
  results: {
    [name: string]: Result
  };
}

export default class ContractComponent extends React.Component<ContractComponentProps> {
  render() {
    const results = Object.entries(this.props.results);
    const options = this.props.options || {} as ContractComponentOptions;
    const Wrapper = options.wrapper || "ul";
    const classPrefix = options.classPrefix || "truffle-json-view";
    return <Wrapper className={`${classPrefix}-wrapper`}>
      {
        results.map(([name, result],i) => {
          return <ResultComponent key={name + i} name={name} result={result} options={options as ResultComponentOptions} />;
        })
      }
    </Wrapper>;
  }
}
