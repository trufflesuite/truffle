export let dealstates: Array<string> = [
  // Should match order from go-fil-markets/storagemarket/dealstatus.go
  "ProposalNotFound",
  "ProposalRejected",
  "ProposalAccepted",
  "Staged",
  "Sealing",
  "Active",
  "Expired",
  "Slashed",
  "Failing",
  "FundsEnsured", // Deposited funds as neccesary to create a deal, ready to move forward
  "WaitingForDataRequest",
  "Validating", // Verifying that deal parameters are good
  "AcceptWait",
  "Transferring", // Moving data
  "WaitingForData", // Manual transfer
  "VerifyData", // Verify transferred data - generate CAR / piece data
  "EnsureProviderFunds", // Ensuring that provider collateral is sufficient
  "EnsureClientFunds", // Ensuring that client funds are sufficient
  "ProviderFunding", // Waiting for funds to appear in Provider balance
  "ClientFunding", // Waiting for funds to appear in Client balance
  "Publish", // Publishing deal to chain
  "Publishing", // Waiting for deal to appear on chain
  "Error", // deal failed with an unexpected error
  "Completed" // on provider side, indicates deal is active and info for retrieval is recorded
];

export let terminalStates: Array<string> = [
  // go-fil-markets/storagemarket/types.go
  "ProposalNotFound",
  "ProposalRejected",
  "Expired",
  "Error",
  "Completed"
];
