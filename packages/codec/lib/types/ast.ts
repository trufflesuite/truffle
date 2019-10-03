import { Mutability, ContractKind } from "./common";

export interface TypeDescriptions {
  typeIdentifier: string;
  typeString?: string;
}

export interface Definition {
  constant?: boolean;
  id: number;
  name: string;
  canonicalName?: string;
  linearizedBaseContracts?: number[];
  members?: Definition[];
  nodes?: Definition[];
  nodeType: string;
  scope?: number;
  src: string;
  stateVariable?: boolean;
  storageLocation?: string;
  typeDescriptions: TypeDescriptions;
  typeName?: Definition;
  expression?: {
    referencedDeclaration?: any;
  };
  value?: null | any;
  visibility?: string; //not using Visibility type above,
  //that's intended for functions but this could be other
  //things
  stateMutability?: Mutability;
  kind?: string;
  hexValue?: string;
  referencedDeclaration?: any;
  parameters?: {
    parameters: Definition[];
  };
  returnParameters?: {
    parameters: Definition[];
  };
  parameterTypes?: {
    parameters: Definition[];
  };
  returnParameterTypes?: {
    parameters: Definition[];
  };
  baseType?: Definition;
  keyType?: Definition;
  valueType?: Definition;
  payable?: boolean;
  indexed?: boolean;
  anonymous?: boolean;
  contractKind?: ContractKind;
  isConstructor?: boolean;
  //Note: May need to add more in the future.
  //May also want to create a proper system of AstNode types
  //in the future, but sticking with this for now.
}

export interface References {
  [nodeId: number]: Definition;
};

//the debugger uses this
export interface Scopes {
  [nodeId: string]: {
    id: number;
    sourceId: string;
    parentId: number | null;
    pointer: string;
    variables?: {
      name: string;
      id: number;
    }[];
    definition?: Definition;
  }
}
