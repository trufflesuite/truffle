// get the list of active popups
import {toast} from "react-toastify";
import TransactionPopup from "src/components/Popups/TransactionPopup";

export function sendToast(txHash: string, success?: boolean, summary?: string): void {
  toast(<TransactionPopup hash={txHash} success={success} summary={summary}/>, {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: false,
    progress: undefined,
  });

}

