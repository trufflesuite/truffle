/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ExclamationCircleIcon,
  ExternalLinkIcon
} from "@heroicons/react/solid";
import { FC, useMemo } from "react";
import { TransactionList } from "src/components/AccountDetails/TransactionList";
import Button from "src/components/Common/Button";
import ExternalLink from "src/components/ExternalLink";
import { HeadlessUiModal } from "src/components/Modal";
import { getExplorerLink } from "src/functions/explorer";
import { shortenAddress } from "src/utils/utils";
import { useAccount, useConnect, useNetwork } from "wagmi";
import Copy from "./Copy";

interface AccountDetailsProps {
  toggleWalletModal: () => void;
  onDisconnect: () => void;
}

const BlockExplorerLink = ({
  address,
  chainId
}: {
  address: string | undefined;
  chainId: number | undefined;
}) => {
  let explorerLink;
  if (chainId && address) {
    explorerLink = getExplorerLink(chainId, address, "address");
  }
  return (
    <>
      <div className={"flex items-left gap-1 text-xs font-bold"}>
        {explorerLink && (
          <ExternalLink
            color="blue"
            startIcon={<ExternalLinkIcon className={"h-4 w-4"} />}
            href={explorerLink}
          >
            <div className="text-xs font-bold"> View on explorer</div>
          </ExternalLink>
        )}
        {!explorerLink && (
          <>
            <ExclamationCircleIcon className={"h-4 w-4"} />
            No Explorer: {chainId}
          </>
        )}
      </div>
    </>
  );
};

const AccountDetails: FC<AccountDetailsProps> = ({
  toggleWalletModal,
  onDisconnect
}) => {
  const [{ data: accountData }] = useAccount({ fetchEns: true });
  const [{ data: connectData }] = useConnect();
  const [{ data: networkData }] = useNetwork();

  const connectorName = useMemo(() => {
    const name = connectData.connector?.name;
    return <div> Connected with {name} </div>;
  }, [connectData.connector]);

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        <HeadlessUiModal.Header
          header={`Account`}
          onClose={toggleWalletModal}
        />
        <HeadlessUiModal.BorderedContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            {connectorName}
            <Button onClick={onDisconnect} size={"sm"}>
              disconnect
            </Button>
          </div>
          <div
            id="web3-account-identifier-row"
            className="flex flex-col justify-center gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="overflow-hidden rounded-full">
                {accountData?.ens
                  ? accountData?.ens?.name
                  : accountData?.address &&
                    shortenAddress(accountData?.address)}
              </div>
            </div>
            <div className={"flex items-left gap-4"}>
              <BlockExplorerLink
                address={accountData?.ens?.name || accountData?.address}
                chainId={networkData.chain?.id}
              />
              {accountData?.address && (
                <div>
                  <Copy toCopy={accountData.address}>
                    <div className={"text-xs font-bold"}> Copy Address</div>
                  </Copy>
                </div>
              )}
            </div>
          </div>
        </HeadlessUiModal.BorderedContent>
        <HeadlessUiModal.BorderedContent className="flex flex-col gap-3">
          <TransactionList />
        </HeadlessUiModal.BorderedContent>
      </div>
    </div>
  );
};

export default AccountDetails;
