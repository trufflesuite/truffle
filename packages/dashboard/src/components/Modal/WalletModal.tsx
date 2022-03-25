import React, {FC, useEffect, useState} from 'react';
import AccountDetails from "../AccountDetails";
import HeadlessUiModal from "src/components/Modal/HeadlessUIModal";
import {useAccount, useConnect} from "wagmi";
import {shortenAddress} from "../../utils/utils";

interface WalletModal {
  pendingTransactions: string[] // hashes of pending
  confirmedTransactions: string[] // hashes of confirmed
  onDisconnect: () => void
}

const WalletModal: FC<WalletModal> = ({pendingTransactions, confirmedTransactions, onDisconnect}) => {
  const [showModal, setShowModal] = useState(false);
  const [displayAddress, setDisplayAddress] = useState<string | undefined>(undefined);
  const toggleWalletModal = () => setShowModal(false);
  const [{data}] = useConnect();
  const [{data: accountData}] = useAccount({fetchEns: true});


  useEffect(() => {
    // get the values
    if(accountData?.ens){
      setDisplayAddress(accountData?.ens.name);
    }else if(accountData?.address){
      setDisplayAddress(shortenAddress(accountData?.address));
    } else {
      setDisplayAddress(undefined);
    }
  },[accountData]);


  return (<>
    <HeadlessUiModal.Controlled isOpen={showModal} onDismiss={toggleWalletModal} maxWidth="md">
      {!data.connected &&
          <>
            <div className="space-y-3">
              <div className="space-y-3">
                <HeadlessUiModal.Header header={`Account`} onClose={toggleWalletModal}/>
                <HeadlessUiModal.BorderedContent className="flex justify-center">
                  <div>Please connect your wallet from the main page.</div>
                </HeadlessUiModal.BorderedContent>
              </div>
            </div>
          </>
      }

      {data.connected &&
          <AccountDetails
              toggleWalletModal={toggleWalletModal}
              pendingTransactions={pendingTransactions}
              confirmedTransactions={confirmedTransactions}
              openOptions={() => console.log("openOptions")}
              onDisconnect={onDisconnect}
          />}
    </HeadlessUiModal.Controlled>

    {data.connected &&
        <button
            className="bg-truffle-blue text-black active:bg-red font-bold uppercase text-sm px-2 py-1 rounded-xl shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
            type="button" onClick={() => setShowModal(true)}> {displayAddress}
        </button>
    }
  </>);
};

export default WalletModal;
