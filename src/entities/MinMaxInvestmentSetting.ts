import { BigDecimal, BigInt } from '@graphprotocol/graph-ts';
import { Fund, MinMaxInvestmentSetting, Policy } from '../generated/schema';
import { logCritical } from '../utils/logCritical';
import { policySettingId } from './PolicySetting';

export function useMinMaxInvestmentSetting(fund: Fund, policy: Policy): MinMaxInvestmentSetting {
  let id = policySettingId(fund.id, policy);
  let setting = MinMaxInvestmentSetting.load(id) as MinMaxInvestmentSetting;

  if (setting == null) {
    logCritical('Failed to load MinMaxInvestmentSetting {}.', [id]);
  }

  return setting;
}

export function ensureMinMaxInvestmentSetting(fundId: string, policy: Policy): MinMaxInvestmentSetting {
  let id = policySettingId(fundId, policy);
  let setting = MinMaxInvestmentSetting.load(id) as MinMaxInvestmentSetting;

  if (setting) {
    return setting;
  }

  setting = new MinMaxInvestmentSetting(id);
  setting.policy = policy.id;
  setting.fund = fundId;
  setting.minInvestmentAmount = BigDecimal.fromString('0');
  setting.maxInvestmentAmount = BigDecimal.fromString('0');
  setting.events = new Array<string>();
  setting.timestamp = BigInt.fromI32(0);
  setting.enabled = true;
  setting.save();

  return setting;
}
