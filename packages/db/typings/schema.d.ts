// tslint-disable
// graphql typescript definitions

/**
 * @category Primary
 */
declare namespace _DataModel {
  interface GraphQlResponseRoot {
    data?: Query | Mutation;
    errors?: Array<GraphQlResponseError>;
  }

  interface GraphQlResponseError {
    /** Required for all errors */
    message: string;
    locations?: Array<GraphQlResponseErrorLocation>;
    /** 7.2.2 says 'GraphQL servers may provide additional entries to error' */
    [propName: string]: any;
  }

  interface GraphQlResponseErrorLocation {
    line: number;
    column: number;
  }

  /**
   * @category Schema Root
   */
  interface Query {
    sources: Array<Source | null>;
    source: Source | null;
    sourceId: string;
    bytecodes: Array<Bytecode | null>;
    bytecode: Bytecode | null;
    bytecodeId: string;
    compilations: Array<Compilation | null>;
    compilation: Compilation | null;
    compilationId: string;
    contracts: Array<Contract | null>;
    contract: Contract | null;
    contractId: string;
    contractInstances: Array<ContractInstance | null>;
    contractInstance: ContractInstance | null;
    contractInstanceId: string;
    networks: Array<Network | null>;
    network: Network | null;
    networkId: string;
    nameRecords: Array<NameRecord | null>;
    nameRecord: NameRecord | null;
    nameRecordId: string;
    projects: Array<Project | null>;
    project: Project | null;
    projectId: string;
    projectNames: Array<ProjectName | null>;
    projectName: ProjectName | null;
    projectNameId: string;
    networkGenealogies: Array<NetworkGenealogy | null>;
    networkGenealogy: NetworkGenealogy | null;
    networkGenealogyId: string;
  }

  interface SourcesOnQueryArguments {
    filter?: QueryFilter | null;
  }

  interface SourceOnQueryArguments {
    id: string;
  }

  interface SourceIdOnQueryArguments {
    input: SourceInput;
  }

  interface BytecodesOnQueryArguments {
    filter?: QueryFilter | null;
  }

  interface BytecodeOnQueryArguments {
    id: string;
  }

  interface BytecodeIdOnQueryArguments {
    input: BytecodeInput;
  }

  interface CompilationsOnQueryArguments {
    filter?: QueryFilter | null;
  }

  interface CompilationOnQueryArguments {
    id: string;
  }

  interface CompilationIdOnQueryArguments {
    input: CompilationInput;
  }

  interface ContractsOnQueryArguments {
    filter?: QueryFilter | null;
  }

  interface ContractOnQueryArguments {
    id: string;
  }

  interface ContractIdOnQueryArguments {
    input: ContractInput;
  }

  interface ContractInstancesOnQueryArguments {
    filter?: QueryFilter | null;
  }

  interface ContractInstanceOnQueryArguments {
    id: string;
  }

  interface ContractInstanceIdOnQueryArguments {
    input: ContractInstanceInput;
  }

  interface NetworksOnQueryArguments {
    filter?: QueryFilter | null;
  }

  interface NetworkOnQueryArguments {
    id: string;
  }

  interface NetworkIdOnQueryArguments {
    input: NetworkInput;
  }

  interface NameRecordsOnQueryArguments {
    filter?: QueryFilter | null;
  }

  interface NameRecordOnQueryArguments {
    id: string;
  }

  interface NameRecordIdOnQueryArguments {
    input: NameRecordInput;
  }

  interface ProjectsOnQueryArguments {
    filter?: QueryFilter | null;
  }

  interface ProjectOnQueryArguments {
    id: string;
  }

  interface ProjectIdOnQueryArguments {
    input: ProjectInput;
  }

  interface ProjectNamesOnQueryArguments {
    filter?: QueryFilter | null;
  }

  interface ProjectNameOnQueryArguments {
    id: string;
  }

  interface ProjectNameIdOnQueryArguments {
    input: ProjectNameInput;
  }

  interface NetworkGenealogiesOnQueryArguments {
    filter?: QueryFilter | null;
  }

  interface NetworkGenealogyOnQueryArguments {
    id: string;
  }

  interface NetworkGenealogyIdOnQueryArguments {
    input: NetworkGenealogyInput;
  }

  /**
   * @category Schema Root
   */
  interface Mutation {
    sourcesAdd: SourcesAddPayload;
    bytecodesAdd: BytecodesAddPayload;
    compilationsAdd: CompilationsAddPayload;
    contractsAdd: ContractsAddPayload;
    contractInstancesAdd: ContractInstancesAddPayload;
    networksAdd: NetworksAddPayload;
    nameRecordsAdd: NameRecordsAddPayload;
    projectsAdd: ProjectsAddPayload;
    projectNamesAssign: ProjectNamesAssignPayload;
    networkGenealogiesAdd: NetworkGenealogiesAddPayload;
  }

