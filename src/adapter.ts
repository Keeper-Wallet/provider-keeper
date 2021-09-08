import {
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
    SignerTx
} from '@waves/signer';
import { TRANSACTION_TYPE } from "@waves/ts-types";

class IssueAdapter implements WavesKeeper.TIssueTxData {
    type;
    data;

    constructor(
        {
            type,
            name,
            description,
            quantity,
            decimals,
            reissuable,
            script,
            fee,
            senderPublicKey
        }: SignerIssueTx
    ) {
        this.type = type;
        this.data = {
            name,
            description,
            quantity,
            precision: decimals,
            reissuable,
            ...(fee ? {fee: {amount: fee, assetId: 'WAVES'} as WavesKeeper.TMoney} : {}),
            ...(script ? {script} : {}),
            ...(senderPublicKey ? {senderPublicKey}: {}),
        } as WavesKeeper.IIssueTx;
    }
}

class TransferAdapter implements WavesKeeper.TTransferTxData {
    type;
    data;

    constructor(
        {
            type,
            amount,
            assetId: _assetId = 'WAVES',
            fee,
            feeAssetId: _feeAssetId = 'WAVES',
            recipient,
            attachment,
            senderPublicKey
        }: SignerTransferTx
    ) {
        this.type = type;
        this.data = {
            amount: {amount: amount, assetId: _assetId} as WavesKeeper.TMoney,
            recipient,
            ...(attachment ? {attachment} : {}),
            ...(fee ? {fee: {amount: fee, assetId: _feeAssetId} as WavesKeeper.TMoney} : {}),
            ...(senderPublicKey ? {senderPublicKey}: {}),
        } as WavesKeeper.ITransferTx;
    }
}

class ReissueAdapter implements WavesKeeper.TReissueTxData {
    type;
    data;

    constructor(
        {
            type,
            assetId,
            quantity,
            reissuable,
            fee,
            senderPublicKey
        }: SignerReissueTx
    ) {
        this.type = type;
        this.data = {
            assetId,
            quantity,
            reissuable,
            ...(fee ? {fee: {amount: fee, assetId: 'WAVES'} as WavesKeeper.TMoney} : {}),
            ...(senderPublicKey ? {senderPublicKey}: {}),
        } as WavesKeeper.IReissueTx;
    }
}

class BurnAdapter implements WavesKeeper.TBurnTxData {
    type;
    data;

    constructor(
        {
            type,
            assetId,
            amount,
            fee,
            senderPublicKey
        }: SignerBurnTx
    ) {
        this.type = type;
        this.data = {
            assetId,
            amount,
            ...(fee ? {fee: {amount: fee, assetId: 'WAVES'} as WavesKeeper.TMoney} : {}),
            ...(senderPublicKey ? {senderPublicKey}: {}),
        } as WavesKeeper.IBurnTx;
    }
}

class LeaseAdapter implements WavesKeeper.TLeaseTxData {
    type;
    data;

    constructor(
        {
            type,
            recipient,
            amount,
            fee,
            senderPublicKey
        }: SignerLeaseTx
    ) {
        this.type = type;
        this.data = {
            recipient,
            amount,
            ...(fee ? {fee: {amount: fee, assetId: 'WAVES'} as WavesKeeper.TMoney} : {}),
            ...(senderPublicKey ? {senderPublicKey}: {}),
        } as WavesKeeper.ILeaseTx;
    }
}

class CancelLeaseAdapter implements WavesKeeper.TLeaseCancelTxData {
    type;
    data;

    constructor(
        {
            type,
            leaseId,
            fee,
            senderPublicKey
        }: SignerCancelLeaseTx
    ) {
        this.type = type;
        this.data = {
            leaseId,
            ...(fee ? {fee: {amount: fee, assetId: 'WAVES'} as WavesKeeper.TMoney} : {}),
            ...(senderPublicKey ? {senderPublicKey}: {}),
        } as WavesKeeper.ILeaseCancelTx;
    }
}

class AliasAdapter implements WavesKeeper.TCreateAliasTxData {
    type;
    data;

    constructor(
        {
            type,
            alias,
            fee,
            senderPublicKey
        }: SignerAliasTx
    ) {
        this.type = type;
        this.data = {
            alias,
            ...(fee ? {fee: {amount: fee, assetId: 'WAVES'} as WavesKeeper.TMoney} : {}),
            ...(senderPublicKey ? {senderPublicKey}: {}),
        } as WavesKeeper.ICreateAliasTx;
    }
}

class MassTransferAdapter implements WavesKeeper.TMassTransferTxData {
    type;
    data;

    constructor(
        {
            type,
            assetId: _assetId = 'WAVES',
            transfers,
            attachment,
            fee,
            senderPublicKey
        }: SignerMassTransferTx
    ) {
        this.type = type;
        this.data = {
            totalAmount: {amount:0, assetId: _assetId} as WavesKeeper.TMoney,
            transfers: transfers as Array<WavesKeeper.ITransfer>,
            ...(attachment ? {attachment} : {}),
            ...(fee ? {fee: {amount: fee, assetId: 'WAVES'} as WavesKeeper.TMoney} : {}),
            ...(senderPublicKey ? {senderPublicKey}: {}),
        } as WavesKeeper.IMassTransferTx;
    }
}

