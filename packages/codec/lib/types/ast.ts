export type Location = "storage" | "memory" | "calldata";
export type Visibility = "internal" | "external";
export type Mutability = "pure" | "view" | "nonpayable" | "payable";
export type ContractKind = "contract" | "library" | "interface";

export interface AstTypeDescriptions {
  typeIdentifier: string;
  typeString?: string;
}

export interface AstDefinition {
  constant?: boolean;
  id: number;
  name: string;
  canonicalName?: string;
  linearizedBaseContracts?: number[];
  members?: AstDefinition[];
  nodes?: AstDefinition[];
  nodeType: string;
  scope?: number;
  src: string;
  stateVariable?: boolean;
  storageLocation?: string;
  typeDescriptions: AstTypeDescriptions;
  typeName?: AstDefinition;
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
    parameters: AstDefinition[];
  };
  returnParameters?: {
    parameters: AstDefinition[];
  };
  parameterTypes?: {
    parameters: AstDefinition[];
  };
  returnParameterTypes?: {
    parameters: AstDefinition[];
  };
  baseType?: AstDefinition;
  keyType?: AstDefinition;
  valueType?: AstDefinition;
  payable?: boolean;
  indexed?: boolean;
  anonymous?: boolean;
  contractKind?: ContractKind;
  isConstructor?: boolean;
  //Note: May need to add more in the future.
  //May also want to create a proper system of AstNode types
  //in the future, but sticking with this for now.
}

export interface AstReferences {
  [nodeId: number]: AstDefinition;
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
    definition?: AstDefinition;
  }
}
