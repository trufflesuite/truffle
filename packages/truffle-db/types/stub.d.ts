// tslint:disable
// graphql typescript definitions

declare namespace DataModel {
  type IInstruction = any;
  type ISource = any;
  type ISourceRange = any;

  // interface IGraphQLResponseErrorLocation {
  //   line: number;
  //   column: number;
  // }

  // interface IQuery {
  //   artifacts: IArtifactsQuery;
  //   workspace: IWorkspaceQuery;
  // }

  // interface IArtifactsQuery {
  //   contractNames: Array<string | null>;
  //   contractType: IContractType | null;
  //   contractInstance: IContractInstance | null;
  // }

  // interface IContractTypeOnArtifactsQueryArguments {
  //   name: string;
  // }

  // interface IContractInstanceOnArtifactsQueryArguments {
  //   networkId: string;
  //   name: string;
  // }

  // interface IContractType {
  //   abi: IABI;
  //   name: string | null;
  //   compilation: ICompilation | null;
  //   createBytecode: IBytecode | null;
  // }

  // interface IABI {
  //   json: string;
  // }

  // interface ICompilation {
  //   compiler: ICompiler;
  //   contractTypes: IContractTypes;
  //   sources: ISources;
  // }

  // interface ICompiler {
  //   name: string | null;
  //   version: string | null;
  //   settings: any | null;
  // }

  // interface IContractTypes {
  //   contractTypes: Array<IContractType | null>;
  // }

  // interface ISources {
  //   source: ISource | null;
  // }

  // interface ISourceOnSourcesArguments {
  //   index: any;
  // }

  // interface ISource {
  //   sourcePath: string | null;
  //   contents: string;
  //   ast: any | null;
  //   id: string;
  // }

  // interface IBytecode {
  //   bytes: any;
  //   sourceMap: string | null;
  //   instructions: Array<IInstruction> | null;
  //   linkReferences: Array<ILinkReference | null> | null;
  //   id: string;
  // }

  // interface IInstruction {
  //   opcode: string;
  //   programCounter: number;
  //   meta: IInstructionMeta | null;
  //   sourceRange: ISourceRange | null;
  //   pushData: any | null;
  // }

  // interface IInstructionMeta {
  //   cost: number;
  //   dynamic: boolean | null;

  //   /**
  //    * stack operations
  //    */
  //   pops: number | null;
  //   pushes: number | null;
  // }

  // interface ISourceRange {
  //   source: ISource | null;
  //   start: any;
  //   length: number;
  //   meta: ISourceRangeMeta;
  // }

  // interface ISourceRangeMeta {
  //   jump: JumpDirection | null;
  // }

  // const enum JumpDirection {
  //   IN = 'IN',
  //   OUT = 'OUT'
  // }

  // interface ILinkReference {
  //   offsets: Array<any>;
  //   length: number;
  // }

  // interface IContractInstance {
  //   address: any;
  //   network: INetwork;
  //   callBytecode: IBytecode | null;
  //   contractType: IContractType | null;
  //   transactionHash: any | null;
  //   constructorArgs: Array<any | null> | null;
  //   linkValues: Array<ILinkValue | null> | null;
  // }

  // interface INetwork {
  //   name: string | null;
  //   networkID: any | null;
  // }

  // interface ILinkValue {
  //   linkReference: ILinkReference;
  //   value: any | null;
  // }

  // interface IWorkspaceQuery {
  //   contractNames: Array<string | null>;
  //   contractType: IContractType | null;
  //   source: ISource | null;
  //   bytecode: IBytecode | null;
  // }

  // interface IContractTypeOnWorkspaceQueryArguments {
  //   name: string;
  // }

  // interface ISourceOnWorkspaceQueryArguments {
  //   id: string;
  // }

  // interface IBytecodeOnWorkspaceQueryArguments {
  //   id: string;
  // }

  // interface IMutation {
  //   workspace: IWorkspaceMutation;
  // }

  // interface IWorkspaceMutation {
  //   addContractName: string;
  //   addContractType: string;
  //   addSource: string;
  //   addBytecode: string;
  // }

  // interface IAddContractNameOnWorkspaceMutationArguments {
  //   name: string;
  // }

  // interface IAddContractTypeOnWorkspaceMutationArguments {
  //   name: string;
  //   abi: string;
  //   createBytecode?: string | null;
  // }

  // interface IAddSourceOnWorkspaceMutationArguments {
  //   contents: string;
  //   sourcePath?: string | null;
  //   ast?: any | null;
  // }

  // interface IAddBytecodeOnWorkspaceMutationArguments {
  //   bytes: any;
  // }

  // type AbiItem =
  //   | IEvent
  //   | IConstructorFunction
  //   | IFallbackFunction
  //   | INormalFunction;

  // interface IEvent {
  //   type: ItemType;
  //   name: string;
  //   inputs: Array<IEventParameter>;
  //   anonymous: boolean;
  // }

  // const enum ItemType {
  //   event = 'event',
  //   function = 'function',
  //   constructor = 'constructor',
  //   fallback = 'fallback'
  // }

  // interface IEventParameter {
  //   name: string;
  //   type: string;
  //   indexed: boolean;
  // }

  // interface IConstructorFunction {
  //   type: ItemType;
  //   inputs: Array<IParameter>;
  //   stateMutability: StateMutability;
  //   constant: boolean | null;
  //   payable: boolean | null;
  // }

  // interface IParameter {
  //   name: string;
  //   type: string;
  // }

  // const enum StateMutability {
  //   pure = 'pure',
  //   view = 'view',
  //   nonpayable = 'nonpayable',
  //   payable = 'payable'
  // }

  // interface IFallbackFunction {
  //   type: ItemType;
  //   stateMutability: StateMutability;
  //   constant: boolean | null;
  //   payable: boolean | null;
  // }

  // interface INormalFunction {
  //   type: ItemType;
  //   name: string;
  //   inputs: Array<IParameter>;
  //   outputs: Array<IParameter> | null;
  //   stateMutability: StateMutability;
  //   constant: boolean | null;
  //   payable: boolean | null;
  // }
}

// tslint:enable
