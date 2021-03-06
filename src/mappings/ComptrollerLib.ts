import { dataSource } from '@graphprotocol/graph-ts';
import { ensureAccount, ensureInvestor } from '../entities/Account';
import { useAsset } from '../entities/Asset';
import { createAssetAmount } from '../entities/AssetAmount';
import { calculationStateId, trackCalculationState } from '../entities/CalculationState';
import { useFund } from '../entities/Fund';
import { useInvestment } from '../entities/Investment';
import { trackInvestmentState } from '../entities/InvestmentState';
import { trackPortfolioState } from '../entities/PortfolioState';
import { trackShareState } from '../entities/ShareState';
import { ensureTransaction } from '../entities/Transaction';
import {
  MigratedSharesDuePaid,
  OverridePauseSet,
  PreRedeemSharesHookFailed,
  SharesBought,
  SharesRedeemed,
  VaultProxySet,
} from '../generated/ComptrollerLibContract';
import {
  Asset,
  AssetAmount,
  MigratedSharesDuePaidEvent,
  OverridePauseSetEvent,
  PreRedeemSharesHookFailedEvent,
  SharesBoughtEvent,
  SharesRedeemedEvent,
  VaultProxySetEvent,
} from '../generated/schema';
import { genericId } from '../utils/genericId';
import { toBigDecimal } from '../utils/toBigDecimal';

export function handleSharesBought(event: SharesBought): void {
  let fund = useFund(dataSource.context().getString('vaultProxy'));
  let investor = ensureInvestor(event.params.buyer, event);
  let investmentState = trackInvestmentState(investor, fund, event);
  let investment = useInvestment(investor, fund);
  let asset = useAsset(fund.denominationAsset);
  let shares = toBigDecimal(event.params.sharesReceived);

  let addition = new SharesBoughtEvent(genericId(event));
  addition.investor = investment.investor;
  addition.fund = investment.fund;
  addition.type = 'SharesBought';
  addition.investmentState = investmentState.id;
  addition.asset = asset.id;
  addition.investmentAmount = toBigDecimal(event.params.investmentAmount, asset.decimals);
  addition.sharesIssued = toBigDecimal(event.params.sharesIssued);
  addition.shares = shares;
  addition.timestamp = event.block.timestamp;
  addition.transaction = ensureTransaction(event).id;
  addition.calculations = calculationStateId(fund, event);
  addition.fundState = fund.state;
  addition.save();

  trackPortfolioState(fund, event, addition);
  trackShareState(fund, event, addition);
  trackCalculationState(fund, event, addition);
}

export function handleSharesRedeemed(event: SharesRedeemed): void {
  let fund = useFund(dataSource.context().getString('vaultProxy'));
  let investor = ensureInvestor(event.params.redeemer, event);
  let investmentState = trackInvestmentState(investor, fund, event);
  let investment = useInvestment(investor, fund);
  let shares = toBigDecimal(event.params.sharesQuantity);
  let assets = event.params.receivedAssets.map<Asset>((id) => useAsset(id.toHex()));
  let qtys = event.params.receivedAssetQuantities;

  let assetAmounts: AssetAmount[] = new Array<AssetAmount>();
  for (let i: i32 = 0; i < assets.length; i++) {
    let amount = toBigDecimal(qtys[i], assets[i].decimals);
    let assetAmount = createAssetAmount(assets[i], amount, 'redemption', event);
    assetAmounts = assetAmounts.concat([assetAmount]);
  }

  let redemption = new SharesRedeemedEvent(genericId(event));
  redemption.investor = investor.id;
  redemption.fund = investment.fund;
  redemption.type = 'SharesRedeemed';
  redemption.investmentState = investmentState.id;
  redemption.shares = shares;
  redemption.payoutAssetAmounts = assetAmounts.map<string>((assetAmount) => assetAmount.id);
  redemption.timestamp = event.block.timestamp;
  redemption.transaction = ensureTransaction(event).id;
  redemption.calculations = calculationStateId(fund, event);
  redemption.fundState = fund.state;
  redemption.save();

  trackPortfolioState(fund, event, redemption);
  trackShareState(fund, event, redemption);
  trackCalculationState(fund, event, redemption);
}

export function handleVaultProxySet(event: VaultProxySet): void {
  let vaultProxySet = new VaultProxySetEvent(genericId(event));
  vaultProxySet.fund = event.params.vaultProxy.toHex();
  vaultProxySet.timestamp = event.block.timestamp;
  vaultProxySet.transaction = ensureTransaction(event).id;
  vaultProxySet.vaultProxy = event.params.vaultProxy.toHex();
  vaultProxySet.save();
}

export function handleOverridePauseSet(event: OverridePauseSet): void {
  let fund = useFund(dataSource.context().getString('vaultProxy'));

  let overridePauseSet = new OverridePauseSetEvent(genericId(event));
  overridePauseSet.fund = fund.id;
  overridePauseSet.timestamp = event.block.timestamp;
  overridePauseSet.transaction = ensureTransaction(event).id;
  overridePauseSet.overridePause = event.params.overridePause;
  overridePauseSet.save();
}

export function handleMigratedSharesDuePaid(event: MigratedSharesDuePaid): void {
  let fund = useFund(dataSource.context().getString('vaultProxy'));

  let paid = new MigratedSharesDuePaidEvent(genericId(event));
  paid.fund = fund.id;
  paid.timestamp = event.block.timestamp;
  paid.transaction = ensureTransaction(event).id;
  paid.sharesDue = toBigDecimal(event.params.sharesDue);
  paid.save();
}

export function handlePreRedeemSharesHookFailed(event: PreRedeemSharesHookFailed): void {
  let fund = useFund(dataSource.context().getString('vaultProxy'));

  let hookFailed = new PreRedeemSharesHookFailedEvent(genericId(event));
  hookFailed.fund = fund.id;
  hookFailed.timestamp = event.block.timestamp;
  hookFailed.sharesQuantity = toBigDecimal(event.params.sharesQuantity);
  hookFailed.redeemer = ensureAccount(event.params.redeemer, event).id;
  hookFailed.failureReturnData = event.params.failureReturnData.toHexString();
  hookFailed.transaction = ensureTransaction(event).id;
  hookFailed.save();
}
