import React, {FC, useState} from 'react';
import AccountDetails from "../AccountDetails";
import HeadlessUiModal from "src/components/Modal/HeadlessUIModal";
import {useConnect} from "wagmi";

interface WalletModal {
  pendingTransactions: string[] // hashes of pending
  confirmedTransactions: string[] // hashes of confirmed
  ENSName?: string,
  onDisconnect: () => void
}

const WalletModal: FC<WalletModal> = ({pendingTransactions, confirmedTransactions, ENSName, onDisconnect}) => {
  const [showModal, setShowModal] = useState(false);
  const toggleWalletModal = () => setShowModal(false);
  const [{data}] = useConnect();

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
              ENSName={ENSName}
              openOptions={() => console.log("openOptions")}
              onDisconnect={onDisconnect}
          />}
    </HeadlessUiModal.Controlled>


    <button
      className="bg-pink-500 text-white active:bg-pink-600 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
      type="button" onClick={() => setShowModal(true)}> Open regular modal
    </button>
  </>);
};

export default WalletModal;
