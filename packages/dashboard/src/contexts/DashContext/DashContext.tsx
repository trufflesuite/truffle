import { createContext } from "react";
import { stateType, actionType } from "src/contexts/DashContext";

type contextValue = {
  state: stateType;
  dispatch: React.Dispatch<actionType>;
};

const DashContext = createContext<contextValue | null>(null);

export default DashContext;
