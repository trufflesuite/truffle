import {CheckCircleIcon, ExclamationIcon, XCircleIcon} from '@heroicons/react/outline';

import React, {FC} from 'react';
import ExternalLink from "src/components/ExternalLink";
import Loader from "src/components/Loader";
import {useAllTransactions} from "src/context/transactions/hooks";
import {classNames, getExplorerLink} from 'src/functions';
import {useNetwork} from "wagmi";

const Transaction: FC<{ hash: string }> = ({hash}) => {
  const [{data}] = useNetwork();
  const allTransactions = useAllTransactions();

  const tx = allTransactions?.[hash];
  const summary = tx?.summary;
  const pending = !tx?.receipt;
  const success = !pending && tx && (tx.receipt?.status === 1 || typeof tx.receipt?.status === 'undefined');
  const cancelled = tx?.receipt && tx.receipt.status === 1337;

  if (!data.chain?.id) return null;

  return (
    <div className="flex flex-col w-full py-1">
      <ExternalLink href={getExplorerLink(data.chain?.id, hash, 'transaction') || "href://blah"}
                    className="flex items-center gap-2">
        <div
          className={classNames(
            pending ? 'text-black' : success ? 'text-green' : cancelled ? 'text-red' : 'text-red'
          )}
        >
          {pending ? (
            <Loader />
          ) : success ? (
            <CheckCircleIcon width={16} height={16}/>
          ) : cancelled ? (
            <XCircleIcon width={16} height={16}/>
          ) : (
            <ExclamationIcon width={16} height={16}/>
          )}
        </div>
        <div>          {summary ?? hash}        </div>
      </ExternalLink>
    </div>
  );
};

export default Transaction;
