import * as React from "react";
import { ResultComponentOptions } from "./types/ResultComponentProps";
import { Format } from "@truffle/codec";
import ResultComponent from "./ResultComponent";

type ContractComponentOptions = ResultComponentOptions & {
  wrapper: keyof JSX.IntrinsicElements;
};

type ContractComponentProps = {
  options?: ContractComponentOptions;
  name: string;
  results: {
    [name: string]: Format.Values.Result
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
