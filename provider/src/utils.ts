import { fetchCalculateFee, TFeeInfo } from '@waves/node-api-js/cjs/api-node/transactions';
import { SignerTx } from '@waves/signer';

export function calculateFee(base: string, tx: any): Promise<SignerTx> {
    return fetchCalculateFee(base, tx)
        .then((info: TFeeInfo) => ({ ...tx, fee: info.feeAmount }))
        .catch(() => tx);
}
