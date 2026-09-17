import {verifyContracts} from './settlement.js';
import {verifyExchange} from './orders.js';
import {CHAIN_ID} from './network.js';

// Read only. This checks infrastructure, not wallet compatibility or safety.
export async function checkReadiness(provider, now = Date.now()) {
  const block = await provider.getBlock('latest');
  if (!block || Math.abs(now / 1000 - block.timestamp) > 180) {
    throw Error('Ethereum data is stale or unavailable.');
  }
  await Promise.all([verifyContracts(provider), verifyExchange(provider)]);
  return {chainId: CHAIN_ID, blockNumber: block.number, blockHash: block.hash,
    blockTimestamp: block.timestamp, contracts: 'verified', protocolFeeMultiplier: '0'};
}
