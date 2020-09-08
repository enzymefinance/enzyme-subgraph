import { logCritical } from '../utils/logCritical';
import { ethereum } from '@graphprotocol/graph-ts';
import { genericId } from '../utils/genericId';
import { Transaction } from '../generated/schema';
import { toBigDecimal } from '../utils/tokenValue';

export function transactionId(tx: ethereum.Transaction): string {
  return tx.hash.toHex();
}

export function useTransaction(id: string): Transaction {
  let transaction = Transaction.load(id);
  if (transaction == null) {
    logCritical('Failed to load transaction {}.', [id]);
  }

  return transaction as Transaction;
}

export function ensureTransaction(event: ethereum.Event): Transaction {
  let id = transactionId(event.transaction);
  let transaction = Transaction.load(id) as Transaction;
  if (transaction) {
    return transaction;
  }

  transaction = new Transaction(id);
  transaction.from = event.transaction.from.toHex();
  transaction.value = toBigDecimal(event.transaction.value);
  transaction.block = event.block.number;
  transaction.timestamp = event.block.timestamp;
  transaction.gasUsed = event.transaction.gasUsed.toI32();
  transaction.gasPrice = toBigDecimal(event.transaction.gasPrice);
  transaction.save();

  return transaction;
}