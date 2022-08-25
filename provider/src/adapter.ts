import {
  SignedTx,
  SignerAliasTx,
  SignerBurnTx,
  SignerCancelLeaseTx,
  SignerDataTx,
  SignerInvokeTx,
  SignerIssueTx,
  SignerLeaseTx,
  SignerMassTransferTx,
  SignerReissueTx,
  SignerSetAssetScriptTx,
  SignerSetScriptTx,
  SignerSponsorshipTx,
  SignerTransferTx,
  SignerTx,
} from '@waves/signer';
import { TRANSACTION_TYPE } from '@waves/ts-types';
import { json } from '@waves/marshall';
import { BASE58_STRING } from '@waves/marshall/dist/serializePrimitives';

function isAlias(source: string): boolean {
  return source.startsWith('alias:');
}

function addressFactory(address: string): string {
  return !isAlias(address) ? address : address.split(':')[2];
}

function moneyFactory(
  amount: number | string,
  assetId: string | null = 'WAVES'
): WavesKeeper.IMoneyCoins {
  return {
    coins: amount,
    assetId: assetId ?? 'WAVES',
  };
}

function defaultsFactory(tx: SignerTx): WavesKeeper.ITransactionBase {
  const { fee } = tx;
  let feeAssetId;

  if (
    tx.type === TRANSACTION_TYPE.TRANSFER ||
    tx.type === TRANSACTION_TYPE.INVOKE_SCRIPT
  ) {
    ({ feeAssetId } = tx);
  }

  return {
    ...(fee ? { fee: moneyFactory(fee, feeAssetId) } : {}),
  };
}

function issueAdapter(tx: SignerIssueTx): WavesKeeper.TIssueTxData {
  const { name, description, quantity, decimals, reissuable, script } = tx;
  const data: WavesKeeper.IIssueTx = {
    ...defaultsFactory(tx),
    name,
    description: description ?? '',
    quantity,
    precision: decimals,
    reissuable: reissuable ?? false,
    ...(script ? { script } : {}),
  };
  return { type: TRANSACTION_TYPE.ISSUE, data };
}

function transferAdapter(tx: SignerTransferTx): WavesKeeper.TTransferTxData {
  const { amount, assetId, fee, feeAssetId, recipient, attachment } = tx;
  const data: WavesKeeper.ITransferTx = {
    ...defaultsFactory(tx),
    amount: moneyFactory(amount, assetId),
    recipient: addressFactory(recipient),
    ...(attachment
      ? { attachment: Array.from(BASE58_STRING(attachment)) }
      : {}),
    ...(fee ? { fee: moneyFactory(fee, feeAssetId) } : {}),
  };
  return { type: TRANSACTION_TYPE.TRANSFER, data };
}

function reissueAdapter(tx: SignerReissueTx): WavesKeeper.TReissueTxData {
  const { assetId, quantity, reissuable } = tx;
  const data: WavesKeeper.IReissueTx = {
    ...defaultsFactory(tx),
    assetId,
    quantity,
    reissuable,
  };
  return { type: TRANSACTION_TYPE.REISSUE, data };
}

function burnAdapter(tx: SignerBurnTx): WavesKeeper.TBurnTxData {
  const { assetId, amount } = tx;
  const data: WavesKeeper.IBurnTx = {
    ...defaultsFactory(tx),
    assetId,
    amount,
  };
  return { type: TRANSACTION_TYPE.BURN, data };
}

function leaseAdapter(tx: SignerLeaseTx): WavesKeeper.TLeaseTxData {
  const { recipient, amount } = tx;
  const data: WavesKeeper.ILeaseTx = {
    ...defaultsFactory(tx),
    recipient: addressFactory(recipient),
    amount,
  };
  return { type: TRANSACTION_TYPE.LEASE, data };
}

function leaseCancelAdapter(
  tx: SignerCancelLeaseTx
): WavesKeeper.TLeaseCancelTxData {
  const { leaseId } = tx;
  const data: WavesKeeper.ILeaseCancelTx = {
    ...defaultsFactory(tx),
    leaseId,
  };
  return { type: TRANSACTION_TYPE.CANCEL_LEASE, data };
}

function aliasAdapter(tx: SignerAliasTx): WavesKeeper.TCreateAliasTxData {
  const { alias } = tx;
  const data: WavesKeeper.ICreateAliasTx = {
    ...defaultsFactory(tx),
    alias,
  };
  return { type: TRANSACTION_TYPE.ALIAS, data };
}

function massTransferAdapter(
  tx: SignerMassTransferTx
): WavesKeeper.TMassTransferTxData {
  const { assetId, transfers, attachment } = tx;
  const data: WavesKeeper.IMassTransferTx = {
    ...defaultsFactory(tx),
    totalAmount: moneyFactory(0, assetId),
    transfers: transfers.map(transfer => ({
      recipient: addressFactory(transfer.recipient),
      amount: transfer.amount,
    })),
    ...(attachment
      ? { attachment: Array.from(BASE58_STRING(attachment)) }
      : {}),
  };
  return { type: TRANSACTION_TYPE.MASS_TRANSFER, data };
}

