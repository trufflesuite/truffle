import React, {FC, useState} from 'react';
import AccountDetails from "../AccountDetails";
import HeadlessUiModal from "src/components/Modal/HeadlessUIModal";

interface WalletModal {
  pendingTransactions: string[] // hashes of pending
  confirmedTransactions: string[] // hashes of confirmed
  ENSName?: string
}

const WalletModal: FC<WalletModal> = ({pendingTransactions, confirmedTransactions, ENSName}) => {

    const [showModal, setShowModal] = useState(false);

    const toggleWalletModal = () => setShowModal(false);

    return (<>

      <HeadlessUiModal.Controlled isOpen={showModal} onDismiss={toggleWalletModal} maxWidth="md">
        <AccountDetails
          toggleWalletModal={toggleWalletModal}
          pendingTransactions={pendingTransactions}
          confirmedTransactions={confirmedTransactions}
          ENSName={ENSName}
          openOptions={() => console.log("openOptions")}
        />
      </HeadlessUiModal.Controlled>


      <button
        className="bg-pink-500 text-white active:bg-pink-600 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
        type="button" onClick={() => setShowModal(true)}> Open regular modal
      </button>
      {/*{showModal ? (<>*/}
      {/*  <div*/}
      {/*    className="justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none">*/}
      {/*    <div className="relative w-auto my-6 mx-auto max-w-3xl">*/}
      {/*      <div*/}
      {/*        className="border-0 rounded-lg shadow-lg relative flex flex-col w-full bg-white outline-none focus:outline-none">                /!*header*!/*/}
      {/*        <div className="flex items-start justify-between p-5 border-b border-solid border-blueGray-200 rounded-t">*/}
      {/*          <h3 className="text-3xl font-semibold"> Modal Title </h3>*/}
      {/*          <button*/}
      {/*            className="p-1 ml-auto bg-transparent border-0 text-black opacity-5 float-right text-3xl leading-none font-semibold outline-none focus:outline-none"*/}
      {/*            onClick={() => setShowModal(false)}><span*/}
      {/*            className="bg-transparent text-black opacity-5 h-6 w-6 text-2xl block outline-none focus:outline-none">                      ×                    </span>*/}
      {/*          </button>*/}
      {/*        </div>*/}
      {/*        /!*body*!/*/}
      {/*        <div className="relative p-6 flex-auto"><p className="my-4 text-blueGray-500 text-lg leading-relaxed"> I*/}
      {/*          always felt like I could do anything. That’s the main thing people are controlled by! Thoughts- their*/}
      {/*          perception of themselves! They're slowed down by their perception of themselves. If you're taught you*/}
      {/*          can’t do anything, you won’t do anything. I was taught I could do everything. </p></div>*/}
      {/*        /!*footer*!/*/}
      {/*        <div className="flex items-center justify-end p-6 border-t border-solid border-blueGray-200 rounded-b">*/}
      {/*          <button*/}
      {/*            className="text-red-500 background-transparent font-bold uppercase px-6 py-2 text-sm outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"*/}
      {/*            type="button" onClick={() => setShowModal(false)}> Close*/}
      {/*          </button>*/}
      {/*          <button*/}
      {/*            className="bg-emerald-500 text-white active:bg-emerald-600 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"*/}
      {/*            type="button" onClick={() => setShowModal(false)}> Save Changes*/}
      {/*          </button>*/}
      {/*        </div>*/}
      {/*      </div>*/}
      {/*    </div>*/}
      {/*  </div>*/}
      {/*  <div className="opacity-25 fixed inset-0 z-40 bg-black"/>*/}
      {/*</>) : null}*/}
    </>);
};

export default WalletModal;
