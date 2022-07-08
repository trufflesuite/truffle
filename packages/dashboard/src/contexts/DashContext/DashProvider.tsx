import { DashContext } from "src/contexts/DashContext";

type DashProviderProps = {
  children: React.ReactNode;
};

function DashProvider({ children }: DashProviderProps): JSX.Element {
  return <DashContext.Provider value={{}}>{children}</DashContext.Provider>;
}

export default DashProvider;
