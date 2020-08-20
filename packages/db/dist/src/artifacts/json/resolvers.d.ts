export interface ITruffleResolver {
  require(name: string): any;
}
interface IContext {
  artifactsDirectory: string;
  workingDirectory?: string;
}
export declare const resolvers: {
  Query: {
    contract: {
      resolve(
        _: any,
        {
          name,
          networkId
        }: {
          name: any;
          networkId: any;
        },
        context: IContext
      ): any;
    };
    contractNames: {
      resolve(_: any, {}: {}, context: IContext): string[];
    };
  };
  ContractObject: {
    networks: {
      resolve({
        networks
      }: {
        networks: any;
      }): {
        networkId: string;
        networkObject: unknown;
      }[];
    };
  };
};
export {};
