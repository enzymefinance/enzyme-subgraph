import { BigDecimal, dataSource } from '@graphprotocol/graph-ts';
import { ensureInvestor, useAccount } from '../entities/Account';
import { useAsset } from '../entities/Asset';
import { trackCalculationState } from '../entities/CalculationState';
import { ensureContract, useContract } from '../entities/Contract';
import { useFund } from '../entities/Fund';
import { ensureInvestment } from '../entities/Investment';
import { trackPortfolioState } from '../entities/PortfolioState';
import { trackShareState } from '../entities/ShareState';
import { ensureTransaction } from '../entities/Transaction';
import {
  MigratedSharesDuePaid,
  OverridePauseSet,
  SharesBought,
  SharesRedeemed,
  VaultProxySet,
} from '../generated/ComptrollerLibContract';
import {
  Asset,
  MigratedSharesDuePaidEvent,
  OverridePauseSetEvent,
  SharesBoughtEvent,
  SharesRedeemedEvent,
  VaultProxySetEvent,
} from '../generated/schema';
import { genericId } from '../utils/genericId';
import { toBigDecimal } from '../utils/toBigDecimal';

export function handleSharesBought(event: SharesBought): void {
  let fund = useFund(dataSource.context().getString('vaultProxy'));
  let investor = ensureInvestor(event.params.buyer, event);
  let investment = ensureInvestment(investor, fund);
  let asset = useAsset(fund.denominationAsset);
  let shares = toBigDecimal(event.params.sharesReceived);

  let addition = new SharesBoughtEvent(genericId(event));
  addition.account = investment.investor;
  addition.investor = investment.investor;
  addition.fund = investment.fund;
  addition.contract = ensureContract(event.address, 'ComptrollerLib').id;
  addition.investment = investment.id;
  addition.asset = asset.id;
  addition.investmentAmount = toBigDecimal(event.params.investmentAmount, asset.decimals);
  addition.sharesBought = toBigDecimal(event.params.sharesBought);
  addition.shares = shares;
  addition.timestamp = event.block.timestamp;
  addition.transaction = ensureTransaction(event).id;
  addition.save();

  investment.shares = investment.shares.plus(shares);
  investment.save();

  trackPortfolioState(fund, event, addition);
  trackShareState(fund, [investor], event, addition);
  trackCalculationState(fund, event, addition);
}

export function handleSharesRedeemed(event: SharesRedeemed): void {
  let fund = useFund(dataSource.context().getString('vaultProxy'));
  let investor = ensureInvestor(event.params.redeemer, event);
  let investment = ensureInvestment(investor, fund);
  let shares = toBigDecimal(event.params.sharesQuantity);
  let assets = event.params.receivedAssets.map<Asset>((id) => useAsset(id.toHex()));
  let qtys = event.params.receivedAssetQuantities;

  let quantities: BigDecimal[] = new Array<BigDecimal>();
  for (let i: i32 = 0; i < assets.length; i++) {
    quantities = quantities.concat([toBigDecimal(qtys[i], assets[i].decimals)]);
  }

  let redemption = new SharesRedeemedEvent(genericId(event));
  redemption.account = investor.id;
  redemption.investor = investor.id;
  redemption.fund = investment.fund;
  redemption.contract = ensureContract(event.address, 'ComptrollerLib').id;
  redemption.investment = investment.id;
  redemption.shares = shares;
  redemption.payoutAssets = assets.map<string>((item) => item.id);
  redemption.payoutQuantities = quantities;
  redemption.timestamp = event.block.timestamp;
  redemption.transaction = ensureTransaction(event).id;
  redemption.save();

  investment.shares = investment.shares.minus(shares);
  investment.save();

  trackPortfolioState(fund, event, redemption);
  trackShareState(fund, [investor], event, redemption);
  trackCalculationState(fund, event, redemption);
}

export function handleVaultProxySet(event: VaultProxySet): void {
  let vaultProxySet = new VaultProxySetEvent(genericId(event));
  vaultProxySet.fund = event.params.vaultProxy.toHex();
  vaultProxySet.account = useAccount(event.transaction.from.toHex()).id;
  vaultProxySet.contract = ensureContract(event.address, 'ComptrollerLib').id;
  vaultProxySet.timestamp = event.block.timestamp;
  vaultProxySet.transaction = ensureTransaction(event).id;
  vaultProxySet.vaultProxy = event.params.vaultProxy.toHex();
  vaultProxySet.save();
}

export function handleOverridePauseSet(event: OverridePauseSet): void {
  let fund = useFund(dataSource.context().getString('vaultProxy'));
  let account = ensureInvestor(event.transaction.from, event);

  let overridePauseSet = new OverridePauseSetEvent(genericId(event));
  overridePauseSet.fund = fund.id;
  overridePauseSet.account = account.id;
  overridePauseSet.contract = useContract(event.address.toHex()).id;
  overridePauseSet.timestamp = event.block.timestamp;
  overridePauseSet.transaction = ensureTransaction(event).id;
  overridePauseSet.overridePause = event.params.overridePause;
  overridePauseSet.save();
}

export function handleMigratedSharesDuePaid(event: MigratedSharesDuePaid): void {
  let fund = useFund(dataSource.context().getString('vaultProxy'));
  let account = ensureInvestor(event.transaction.from, event);

  let paid = new MigratedSharesDuePaidEvent(genericId(event));
  paid.fund = fund.id;
  paid.account = account.id;
  paid.contract = useContract(event.address.toHex()).id;
  paid.timestamp = event.block.timestamp;
  paid.transaction = ensureTransaction(event).id;
  paid.sharesDue = toBigDecimal(event.params.sharesDue);
  paid.save();
}
