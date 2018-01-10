import { createSelector, createStructuredSelector } from "reselect";

import evm from "../evm/selectors";
import solidity from "../solidity/selectors";

let nextStep = createStructuredSelector({
  evm: evm.nextStep,
  solidity: solidity.nextStep
});
nextStep.evm = evm.nextStep;
nextStep.solidity = solidity.nextStep;

export default nextStep;