class DataAdapter implements WavesKeeper.TDataTxData {
    type;
    data;

    constructor(
        {
            type,
            data,
            fee,
            senderPublicKey
        }: SignerDataTx
    ) {
        this.type = type;
        this.data = {
            data: data as Array<WavesKeeper.TData>,
            ...(fee ? {fee: {amount: fee, assetId: 'WAVES'} as WavesKeeper.TMoney} : {}),
            ...(senderPublicKey ? {senderPublicKey}: {}),
        } as WavesKeeper.IDataTx;
    }
}

class SetScriptAdapter implements WavesKeeper.TSetScriptTxData {
    type;
    data;

    constructor(
        {
            type,
            script,
            fee,
            senderPublicKey
        }: SignerSetScriptTx
    ) {
        this.type = type;
        this.data = {
            script,
            ...(fee ? {fee: {amount: fee, assetId: 'WAVES'} as WavesKeeper.TMoney} : {}),
            ...(senderPublicKey ? {senderPublicKey}: {}),
        } as WavesKeeper.ISetScriptTx;
    }
}

class SponsorshipAdapter implements WavesKeeper.TSponsoredFeeTxData {
    type;
    data;

    constructor(
        {
            type,
            assetId,
            minSponsoredAssetFee,
            fee,
            senderPublicKey
        }: SignerSponsorshipTx
    ) {
        this.type = type;
        this.data = {
            minSponsoredAssetFee: {amount: minSponsoredAssetFee, assetId} as WavesKeeper.TMoney,
            ...(fee ? {fee: {amount: fee, assetId: 'WAVES'} as WavesKeeper.TMoney} : {}),
            ...(senderPublicKey ? {senderPublicKey}: {}),
        } as WavesKeeper.ISponsoredFeeTx;
    }
}

class SetAssetScriptAdapter implements WavesKeeper.TSetAssetScriptTxData {
    type;
    data;

    constructor(
        {
            type,
            assetId,
            script,
            fee,
            senderPublicKey
        }: SignerSetAssetScriptTx
    ) {
        this.type = type;
        this.data = {
            assetId,
            script,
            ...(fee ? {fee: {amount: fee, assetId: 'WAVES'} as WavesKeeper.TMoney} : {}),
            ...(senderPublicKey ? {senderPublicKey}: {}),
        } as WavesKeeper.ISetAssetScriptTx
    }
}

class InvokeScriptAdapter implements WavesKeeper.TScriptInvocationTxData {
    type;
    data;

    constructor(
        {
            type,
            dApp,
            fee,
            feeAssetId: _feeAssetId = 'WAVES',
            payment,
            call,
            senderPublicKey
        }: SignerInvokeTx
    ) {
        this.type = type;
        this.data = {
            dApp,
            ...(call ? {call: call as WavesKeeper.ICall} : {}),
            ...(payment ? {payment: payment as Array<WavesKeeper.TMoney>}: {}),
            ...(fee ? {fee: {amount: fee, assetId: _feeAssetId} as WavesKeeper.TMoney} : {}),
            ...(senderPublicKey ? {senderPublicKey}: {}),
        } as WavesKeeper.IScriptInvocationTx
    }
}

export function keeperTxFactory(tx: SignerTx): WavesKeeper.TSignTransactionData {
    switch (tx.type){
        case TRANSACTION_TYPE.TRANSFER:
            return new TransferAdapter(tx);
        case TRANSACTION_TYPE.ISSUE:
            return new IssueAdapter(tx);
        case TRANSACTION_TYPE.REISSUE:
            return new ReissueAdapter(tx);
        case TRANSACTION_TYPE.BURN:
            return new BurnAdapter(tx);
        case TRANSACTION_TYPE.LEASE:
            return new LeaseAdapter(tx);
        case TRANSACTION_TYPE.CANCEL_LEASE:
            return new CancelLeaseAdapter(tx);
        case TRANSACTION_TYPE.ALIAS:
            return new AliasAdapter(tx);
        case TRANSACTION_TYPE.MASS_TRANSFER:
            return new MassTransferAdapter(tx);
        case TRANSACTION_TYPE.DATA:
            return new DataAdapter(tx);
        case TRANSACTION_TYPE.SET_SCRIPT:
            return new SetScriptAdapter(tx);
        case TRANSACTION_TYPE.SPONSORSHIP:
            return new SponsorshipAdapter(tx);
        case TRANSACTION_TYPE.SET_ASSET_SCRIPT:
            return new SetAssetScriptAdapter(tx);
        case TRANSACTION_TYPE.INVOKE_SCRIPT:
            return new InvokeScriptAdapter(tx);
        default:
            throw new Error('Unsupported transaction type');
    }
}
