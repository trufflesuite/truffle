import { IResolvers } from "graphql-tools";
import { IContext, IProject } from "./interface";

export const resolvers: IResolvers = {
  Query: {
    truffleProject: () => {
      return true
    }
  },

  Project: {
    contractType: (_, { name }, context: IContext):
      DataModel.IQuery["truffleProject"]["contractType"] =>
    {
      return context.project.resolveType(name);
    },

    contractInstance: (_, { name, networkId }, context: IContext ):
      DataModel.IQuery["truffleProject"]["contractInstance"] =>
    {
      return context.project.resolveInstance(name, networkId);
    }
  },

  Bytecode: {
    instructions: ({ bytes, sourceMap }, _, context: IContext) => {
      return context.Bytecode.instructions(bytes, sourceMap);
    }
  }
};
