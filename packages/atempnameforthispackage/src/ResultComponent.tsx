import * as React from "react";

import { Result, ElementaryResult, ArrayResult, MappingResult, StructResult, TupleResult, MagicResult, TypeResult, FunctionExternalResult, FunctionInternalResult, UintResult, UintValue, IntResult, BoolResult, BytesResult, AddressResult, StringResult, FixedResult, UfixedResult, EnumResult, ContractResult } from "../../codec/dist/lib/format/values";
import { ResultComponentProps, ResultComponentOptions } from "./types/ResultComponentProps";
import GenericComponent from "./GenericComponent";
import DefaultComponents from "./default-components";
import IDefaultComponent from "./types/IDefaultComponent";

function findDefaultComponent<T extends Result>(
  props: ResultComponentProps<T>,
  components:
    (React.JSXElementConstructor<ResultComponentProps<Result>> &
      {
        [K in keyof typeof IDefaultComponent]: typeof IDefaultComponent[K]
      }
    )[]
) {
  for (const Component of components) {
    if (Component.isType(props)) {
      return <Component {...props} />;
    }
  }
}

type ValueResult = Result & {kind: "value" | "error"};

export default class ResultComponent<T extends ValueResult> extends React.Component<ResultComponentProps<T>> {
  render() {
    const props = this.props;
    const result = props.result as Result;
    
    let children: any;
    if (result.kind === "value") {
      const Component = findDefaultComponent(props, Object.values(DefaultComponents));
      if (Component){
        return Component;
      }
      
      // handle generic components...
      const value = result.value;
      if ("asBN" in value) {
        children = value.asBN.toString();
      } else if ("asBoolean" in value) {
        children = value.asBoolean;
      } else if ("asHex" in value) {
        children = value.asHex;
      } else if ("asAddress" in value) {
        children = value.asAddress;
      } else if ("asBig" in value) {
        children = value.asBig.toString();
      } else {
        // TODO: find the rest of them
      }
    } else if (result.kind === "error") {
      // TODO: more robust error handling.
      children = result.error.kind;
    }

    return <GenericComponent {...this.props}>
      {children}
    </GenericComponent>;
  }
}

// To whom it may concern:
// The following is just a idea/POC I don't wnat to get rid of yet. /shrug

function ResultComponentFactory<T extends ValueResult>() {
  return (props: ResultComponentProps<T>) => (<ResultComponent<T> {...props}/>);
}

const ElementaryResultComponent = ResultComponentFactory<ElementaryResult>();
const UintResultComponent = ResultComponentFactory<UintResult>();
const IntResultComponent = ResultComponentFactory<IntResult>();
const BoolResultComponent = ResultComponentFactory<BoolResult>();
const BytesResultComponent = ResultComponentFactory<BytesResult>();
const AddressResultComponent = ResultComponentFactory<AddressResult>();
const StringResultComponent = ResultComponentFactory<StringResult>();
const FixedResultComponent = ResultComponentFactory<FixedResult>();
const UfixedResultComponent = ResultComponentFactory<UfixedResult>();
const EnumResultComponent = ResultComponentFactory<EnumResult>();
const ContractResultComponent = ResultComponentFactory<ContractResult>();
const ArrayResultComponent = ResultComponentFactory<ArrayResult>();
const MappingResultComponent = ResultComponentFactory<MappingResult>();
const StructResultComponent = ResultComponentFactory<StructResult>();
const TupleResultComponent = ResultComponentFactory<TupleResult>();
const MagicResultComponent = ResultComponentFactory<MagicResult>();
const TypeResultComponent = ResultComponentFactory<TypeResult>();
const FunctionExternalResultComponent = ResultComponentFactory<FunctionExternalResult>();
const FunctionInternalResultComponent = ResultComponentFactory<FunctionInternalResult>();
