import { DEFAULT_MINER_SEED } from './constants';
import { broadcast, transfer } from '@waves/waves-transactions';
import { base58Decode } from '@waves/ts-lib-crypto';
import { create } from '@waves/node-api-js';

export async function faucet({
  recipient,
  amount,
  nodeUrl,
}: {
  recipient: string;
  amount: number;
  nodeUrl: string;
}) {
  return broadcast(
    transfer({ amount, recipient }, DEFAULT_MINER_SEED),
    nodeUrl
  );
}

export async function getNetworkByte(nodeUrl: string) {
  const nodeApi = create(nodeUrl);
  const { generator } = await nodeApi.blocks.fetchHeadersLast();

  return getNetworkByteByAddress(generator);
}

function getNetworkByteByAddress(address: string): number {
  return base58Decode(address)[1];
}
