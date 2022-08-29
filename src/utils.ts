import {
  fetchCalculateFee,
  TFeeInfo,
} from '@waves/node-api-js/cjs/api-node/transactions';
import { SignerTx } from '@waves/signer';
import { Transaction } from '@waves/ts-types';

export function calculateFee(base: string, tx: SignerTx): Promise<SignerTx> {
  return fetchCalculateFee(base, tx as Transaction)
    .then((info: TFeeInfo) => ({ ...tx, fee: info.feeAmount }))
    .catch(() => tx);
}
