import {ExternalLinkIcon} from '@heroicons/react/outline';
import {CheckCircleIcon, ExclamationCircleIcon} from '@heroicons/react/solid';
import {getExplorerLink} from 'src/functions/explorer';
import React from 'react';
import ExternalLink from 'src/components/ExternalLink';
import {useNetwork} from "wagmi";

export default function TransactionPopup({
                                           hash,
                                           success,
                                           summary,
                                         }: {
                                           hash: string
                                           success?: boolean
                                           summary?: string
                                         }
) {
  const [{data}] = useNetwork();

  return (
    <div className="flex flex-row w-full flex-nowrap z-[1000] border-solid border-1 border-black">
      <div className="pr-4">
        {success ? <CheckCircleIcon  className="h-10 w-10 text-green"/> :
          <ExclamationCircleIcon className="h-10 w-10 text-red"/>}
      </div>
      <div className="flex flex-col gap-1">
        <div className="font-bold text-white">
          {summary ?? 'Hash: ' + hash.slice(0, 8) + '...' + hash.slice(58, 65)}
        </div>
        {data.chain?.id && hash && (
          <ExternalLink
            className="p-0 text-blue hover:underline md:p-0"
            href={getExplorerLink(data.chain?.id, hash, 'transaction')}
          >
            <div className="flex flex-row items-center gap-1">
              View on explorer <ExternalLinkIcon width={20} height={20}/>
            </div>
          </ExternalLink>
        )}
      </div>
    </div>
  );
}
