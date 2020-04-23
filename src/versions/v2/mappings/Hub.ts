import { Address } from '@graphprotocol/graph-ts';
import { Event, Fund, Version } from '../generated/schema';
import { ensureFund } from '../entities/Fund';
import { trackFundEvent } from '../entities/Event';
import {
  FundShutDown,
  LogForbid,
  LogPermit,
  LogSetAuthority,
  LogSetOwner,
} from '../generated/templates/v2/HubContract/HubContract';

export function handleFundShutDown(event: FundShutDown): void {
  let fund = ensureFund(event.address);
  fund.active = false;
  fund.save();

  trackFundEvent('FundShutDown', event, fund);
}

export function handleLogForbid(event: LogForbid): void {
  // trackFundEvent('LogForbid', event, event.address);
  let fund = ensureFund(event.address);
}

export function handleLogPermit(event: LogPermit): void {
  // trackFundEvent('LogPermit', event, event.address);
  let fund = ensureFund(event.address);
}

export function handleLogSetAuthority(event: LogSetAuthority): void {
  // trackFundEvent('LogSetAuthority', event, event.address);
  let fund = ensureFund(event.address);
}

export function handleLogSetOwner(event: LogSetOwner): void {
  // trackFundEvent('LogSetOwner', event, event.address);
  let fund = ensureFund(event.address);
}