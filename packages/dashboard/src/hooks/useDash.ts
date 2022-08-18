import { useContext } from "react";
import { DashContext } from "src/contexts/DashContext";

const useDash = () => useContext(DashContext);

export default useDash;
