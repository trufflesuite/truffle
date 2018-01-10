import { createStructuredSelector } from "reselect";

const functionDepth = (state, props) => state.solidity.functionDepth;

let solidity = createStructuredSelector({
  functionDepth
});
solidity.functionDepth = functionDepth;

export default solidity;
