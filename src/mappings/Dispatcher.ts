import { zeroAddress } from '../constants';
import { ensureManager } from '../entities/Account';
import { useFund } from '../entities/Fund';
import { ensureMigration, generateMigrationId, useMigration } from '../entities/Migration';
import { ensureNetwork } from '../entities/Network';
import { ensureRelease, useRelease } from '../entities/Release';
import { ensureTransaction } from '../entities/Transaction';
import {
  CurrentFundDeployerSet,
  MigrationCancelled,
  MigrationExecuted,
  MigrationInCancelHookFailed,
  MigrationOutHookFailed,
  MigrationSignaled,
  MigrationTimelockSet,
  NominatedOwnerRemoved,
  NominatedOwnerSet,
  OwnershipTransferred,
  SharesTokenSymbolSet,
  VaultProxyDeployed,
} from '../generated/DispatcherContract';
import {
  DispatcherOwnershipTransferredEvent,
  FundDeployerSetEvent,
  MigrationCancelledEvent,
  MigrationExecutedEvent,
  MigrationInCancelHookFailedEvent,
  MigrationOutHookFailedEvent,
  MigrationSignaledEvent,
  MigrationTimelockSetEvent,
  NominatedOwnerRemovedEvent,
  NominatedOwnerSetEvent,
  SharesTokenSymbolSetEvent,
  VaultProxyDeployedEvent,
} from '../generated/schema';
import { genericId } from '../utils/genericId';

export function handleCurrentFundDeployerSet(event: CurrentFundDeployerSet): void {
  // NOTE: This is the first event on kovan.
  let network = ensureNetwork(event);

  // Set up release (each new fund deployer is a release)
  let release = ensureRelease(event.params.nextFundDeployer.toHex(), event);

  network.currentRelease = release.id;
  network.save();

  let fundDeployerSet = new FundDeployerSetEvent(genericId(event));
  fundDeployerSet.timestamp = event.block.timestamp;
  fundDeployerSet.transaction = ensureTransaction(event).id;
  if (event.params.prevFundDeployer != zeroAddress) {
    fundDeployerSet.prevFundDeployer = event.params.prevFundDeployer.toHex();
  }
  fundDeployerSet.nextFundDeployer = event.params.nextFundDeployer.toHex();
  fundDeployerSet.save();

  if (!event.params.prevFundDeployer.equals(zeroAddress)) {
    let prevRelease = useRelease(event.params.prevFundDeployer.toHex());
    prevRelease.current = false;
    prevRelease.close = event.block.timestamp;
    prevRelease.save();
  }
}

export function handleMigrationCancelled(event: MigrationCancelled): void {
  let migrationCancellation = new MigrationCancelledEvent(genericId(event));
  let migrationId = generateMigrationId(
    event.params.vaultProxy.toHex(),
    event.params.prevFundDeployer.toHex(),
    event.params.nextFundDeployer.toHex(),
    event.params.executableTimestamp.toString(),
  );

  let migration = useMigration(migrationId);

  migrationCancellation.fund = useFund(event.params.vaultProxy.toHex()).id;
  migrationCancellation.timestamp = event.block.timestamp;
  migrationCancellation.transaction = ensureTransaction(event).id;
  migrationCancellation.migration = migration.id;
  migrationCancellation.executableTimestamp = event.params.executableTimestamp;
  migrationCancellation.save();

  migration.cancelled = true;
  migration.save();
}

export function handleMigrationExecuted(event: MigrationExecuted): void {
  let migrationExecution = new MigrationExecutedEvent(genericId(event));
  let migrationId = generateMigrationId(
    event.params.vaultProxy.toHex(),
    event.params.prevFundDeployer.toHex(),
    event.params.nextFundDeployer.toHex(),
    event.params.executableTimestamp.toString(),
  );

  let migration = useMigration(migrationId);

  migrationExecution.fund = useFund(event.params.vaultProxy.toHex()).id;
  migrationExecution.timestamp = event.block.timestamp;
  migrationExecution.transaction = ensureTransaction(event).id;
  migrationExecution.migration = migration.id;
  migrationExecution.executableTimestamp = event.params.executableTimestamp;
  migrationExecution.save();

  let fund = useFund(event.params.vaultProxy.toHex());
  fund.release = useRelease(event.params.nextFundDeployer.toHex()).id;
  fund.accessor = migration.nextAccessor;

  migration.executed = true;
  migration.save();
}