  interface SourcesAddOnMutationArguments {
    input: SourcesAddInput;
  }

  interface BytecodesAddOnMutationArguments {
    input: BytecodesAddInput;
  }

  interface CompilationsAddOnMutationArguments {
    input: CompilationsAddInput;
  }

  interface ContractsAddOnMutationArguments {
    input: ContractsAddInput;
  }

  interface ContractInstancesAddOnMutationArguments {
    input: ContractInstancesAddInput;
  }

  interface NetworksAddOnMutationArguments {
    input: NetworksAddInput;
  }

  interface NameRecordsAddOnMutationArguments {
    input: NameRecordsAddInput;
  }

  interface ProjectsAddOnMutationArguments {
    input: ProjectsAddInput;
  }

  interface ProjectNamesAssignOnMutationArguments {
    input: ProjectNamesAssignInput;
  }

  interface NetworkGenealogiesAddOnMutationArguments {
    input: NetworkGenealogiesAddInput;
  }

  interface ResourceReferenceInput {
    id: string;
  }

  interface ResourceNameInput {
    name: string;
  }

  interface TypedResourceReferenceInput {
    id: string;
    type: string;
  }

  interface QueryFilter {
    ids: Array<string | null>;
  }

  /**
   * @category Resource
   */
  interface Source {
    sourcePath: string | null;
    contents: string;
    id: string;
    type: string;
  }

  /**
   * @category Resource Input
   */
  interface SourceInput {
    contents: string;
    sourcePath?: string | null;
  }

  interface SourcesAddInput {
    sources: Array<SourceInput | null>;
  }

  interface SourcesAddPayload {
    sources: Array<Source | null>;
  }

  /**
   * @category Resource
   */
  interface Bytecode {
    bytes: any;
    linkReferences: Array<LinkReference> | null;
    instructions: Array<Instruction> | null;
    id: string;
    type: string;
  }

  interface InstructionsOnBytecodeArguments {
    count?: number | null;
  }

  interface LinkReference {
    offsets: Array<any>;
    name: string | null;
    length: number;
  }

  interface Instruction {
    opcode: string;
    programCounter: number;
    pushData: any | null;
  }

  /**
   * @category Resource Input
   */
  interface BytecodeInput {
    bytes: any;
    linkReferences?: Array<LinkReferenceInput> | null;
  }

  interface LinkReferenceInput {
    offsets: Array<number>;
    name?: string | null;
    length: number;
  }

  interface BytecodesAddInput {
    bytecodes: Array<BytecodeInput | null>;
  }

  interface BytecodesAddPayload {
    bytecodes: Array<Bytecode | null>;
  }

  /**
   * @category Resource
   */
  interface Compilation {
    compiler: Compiler;
    sources: Array<Source | null>;
    processedSources: Array<ProcessedSource | null>;
    sourceMaps: Array<SourceMap | null> | null;
    contracts: Array<Contract | null>;
    immutableReferences: Array<ImmutableReference | null>;
    id: string;
    type: string;
  }

  interface ImmutableReference {
    astNode: string;
    bytecode: Bytecode;
    length: number;
    offsets: Array<any>;
  }

  interface ImmutableReferenceInput {
    astNode: string;
    bytecode: ResourceReferenceInput;
    length: number;
    offsets: Array<any>;
  }

  interface Compiler {
    name: string;
    version: string;
    settings: any | null;
  }

  interface ProcessedSource {
    source: Source;
    contracts: Array<Contract> | null;
    ast: Ast | null;
    language: string;
  }

  interface Ast {
    json: string;
  }

  interface SourceMap {
    bytecode: Bytecode;
    data: string;
  }

  /**
   * @category Resource Input
   */
  interface CompilationInput {
    compiler: CompilerInput;
    processedSources: Array<ProcessedSourceInput | null>;
    sources: Array<ResourceReferenceInput | null>;
    sourceMaps?: Array<SourceMapInput | null> | null;
    immutableReferences?: Array<ImmutableReferenceInput | null> | null;
  }

  interface CompilerInput {
    name: string;
    version: string;
    settings?: any | null;
  }

  interface ProcessedSourceInput {
    source?: ResourceReferenceInput | null;
    ast?: AstInput | null;
    language: string;
  }

  interface AstInput {
    json: string;
  }

  interface SourceMapInput {
    bytecode: ResourceReferenceInput;
    data: string;
  }

