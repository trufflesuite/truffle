import * as React from "react";
import createContext from "mini-create-react-context";

import { Format } from "@truffle/codec";

export const ResultContext = createContext<Format.Values.Result | null>(null);
export const ValueContext = createContext<Format.Values.Value["value"] | null>(null);
export const ErrorContext = createContext<Format.Errors.ErrorResult["error"] | null>(null);

export interface HasValueProp<V extends Format.Values.Value = Format.Values.Value> {
  type: V["type"],
  value: V["value"]
}

export interface HasTypeProp<T extends Format.Types.Type = Format.Types.Type> {
  type: T
}

export interface TypeClasses {
  address: {
    type: Format.Types.AddressType,
    value: Format.Values.AddressValue
  },
  array: {
    type: Format.Types.ArrayType,
    value: Format.Values.ArrayValue
  }
  bool: {
    type: Format.Types.BoolType,
    value: Format.Values.BoolValue,
  },
  bytes: {
    type: Format.Types.BytesType,
    value: Format.Values.BytesValue,
  },
  contract: {
    type: Format.Types.ContractType,
    value: Format.Values.ContractValue,
  },
  enum: {
    type: Format.Types.EnumType,
    value: Format.Values.EnumValue,
  },
  fixed: {
    type: Format.Types.FixedType,
    value: Format.Values.FixedValue,
  },
  function: {
    type: Format.Types.FunctionExternalType | Format.Types.FunctionInternalType,
    value: Format.Values.FunctionExternalValue | Format.Values.FunctionInternalValue,
  },
  int: {
    type: Format.Types.IntType,
    value: Format.Values.IntValue,
  },
  magic: {
    type: Format.Types.MagicType,
    value: Format.Values.MagicValue,
  },
  mapping: {
    type: Format.Types.MappingType,
    value: Format.Values.MappingValue,
  },
  string: {
    type: Format.Types.StringType,
    value: Format.Values.StringValue,
  },
  struct: {
    type: Format.Types.StructType,
    value: Format.Values.StructValue,
  },
  tuple: {
    type: Format.Types.TupleType,
    value: Format.Values.TupleValue,
  },
  type: {
    type: Format.Types.TypeType,
    value: Format.Values.TypeValue,
  },
  ufixed: {
    type: Format.Types.UfixedType,
    value: Format.Values.UfixedValue,
  },
  uint: {
    type: Format.Types.UintType,
    value: Format.Values.UintValue,
  }
}

export class UintValueComponent extends React.PureComponent<
  HasValueProp<Format.Values.UintValue>
> {
  render () {
    const { asBN } = this.props.value;

    return asBN.toString();
  }
}

export class GenericValueComponent<V extends Format.Values.Value = Format.Values.Value> extends React.PureComponent<HasValueProp<V>> {
  render () {
    return <span>value</span>
  }
};

export class GenericTypeComponent<T extends Format.Types.Type = Format.Types.Type> extends React.PureComponent<HasTypeProp<T>> {
  render () {
    return <span>{this.props.type.typeClass}</span>
  }
};

export type TypeComponents = {
  [T in keyof TypeClasses]?:
    React.ComponentClass<HasTypeProp<TypeClasses[T]["type"]>>
};

export type ValueComponents = {
  [T in keyof TypeClasses]?:
    React.ComponentClass<HasValueProp<TypeClasses[T]["value"]>>
}

export interface Components {
  types: TypeComponents;
  values: ValueComponents;
}

export const ComponentsContext = createContext<Components>({
  types: {
    address: GenericTypeComponent,
    array: GenericTypeComponent,
    bool: GenericTypeComponent,
    bytes: GenericTypeComponent,
    contract: GenericTypeComponent,
    enum: GenericTypeComponent,
    fixed: GenericTypeComponent,
    function: GenericTypeComponent,
    int: GenericTypeComponent,
    magic: GenericTypeComponent,
    mapping: GenericTypeComponent,
    string: GenericTypeComponent,
    struct: GenericTypeComponent,
    tuple: GenericTypeComponent,
    type: GenericTypeComponent,
    ufixed: GenericTypeComponent,
    uint: GenericTypeComponent,
  },
  values: {
    address: GenericValueComponent,
    array: GenericValueComponent,
    bool: GenericValueComponent,
    bytes: GenericValueComponent,
    contract: GenericValueComponent,
    enum: GenericValueComponent,
    fixed: GenericValueComponent,
    function: GenericValueComponent,
    int: GenericValueComponent,
    magic: GenericValueComponent,
    mapping: GenericValueComponent,
    string: GenericValueComponent,
    struct: GenericValueComponent,
    tuple: GenericValueComponent,
    type: GenericValueComponent,
    ufixed: GenericValueComponent,
    uint: UintValueComponent,
  }
});

export class Type extends React.PureComponent {
  render () {
    return (
      <ResultContext.Consumer>
        {({ type }) => (
          <ComponentsContext.Consumer>
            {(components: Components) => {
              const Component: any = components.types[type.typeClass];
              if (Component) {
                return <Component type={type} />
              }
            }}
          </ComponentsContext.Consumer>
        )}
      </ResultContext.Consumer>
    );
  }
}

export class Value extends React.PureComponent {
  render () {
    return (
      <ResultContext.Consumer>
        {({ type }) => (
          <ValueContext.Consumer>
            {(value) => (
              <ComponentsContext.Consumer>
                {(components: Components) => {
                  const Component: any = components.values[type.typeClass];
                  if (Component) {
                    return <Component type={type} value={value} />
                  }
                }}
              </ComponentsContext.Consumer>
            )}
          </ValueContext.Consumer>
        )}
      </ResultContext.Consumer>
    );
  }
}

export class ValueKind extends React.PureComponent<{
  children: React.ReactNode
}> {
  render () {
    return (
      <ValueContext.Consumer>
        {value => (
          value === null ? null : this.props.children
        )}
      </ValueContext.Consumer>
    );
  }
}

export class Result extends React.PureComponent<{
  children?: React.ReactNode,
  result: Format.Values.Result
}> {
  render () {
    const children = this.props.children || [
      <ValueKind key="value">
        <Value /> (<Type />)
      </ValueKind>,
    ];

    switch (this.props.result.kind) {
      case "value":
        return (
          <ResultContext.Provider value={this.props.result}>
            <ValueContext.Provider value={this.props.result.value}>
              {children}
            </ValueContext.Provider>
          </ResultContext.Provider>
        );
      case "error":
        return (
          <ResultContext.Provider value={this.props.result}>
            <ErrorContext.Provider value={this.props.result.error}>
              {children}
            </ErrorContext.Provider>
          </ResultContext.Provider>
        );
    }
  }
}
