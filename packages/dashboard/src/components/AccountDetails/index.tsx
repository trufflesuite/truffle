/* eslint-disable @typescript-eslint/no-unused-vars */
import {FC} from "react";
import {useAccount} from "wagmi";
import { HeadlessUiModal } from 'src/components/Modal';

interface AccountDetailsProps {
  toggleWalletModal: () => void
  pendingTransactions: string[]
  confirmedTransactions: string[]
  ENSName?: string
  openOptions: () => void
}

const AccountDetails: FC<AccountDetailsProps> = ({
                                                   toggleWalletModal,
                                                   pendingTransactions,
                                                   confirmedTransactions,
                                                   ENSName,
                                                   openOptions,
                                                 }) => {

  const [{data: accountData}] =useAccount({fetchEns: true});

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        account details goes in here...
        Address: {accountData?.address}
        <HeadlessUiModal.Header header={`Account`} onClose={toggleWalletModal} />
        {/*<HeadlessUiModal.BorderedContent className="flex flex-col gap-3">*/}
        {/*  <div className="flex items-center justify-between">*/}
        {/*    {connectorName}*/}
        {/*    <Button variant="outlined" color="blue" size="xs" onClick={deactivate}>*/}
        {/*      {i18n._(t`Disconnect`)}*/}
        {/*    </Button>*/}
        {/*  </div>*/}
        {/*  <div id="web3-account-identifier-row" className="flex flex-col justify-center gap-4">*/}
        {/*    <div className="flex items-center gap-4">*/}
        {/*      <div className="overflow-hidden rounded-full">*/}
        {/*        <Davatar*/}
        {/*          size={48}*/}
        {/*          // @ts-ignore TYPE NEEDS FIXING*/}
        {/*          address={account}*/}
        {/*          defaultComponent={*/}
        {/*            <Image src="https://app.sushi.com/images/chef.svg" alt="Sushi Chef" width={48} height={48} />*/}
        {/*          }*/}
        {/*          provider={library}*/}
        {/*        />*/}
        {/*      </div>*/}
        {/*      <Typography weight={700} variant="lg" className="text-white">*/}
        {/*        {ENSName ? ENSName : account && shortenAddress(account)}*/}
        {/*      </Typography>*/}
        {/*    </div>*/}
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
        {/*  </div>*/}
        {/*</HeadlessUiModal.BorderedContent>*/}
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
