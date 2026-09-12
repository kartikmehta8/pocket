/**
 * Turning an ERC-20 Transfer log into a record Pocket can reconcile against.
 */

import { Address } from '@graphprotocol/graph-ts';
import { ERC20, Transfer as TransferEvent } from '../generated/Token/ERC20';
import { Token, Transfer } from '../generated/schema';

/**
 * Loads the token entity, creating it on first sight.
 *
 * Symbol and decimals are read from the contract once and then cached as an
 * immutable entity. They do not change, and an eth_call per transfer would
 * dominate indexing time.
 */
function loadToken(address: Address): Token {
  let token = Token.load(address);
  if (token != null) {
    return token;
  }

  token = new Token(address);
  const contract = ERC20.bind(address);

  const symbol = contract.try_symbol();
  token.symbol = symbol.reverted ? 'UNKNOWN' : symbol.value;

  const decimals = contract.try_decimals();
  token.decimals = decimals.reverted ? 18 : decimals.value;

  token.save();
  return token;
}

/**
 * Records one ERC-20 Transfer log.
 *
 * The entity id is the transaction hash plus the log index, so two transfers
 * in one transaction stay distinct instead of overwriting each other.
 */
export function handleTransfer(event: TransferEvent): void {
  const token = loadToken(event.address);

  const id = event.transaction.hash.concatI32(event.logIndex.toI32());
  const transfer = new Transfer(id);
  transfer.transaction = event.transaction.hash;
  transfer.from = event.params.from;
  transfer.to = event.params.to;
  transfer.value = event.params.value;
  transfer.timestamp = event.block.timestamp;
  transfer.token = token.id;
  transfer.save();
}