function dataAdapter(tx: SignerDataTx): WavesKeeper.TDataTxData {
  const { data } = tx;
  const dataTx: WavesKeeper.IDataTx = {
    ...defaultsFactory(tx),
    data: data as Array<WavesKeeper.TData>,
  };
  return { type: TRANSACTION_TYPE.DATA, data: dataTx };
}

function setScriptAdapter(tx: SignerSetScriptTx): WavesKeeper.TSetScriptTxData {
  const { script } = tx;
  const data: WavesKeeper.ISetScriptTx = {
    ...defaultsFactory(tx),
    script,
  };
  return { type: TRANSACTION_TYPE.SET_SCRIPT, data };
}

function sponsorshipAdapter(
  tx: SignerSponsorshipTx
): WavesKeeper.TSponsoredFeeTxData {
  const { assetId, minSponsoredAssetFee } = tx;
  const data: WavesKeeper.ISponsoredFeeTx = {
    ...defaultsFactory(tx),
    minSponsoredAssetFee: moneyFactory(minSponsoredAssetFee, assetId),
  };
  return { type: TRANSACTION_TYPE.SPONSORSHIP, data };
}

function setAssetScriptAdapter(
  tx: SignerSetAssetScriptTx
): WavesKeeper.TSetAssetScriptTxData {
  const { assetId, script } = tx;
  const data: WavesKeeper.ISetAssetScriptTx = {
    ...defaultsFactory(tx),
    assetId,
    script,
  };
  return { type: TRANSACTION_TYPE.SET_ASSET_SCRIPT, data };
}

function invokeScriptAdapter(
  tx: SignerInvokeTx
): WavesKeeper.TScriptInvocationTxData {
  const { dApp, fee, feeAssetId, payment, call } = tx;
  const data: WavesKeeper.IScriptInvocationTx = {
    ...defaultsFactory(tx),
    dApp: addressFactory(dApp),
    payment: (payment ?? []) as Array<WavesKeeper.TMoney>,
    ...(call ? { call: call as WavesKeeper.ICall } : {}),
    ...(fee ? { fee: moneyFactory(fee, feeAssetId) } : {}),
  };
  return { type: TRANSACTION_TYPE.INVOKE_SCRIPT, data };
}

export function keeperTxFactory(tx: SignerIssueTx): WavesKeeper.TIssueTxData;
export function keeperTxFactory(
  tx: SignerTransferTx
): WavesKeeper.TTransferTxData;
export function keeperTxFactory(
  tx: SignerReissueTx
): WavesKeeper.TReissueTxData;
export function keeperTxFactory(tx: SignerBurnTx): WavesKeeper.TBurnTxData;
export function keeperTxFactory(tx: SignerLeaseTx): WavesKeeper.TLeaseTxData;
export function keeperTxFactory(
  tx: SignerCancelLeaseTx
): WavesKeeper.TLeaseCancelTxData;
export function keeperTxFactory(
  tx: SignerAliasTx
): WavesKeeper.TCreateAliasTxData;
export function keeperTxFactory(
  tx: SignerMassTransferTx
): WavesKeeper.TMassTransferTxData;
export function keeperTxFactory(tx: SignerDataTx): WavesKeeper.TDataTxData;
export function keeperTxFactory(
  tx: SignerSetScriptTx
): WavesKeeper.TSetScriptTxData;
export function keeperTxFactory(
  tx: SignerSponsorshipTx
): WavesKeeper.TSponsoredFeeTxData;
export function keeperTxFactory(
  tx: SignerSetAssetScriptTx
): WavesKeeper.TSetAssetScriptTxData;
export function keeperTxFactory(
  tx: SignerInvokeTx
): WavesKeeper.TScriptInvocationTxData;
export function keeperTxFactory(tx: SignerTx): WavesKeeper.TSignTransactionData;
export function keeperTxFactory(tx) {
  switch (tx.type) {
    case TRANSACTION_TYPE.ISSUE:
      return issueAdapter(tx);
    case TRANSACTION_TYPE.TRANSFER:
      return transferAdapter(tx);
    case TRANSACTION_TYPE.REISSUE:
      return reissueAdapter(tx);
    case TRANSACTION_TYPE.BURN:
      return burnAdapter(tx);
    case TRANSACTION_TYPE.LEASE:
      return leaseAdapter(tx);
    case TRANSACTION_TYPE.CANCEL_LEASE:
      return leaseCancelAdapter(tx);
    case TRANSACTION_TYPE.ALIAS:
      return aliasAdapter(tx);
    case TRANSACTION_TYPE.MASS_TRANSFER:
      return massTransferAdapter(tx);
    case TRANSACTION_TYPE.DATA:
      return dataAdapter(tx);
    case TRANSACTION_TYPE.SET_SCRIPT:
      return setScriptAdapter(tx);
    case TRANSACTION_TYPE.SPONSORSHIP:
      return sponsorshipAdapter(tx);
    case TRANSACTION_TYPE.SET_ASSET_SCRIPT:
      return setAssetScriptAdapter(tx);
    case TRANSACTION_TYPE.INVOKE_SCRIPT:
      return invokeScriptAdapter(tx);
    default:
      throw new Error('Unsupported transaction type');
  }
}

export function signerTxFactory(signed: string): SignedTx<SignerTx> {
  return json.parseTx(signed);
}