  interface CompilationsAddInput {
    compilations: Array<CompilationInput | null>;
  }

  interface CompilationsAddPayload {
    compilations: Array<Compilation | null>;
  }

  /**
   * @category Resource
   */
  interface Contract {
    name: string;
    abi: Abi | null;
    compilation: Compilation | null;
    processedSource: ProcessedSource | null;
    createBytecode: Bytecode | null;
    callBytecode: Bytecode | null;
    callBytecodeGeneratedSources: Array<ProcessedSource | null> | null;
    createBytecodeGeneratedSources: Array<ProcessedSource | null> | null;
    id: string;
    type: string;
  }

  interface Abi {
    json: string;
  }

  /**
   * @category Resource Input
   */
  interface ContractInput {
    name: string;
    abi?: AbiInput | null;
    compilation?: ResourceReferenceInput | null;
    processedSource?: IndexReferenceInput | null;
    createBytecode?: ResourceReferenceInput | null;
    callBytecode?: ResourceReferenceInput | null;
    callBytecodeGeneratedSources?: Array<ProcessedSourceInput | null> | null;
    createBytecodeGeneratedSources?: Array<ProcessedSourceInput | null> | null;
  }

  interface IndexReferenceInput {
    index: number;
  }

  interface AbiInput {
    json: string;
  }

  const enum StateMutability {
    pure = "pure",
    view = "view",
    nonpayable = "nonpayable",
    payable = "payable"
  }

  interface FunctionEntry {
    type: string;
    name: string;
    inputs: Array<Parameter | null>;
    outputs: Array<Parameter | null>;
    stateMutability: StateMutability;
  }

  interface ConstructorEntry {
    type: string;
    inputs: Array<Parameter | null>;
    stateMutability: StateMutability;
  }

  interface FallbackEntry {
    type: string;
    stateMutability: StateMutability;
  }

  interface ReceiveEntry {
    type: string;
    stateMutability: StateMutability;
  }

  interface EventEntry {
    type: string;
    name: string;
    inputs: Array<EventParameter | null>;
    anonymous: boolean;
  }

  interface Parameter {
    name: string;
    type: string;
    components: Array<Parameter | null> | null;
    internalType: string | null;
  }

  interface EventParameter {
    name: string;
    type: string;
    components: Array<Parameter | null> | null;
    internalType: string | null;
    indexed: boolean;
  }

  interface ContractsAddInput {
    contracts: Array<ContractInput | null>;
  }

  interface ContractsAddPayload {
    contracts: Array<Contract | null>;
  }

  /**
   * @category Resource
   */
  interface ContractInstance {
    address: any;
    network: Network;
    creation: ContractInstanceCreation | null;
    callBytecode: LinkedBytecode;
    contract: Contract | null;
    id: string;
    type: string;
  }

  interface ContractInstanceCreation {
    transactionHash: any | null;
    constructor: Constructor | null;
  }

  interface Constructor {
    createBytecode: LinkedBytecode | null;
    calldata: any | null;
  }

  interface LinkedBytecode {
    bytecode: Bytecode;
    linkValues: Array<LinkValue | null>;
  }

  interface LinkValue {
    linkReference: LinkReference;
    value: any | null;
  }

  /**
   * @category Resource Input
   */
  interface ContractInstanceInput {
    address: any;
    network?: ResourceReferenceInput | null;
    creation?: ContractInstanceCreationInput | null;
    contract?: ResourceReferenceInput | null;
    callBytecode?: LinkedBytecodeInput | null;
  }

  interface ContractInstanceCreationInput {
    transactionHash?: any | null;
    constructor: ConstructorInput;
  }

  interface ConstructorInput {
    createBytecode: LinkedBytecodeInput;
  }

  interface LinkedBytecodeInput {
    bytecode?: ResourceReferenceInput | null;
    linkValues?: Array<LinkValueInput | null> | null;
  }

  interface LinkValueInput {
    value: any;
    linkReference: LinkValueLinkReferenceInput;
  }

  interface LinkValueLinkReferenceInput {
    bytecode: ResourceReferenceInput;
    index?: number | null;
  }

  interface ContractInstancesAddInput {
    contractInstances: Array<ContractInstanceInput | null>;
  }

  interface ContractInstancesAddPayload {
    contractInstances: Array<ContractInstance | null>;
  }

  /**
   * @category Resource
   */
  interface Network {
    name: string;
    networkId: any;
    historicBlock: Block;
    genesis: Network;
    ancestors: Array<Network>;
    descendants: Array<Network>;
    possibleAncestors: CandidateSearchResult;
    possibleDescendants: CandidateSearchResult;
    id: string;
    type: string;
  }

