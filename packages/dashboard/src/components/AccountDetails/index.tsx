/* eslint-disable @typescript-eslint/no-unused-vars */
import {FC, useMemo} from "react";
import {useAccount, useConnect} from "wagmi";
import {HeadlessUiModal} from 'src/components/Modal';
import {shortenAddress} from "../../utils/utils";
import Button from "../common/Button";

interface AccountDetailsProps {
  toggleWalletModal: () => void
  pendingTransactions: string[]
  confirmedTransactions: string[]
  ENSName?: string
  openOptions: () => void
  onDisconnect: () => void
}

const AccountDetails: FC<AccountDetailsProps> = ({
                                                   toggleWalletModal,
                                                   pendingTransactions,
                                                   confirmedTransactions,
                                                   ENSName,
                                                   openOptions,
                                                   onDisconnect
                                                 }) => {

  const [{data: accountData}] = useAccount({fetchEns: true});
  const [{data: connectData}] = useConnect();

  const connectorName = useMemo(() => {
    // const {ethereum} = window;
    // const isMetaMask = !!(ethereum && ethereum.isMetaMask);
    // console.log("Providers: ", {conn: connectData.connector, ethereum});
    const name = connectData.connector?.name;
    return (
      <div> Connected with {name} </div>
    );
  }, [connectData.connector]);

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        <HeadlessUiModal.Header header={`Account`} onClose={toggleWalletModal}/>
        <HeadlessUiModal.BorderedContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            {connectorName}
            <Button onClick={onDisconnect} text={'disconnect'} variant={"sm"}/>
          </div>
          <div id="web3-account-identifier-row" className="flex flex-col justify-center gap-4">
            <div className="flex items-center gap-4">
              <div className="overflow-hidden rounded-full">
              </div>
              {ENSName ? ENSName : accountData?.address && shortenAddress(accountData?.address)}
            </div>
            {/*    <div className="flex items-center gap-2 space-x-3">*/}
            {/*      {chainId && account && (*/}
            {/*        <ExternalLink*/}
            {/*          color="blue"*/}
            {/*          startIcon={<LinkIcon size={16} />}*/}
            {/*          href={getExplorerLink(chainId, ENSName || account, 'address')}*/}
            {/*        >*/}
            {/*          <Typography variant="xs" weight={700}>*/}
            {/*            {i18n._(t`View on explorer`)}*/}
            {/*          </Typography>*/}
            {/*        </ExternalLink>*/}
            {/*      )}*/}
            {/*      {account && (*/}
            {/*        <Copy toCopy={account}>*/}
            {/*          <Typography variant="xs" weight={700}>*/}
            {/*            {i18n._(t`Copy Address`)}*/}
            {/*          </Typography>*/}
            {/*        </Copy>*/}
            {/*      )}*/}
            {/*    </div>*/}
          </div>
        </HeadlessUiModal.BorderedContent>
        {/*<HeadlessUiModal.BorderedContent className="flex flex-col gap-3">*/}
        {/*  <div className="flex items-center justify-between">*/}
        {/*    <Typography variant="xs" weight={700} className="text-secondary">*/}
        {/*      {i18n._(t`Recent Transactions`)}*/}
        {/*    </Typography>*/}
        {/*    <Button variant="outlined" color="blue" size="xs" onClick={clearAllTransactionsCallback}>*/}
        {/*      {i18n._(t`Clear all`)}*/}
        {/*    </Button>*/}
        {/*  </div>*/}
        {/*  <div className="flex flex-col divide-y divide-dark-800">*/}
        {/*    {!!pendingTransactions.length || !!confirmedTransactions.length ? (*/}
        {/*      <>*/}
        {/*        {pendingTransactions.map((el, index) => (*/}
        {/*          <Transaction key={index} hash={el} />*/}
        {/*        ))}*/}
        {/*        {confirmedTransactions.map((el, index) => (*/}
        {/*          <Transaction key={index} hash={el} />*/}
        {/*        ))}*/}
        {/*      </>*/}
        {/*    ) : (*/}
        {/*      <Typography variant="xs" weight={700} className="text-secondary">*/}
        {/*        {i18n._(t`Your transactions will appear here...`)}*/}
        {/*      </Typography>*/}
        {/*    )}*/}
        {/*  </div>*/}
        {/*</HeadlessUiModal.BorderedContent>*/}
      </div>
    </div>
  );
};

export default AccountDetails;