export function handleMigrationSignaled(event: MigrationSignaled): void {
  let migrationSignaling = new MigrationSignaledEvent(genericId(event));
  migrationSignaling.fund = useFund(event.params.vaultProxy.toHex()).id;
  migrationSignaling.timestamp = event.block.timestamp;
  migrationSignaling.transaction = ensureTransaction(event).id;
  migrationSignaling.migration = ensureMigration(event).id;
  migrationSignaling.save();
}

export function handleMigrationInCancelHookFailed(event: MigrationInCancelHookFailed): void {
  let cancelHookFailed = new MigrationInCancelHookFailedEvent(genericId(event));
  cancelHookFailed.fund = useFund(event.params.vaultProxy.toHex()).id;
  cancelHookFailed.timestamp = event.block.timestamp;
  cancelHookFailed.transaction = ensureTransaction(event).id;

  cancelHookFailed.prevFundDeployer = event.params.prevFundDeployer.toHex();
  cancelHookFailed.nextFundDeployer = event.params.nextFundDeployer.toHex();
  cancelHookFailed.nextVaultLib = event.params.nextVaultLib.toHex();
  cancelHookFailed.nextVaultAccessor = event.params.nextVaultAccessor.toHex();
  cancelHookFailed.save();
}

export function handleMigrationOutHookFailed(event: MigrationOutHookFailed): void {
  let outHookFailed = new MigrationOutHookFailedEvent(genericId(event));
  outHookFailed.fund = useFund(event.params.vaultProxy.toHex()).id;
  outHookFailed.timestamp = event.block.timestamp;
  outHookFailed.transaction = ensureTransaction(event).id;

  outHookFailed.prevFundDeployer = event.params.prevFundDeployer.toHex();
  outHookFailed.nextFundDeployer = event.params.nextFundDeployer.toHex();
  outHookFailed.nextVaultLib = event.params.nextVaultLib.toHex();
  outHookFailed.nextVaultAccessor = event.params.nextVaultAccessor.toHex();
  outHookFailed.save();
}

export function handleMigrationTimelockSet(event: MigrationTimelockSet): void {
  let timelockSet = new MigrationTimelockSetEvent(genericId(event));
  timelockSet.transaction = ensureTransaction(event).id;
  timelockSet.timestamp = event.block.timestamp;
  timelockSet.prevTimelock = event.params.prevTimelock;
  timelockSet.nextTimelock = event.params.nextTimelock;
  timelockSet.save();
}

export function handleSharesTokenSymbolSet(event: SharesTokenSymbolSet): void {
  let symbolSet = new SharesTokenSymbolSetEvent(genericId(event));
  symbolSet.transaction = ensureTransaction(event).id;
  symbolSet.timestamp = event.block.timestamp;
  symbolSet.sharesTokenSymbol = event.params._nextSymbol;
  symbolSet.save();
}

export function handleNominatedOwnerRemoved(event: NominatedOwnerRemoved): void {
  let ownerRemoved = new NominatedOwnerRemovedEvent(genericId(event));
  ownerRemoved.transaction = ensureTransaction(event).id;
  ownerRemoved.timestamp = event.block.timestamp;
  ownerRemoved.nominatedOwner = event.params.nominatedOwner.toHex();
  ownerRemoved.save();
}

export function handleNominatedOwnerSet(event: NominatedOwnerSet): void {
  let ownerSet = new NominatedOwnerSetEvent(genericId(event));
  ownerSet.transaction = ensureTransaction(event).id;
  ownerSet.timestamp = event.block.timestamp;
  ownerSet.nominatedOwner = event.params.nominatedOwner.toHex();
  ownerSet.save();
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  let transferred = new DispatcherOwnershipTransferredEvent(genericId(event));
  transferred.transaction = ensureTransaction(event).id;
  transferred.timestamp = event.block.timestamp;
  transferred.prevOwner = event.params.prevOwner.toHex();
  transferred.nextOwner = event.params.nextOwner.toHex();
  transferred.save();
}

export function handleVaultProxyDeployed(event: VaultProxyDeployed): void {
  let vaultDeployment = new VaultProxyDeployedEvent(genericId(event));
  vaultDeployment.fund = event.params.vaultProxy.toHex();
  vaultDeployment.timestamp = event.block.timestamp;
  vaultDeployment.transaction = ensureTransaction(event).id;
  vaultDeployment.fundDeployer = event.params.fundDeployer.toHex();
  vaultDeployment.owner = ensureManager(event.params.owner, event).id;
  vaultDeployment.vaultLib = event.params.vaultLib.toHex();
  vaultDeployment.accessor = event.params.vaultAccessor.toHex();
  vaultDeployment.fundName = event.params.fundName;
  vaultDeployment.save();
}
