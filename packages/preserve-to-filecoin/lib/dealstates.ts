export type DealState = typeof dealstates[number];

// Should match order from go-fil-markets/storagemarket/dealstatus.go
// Comments on deal states are also taken from that file.
export const dealstates = [
  // Unknown means the current status of a deal is undefined
  "StorageDealUnknown",

  // ProposalNotFound is a status returned in responses when the deal itself cannot
  // be located
  "StorageDealProposalNotFound",

  // ProposalRejected is returned by a StorageProvider when it chooses not to accept
  // a DealProposal
  "StorageDealProposalRejected",

  // ProposalAccepted indicates an intent to accept a storage deal proposal
  "StorageDealProposalAccepted",

  // Staged means a deal has been published and data is ready to be put into a sector
  "StorageDealStaged",

  // Sealing means a deal is in a sector that is being sealed
  "StorageDealSealing",

  // Finalizing means a deal is in a sealed sector and we're doing final
  // housekeeping before marking it active
  "StorageDealFinalizing",

  // Active means a deal is in a sealed sector and the miner is proving the data
  // for the deal
  "StorageDealActive",

  // Expired means a deal has passed its final epoch and is expired
  "StorageDealExpired",

  // Slashed means the deal was in a sector that got slashed from failing to prove
  "StorageDealSlashed",

  // Rejecting means the Provider has rejected the deal, and will send a rejection response
  "StorageDealRejecting",

  // Failing means something has gone wrong in a deal. Once data is cleaned up the deal will finalize on
  // Error
  "StorageDealFailing",

  // FundsReserved means we've deposited funds as necessary to create a deal, ready to move forward
  "StorageDealFundsReserved",

  // CheckForAcceptance means the client is waiting for a provider to seal and publish a deal
  "StorageDealCheckForAcceptance",

  // Validating means the provider is validating that deal parameters are good for a proposal
  "StorageDealValidating",

  // AcceptWait means the provider is running any custom decision logic to decide whether or not to accept the deal
  "StorageDealAcceptWait",

  // StartDataTransfer means data transfer is beginning
  "StorageDealStartDataTransfer",

  // Transferring means data is being sent from the client to the provider via the data transfer module
  "StorageDealTransferring",

  // WaitingForData indicates either a manual transfer
  // or that the provider has not received a data transfer request from the client
  "StorageDealWaitingForData",

  // VerifyData means data has been transferred and we are attempting to verify it against the PieceCID
  "StorageDealVerifyData",

  // ReserveProviderFunds means that provider is making sure it has adequate funds for the deal in the StorageMarketActor
  "StorageDealReserveProviderFunds",

  // ReserveClientFunds means that client is making sure it has adequate funds for the deal in the StorageMarketActor
  "StorageDealReserveClientFunds",

  // ProviderFunding means that the provider has deposited funds in the StorageMarketActor and it is waiting
  // to see the funds appear in its balance
  "StorageDealProviderFunding",

  // ClientFunding means that the client has deposited funds in the StorageMarketActor and it is waiting
  // to see the funds appear in its balance
  "StorageDealClientFunding",

  // Publish means the deal is ready to be published on chain
  "StorageDealPublish",

  // Publishing means the deal has been published but we are waiting for it to appear on chain
  "StorageDealPublishing",

  // Error means the deal has failed due to an error, and no further updates will occur
  "StorageDealError",

  // ProviderTransferAwaitRestart means the provider has restarted while data
  // was being transferred from client to provider, and will wait for the client to
  // resume the transfer
  "StorageDealProviderTransferAwaitRestart",

  // ClientTransferRestart means a storage deal data transfer from client to provider will be restarted
  // by the client
  "StorageDealClientTransferRestart",

  // AwaitingPreCommit means a deal is ready and must be pre-committed
  "StorageDealAwaitingPreCommit"
] as const;

export const terminalStates = [
  // go-fil-markets/storagemarket/types.go
  "StorageDealProposalNotFound",
  "StorageDealProposalRejected",
  "StorageDealExpired",
  "StorageDealError"
];