  interface AncestorsOnNetworkArguments {
    limit?: number | null;
    minimumHeight?: number | null;
    includeSelf?: boolean | null;
    onlyEarliest?: boolean | null;
    batchSize?: number | null;
  }

  interface DescendantsOnNetworkArguments {
    limit?: number | null;
    maximumHeight?: number | null;
    includeSelf?: boolean | null;
    onlyLatest?: boolean | null;
    batchSize?: number | null;
  }

  interface PossibleAncestorsOnNetworkArguments {
    alreadyTried: Array<string | null>;
    limit?: number | null;
    disableIndex?: boolean | null;
  }

  interface PossibleDescendantsOnNetworkArguments {
    alreadyTried: Array<string | null>;
    limit?: number | null;
    disableIndex?: boolean | null;
  }

  interface Block {
    height: number;
    hash: string;
  }

  /**
   * @category Resource Input
   */
  interface NetworkInput {
    name: string;
    networkId: any;
    historicBlock: BlockInput;
  }

  interface BlockInput {
    height: number;
    hash: string;
  }

  interface CandidateSearchResult {
    networks: Array<Network>;
    alreadyTried: Array<string>;
  }

  interface NetworksAddInput {
    networks: Array<NetworkInput | null>;
  }

  interface NetworksAddPayload {
    networks: Array<Network | null>;
  }

  /**
   * @category Resource
   */
  interface NameRecord {
    previous: NameRecord | null;
    history: Array<NameRecord | null>;
    id: string;
    type: string;
  }

  interface HistoryOnNameRecordArguments {
    limit?: number | null;
    includeSelf?: boolean | null;
  }

  /**
   * @category Resource Input
   */
  interface NameRecordInput {
    resource: TypedResourceReferenceInput;
    previous?: ResourceReferenceInput | null;
  }

  interface NameRecordsAddInput {
    nameRecords: Array<NameRecordInput | null>;
  }

  interface NameRecordsAddPayload {
    nameRecords: Array<NameRecord | null>;
  }

  /**
   * @category Resource
   */
  interface Project {
    directory: string;
    contract: Contract | null;
    contracts: Array<Contract>;
    network: Network | null;
    networks: Array<Network>;
    contractInstance: ContractInstance | null;
    contractInstances: Array<ContractInstance>;
    resolve: Array<NameRecord> | null;
    id: string;
    type: string;
  }

  interface ContractOnProjectArguments {
    name: string;
  }

  interface NetworkOnProjectArguments {
    name: string;
  }

  interface ContractInstanceOnProjectArguments {
    contract?: ResourceNameInput | null;
    address?: any | null;
    network: ResourceNameInput;
  }

  interface ContractInstancesOnProjectArguments {
    contract?: ResourceNameInput | null;
    network?: ResourceNameInput | null;
  }

  interface ResolveOnProjectArguments {
    type?: string | null;
    name?: string | null;
  }

  /**
   * @category Resource Input
   */
  interface ProjectInput {
    directory: string;
  }

  interface ProjectsAddInput {
    projects: Array<ProjectInput | null>;
  }

  interface ProjectsAddPayload {
    projects: Array<Project | null>;
  }

  /**
   * @category Resource
   */
  interface ProjectName {
    project: Project;
    key: ProjectNameKey;
    nameRecord: NameRecord;
    id: string;
    type: string;
  }

  interface ProjectNameKey {
    name: string;
    type: string;
  }

  /**
   * @category Resource Input
   */
  interface ProjectNameInput {
    project: ResourceReferenceInput;
    key: ProjectNameKeyInput;
    nameRecord: ResourceReferenceInput;
  }

  interface ProjectNameKeyInput {
    name: string;
    type: string;
  }

  interface ProjectNamesAssignInput {
    projectNames: Array<ProjectNameInput | null>;
  }

  interface ProjectNamesAssignPayload {
    projectNames: Array<ProjectName | null>;
  }

  /**
   * @category Resource
   */
  interface NetworkGenealogy {
    ancestor: Network | null;
    descendant: Network | null;
    id: string;
    type: string;
  }

  /**
   * @category Resource Input
   */
  interface NetworkGenealogyInput {
    ancestor: ResourceReferenceInput;
    descendant: ResourceReferenceInput;
  }

  interface NetworkGenealogiesAddInput {
    networkGenealogies: Array<NetworkGenealogyInput | null>;
  }

  interface NetworkGenealogiesAddPayload {
    networkGenealogies: Array<NetworkGenealogy | null>;
  }
}

// tslint:enable
