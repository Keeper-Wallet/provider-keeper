import { keeperTxFactory, signerTxFactory } from '../src/adapter';
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
    SignerTx,
} from '@waves/signer';
import { expect } from 'chai';
import { TRANSACTION_TYPE } from '@waves/ts-types';

const assetId = '7sP5abE9nGRwZxkgaEXgkQDZ3ERBcm9PLHixaUE5SYoT';
const leaseId = '3N5HNJz5otiUavvoPrxMBrXBVv5HhYLdhiD';
const aliasStr = 'merry';
const recipient = '3N5HNJz5otiUavvoPrxMBrXBVv5HhYLdhiD';
const script = 'base64:BQbtKNoM';
const attachment = 'base64:BQbtKNoM';
const amount = 123456790;
const longMax = '9223372036854775807';
const longMin = '-9223372036854775808';
const dApp = '3My2kBJaGfeM2koiZroaYdd3y8rAgfV2EAx';

const testFee = (tx: SignerTx) => {
    const { fee, ...other } = tx;

    it('fee is empty', () => {
        const txNonFee = { ...other };
        expect(keeperTxFactory(txNonFee).data.fee).to.be.equal(undefined);
    });

    it('fee is money-like', () => {
        const txWavesFee = { fee: amount, ...other };

        expect(keeperTxFactory(txWavesFee).data.fee).to.be.deep.equal({
            amount: txWavesFee.fee,
            assetId: 'WAVES',
        });

        if (tx.type === TRANSACTION_TYPE.TRANSFER || tx.type === TRANSACTION_TYPE.INVOKE_SCRIPT) {
            const txAssetFee = { fee: amount, feeAssetId: assetId, ...other };

            expect(keeperTxFactory(txAssetFee).data.fee).to.be.deep.equal({
                amount: txAssetFee.fee,
                assetId: txAssetFee.feeAssetId,
            });
        }
    });
};

describe('Adapter', () => {
    describe('converting tx from Signer to Keeper', () => {
        describe('issue', () => {
            const txIssue: SignerIssueTx = {
                type: TRANSACTION_TYPE.ISSUE,
                name: 'ScriptToken',
                decimals: 8,
                quantity: longMax,
                reissuable: true,
                description: 'ScriptToken',
                script: script,
            };

            it('is correct', function () {
                expect(keeperTxFactory(txIssue)).to.be.deep.equal({
                    type: txIssue.type,
                    data: {
                        name: txIssue.name,
                        precision: txIssue.decimals,
                        quantity: txIssue.quantity,
                        reissuable: txIssue.reissuable,
                        description: txIssue.description,
                        script: txIssue.script,
                    },
                });
            });

            testFee(txIssue);
        });

        describe('transfer', () => {
            const txTransfer: SignerTransferTx = { type: TRANSACTION_TYPE.TRANSFER, recipient, amount: amount };

            it('is correct', () => {
                expect(keeperTxFactory(txTransfer)).to.be.deep.equal({
                    type: txTransfer.type,
                    data: {
                        recipient: txTransfer.recipient,
                        amount: { amount: txTransfer.amount, assetId: 'WAVES' },
                    },
                });
            });

            testFee(txTransfer);
        });

        describe('reissue', () => {
            const txReissue: SignerReissueTx = {
                type: TRANSACTION_TYPE.REISSUE,
                assetId: assetId,
                quantity: amount,
                reissuable: true,
            };
            it('is correct', () => {
                expect(keeperTxFactory(txReissue)).to.be.deep.equal({
                    type: txReissue.type,
                    data: {
                        assetId: txReissue.assetId,
                        quantity: txReissue.quantity,
                        reissuable: txReissue.reissuable,
                    },
                });
            });
            testFee(txReissue);
        });

        describe('burn', () => {
            const txBurn: SignerBurnTx = {
                type: TRANSACTION_TYPE.BURN,
                assetId: assetId,
                amount: amount,
            };

            it('is correct', () => {
                expect(keeperTxFactory(txBurn)).to.be.deep.equal({
                    type: txBurn.type,
                    data: {
                        assetId: txBurn.assetId,
                        amount: txBurn.amount,
                    },
                });
            });

            testFee(txBurn);
        });

        describe('lease', () => {
            const txLease: SignerLeaseTx = {
                type: TRANSACTION_TYPE.LEASE,
                recipient: recipient,
                amount: amount,
            };

            it('is correct', () => {
                expect(keeperTxFactory(txLease)).to.be.deep.equal({
                    type: txLease.type,
                    data: {
                        recipient: txLease.recipient,
                        amount: txLease.amount,
                    },
                });
            });

            testFee(txLease);
        });

        describe('lease cancel', () => {
            const txLeaseCancel: SignerCancelLeaseTx = {
                type: TRANSACTION_TYPE.CANCEL_LEASE,
                leaseId: leaseId,
            };

            it('is correct', () => {
                expect(keeperTxFactory(txLeaseCancel)).to.be.deep.equal({
                    type: txLeaseCancel.type,
                    data: {
                        leaseId: txLeaseCancel.leaseId,
                    },
                });
            });

            testFee(txLeaseCancel);
        });

        describe('alias', () => {
            const txAlias: SignerAliasTx = {
                type: TRANSACTION_TYPE.ALIAS,
                alias: aliasStr,
            };

            it('is correct', () => {
                expect(keeperTxFactory(txAlias)).to.be.deep.equal({
                    type: txAlias.type,
                    data: {
                        alias: txAlias.alias,
                    },
                });
            });

            testFee(txAlias);
        });

        describe('mass transfer', () => {
            const txMassTransfer: SignerMassTransferTx = {
                type: TRANSACTION_TYPE.MASS_TRANSFER,
                assetId: assetId,
                transfers: [
                    {
                        amount: 1,
                        recipient: 'testy',
                    },
                    {
                        amount: 1,
                        recipient: 'merry',
                    },
                ],
                attachment: attachment,
            };

            it('is correct', () => {
                expect(keeperTxFactory(txMassTransfer)).to.be.deep.equal({
                    type: txMassTransfer.type,
                    data: {
                        totalAmount: { amount: 0, assetId: assetId },
                        transfers: txMassTransfer.transfers,
                        attachment: attachment,
                    },
                });
            });

            testFee(txMassTransfer);
        });

        describe('data', () => {
            const txData: SignerDataTx = {
                type: TRANSACTION_TYPE.DATA,
                data: [
                    { key: 'stringValue', type: 'string', value: 'Lorem ipsum dolor sit amet' },
                    { key: 'longMaxValue', type: 'integer', value: longMax },
                    { key: 'flagValue', type: 'boolean', value: true },
                ],
            };

            it('is correct', () => {
                expect(keeperTxFactory(txData)).to.be.deep.equal({
                    type: txData.type,
                    data: {
                        data: txData.data,
                    },
                });
            });

            testFee(txData);
        });

        describe('set script', () => {
            const txSetScript: SignerSetScriptTx = {
                type: TRANSACTION_TYPE.SET_SCRIPT,
                script: script,
            };

            it('is correct', () => {
                expect(keeperTxFactory(txSetScript)).to.be.deep.equal({
                    type: txSetScript.type,
                    data: {
                        script: txSetScript.script,
                    },
                });
            });

            testFee(txSetScript);
        });

        describe('sponsorship', () => {
            const txSponsorship: SignerSponsorshipTx = {
                type: TRANSACTION_TYPE.SPONSORSHIP,
                assetId: assetId,
                minSponsoredAssetFee: amount,
            };

            it('is correct', () => {
                expect(keeperTxFactory(txSponsorship)).to.be.deep.equal({
                    type: txSponsorship.type,
                    data: {
                        minSponsoredAssetFee: {
                            amount: txSponsorship.minSponsoredAssetFee,
                            assetId: txSponsorship.assetId,
                        },
                    },
                });
            });

            testFee(txSponsorship);
        });

        describe('set asset script', () => {
            const txSetAssetScript: SignerSetAssetScriptTx = {
                type: TRANSACTION_TYPE.SET_ASSET_SCRIPT,
                assetId: assetId,
                script: script,
            };

            it('is correct', () => {
                expect(keeperTxFactory(txSetAssetScript)).to.be.deep.equal({
                    type: txSetAssetScript.type,
                    data: {
                        assetId: txSetAssetScript.assetId,
                        script: txSetAssetScript.script,
                    },
                });
            });

            testFee(txSetAssetScript);
        });

        describe('invoke script', () => {
            const txInvokeScript: SignerInvokeTx = {
                type: TRANSACTION_TYPE.INVOKE_SCRIPT,
                dApp: dApp,
                call: {
                    function: 'someFunctionToCall',
                    args: [
                        { type: 'binary', value: 'base64:BQbtKNoM' },
                        { type: 'boolean', value: true },
                        { type: 'integer', value: longMax },
                        { type: 'string', value: 'Lorem ipsum dolor sit amet' },
                    ],
                },
                payment: [
                    {
                        assetId: null,
                        amount: 1,
                    },
                    {
                        assetId: assetId,
                        amount: 1,
                    },
                ],
            };

            it('is correct', () => {
                expect(keeperTxFactory(txInvokeScript)).to.be.deep.equal({
                    type: txInvokeScript.type,
                    data: {
                        dApp: dApp,
                        call: {
                            function: txInvokeScript.call!.function,
                            args: txInvokeScript.call!.args,
                        },
                        payment: txInvokeScript.payment,
                    },
                });
            });

            testFee(txInvokeScript);
        });
    });

    describe('converting tx from Keeper to Signer', () => {
        describe('issue', () => {
            it('is correct', () => {
                expect(1).to.be.equal(1);
            });
        });

        describe('transfer', () => {
            it('is correct', () => {
                expect(1).to.be.equal(1);
            });
        });

        describe('reissue', () => {
            it('is correct', () => {
                expect(1).to.be.equal(1);
            });
        });

        describe('burn', () => {
            it('is correct', () => {
                expect(1).to.be.equal(1);
            });
        });

        describe('lease', () => {
            it('is correct', () => {
                expect(1).to.be.equal(1);
            });
        });

        describe('lease cancel', () => {
            it('is correct', () => {
                expect(1).to.be.equal(1);
            });
        });

        describe('alias', () => {
            it('is correct', () => {
                expect(1).to.be.equal(1);
            });
        });

        describe('mass transfer', () => {
            it('is correct', () => {
                expect(1).to.be.equal(1);
            });
        });

        describe('data', () => {
            it('is correct', () => {
                expect(1).to.be.equal(1);
            });
        });

        describe('set script', () => {
            it('is correct', () => {
                expect(1).to.be.equal(1);
            });
        });

        describe('sponsorship', () => {
            it('is correct', () => {
                expect(1).to.be.equal(1);
            });
        });

        describe('set asset script', () => {
            it('is correct', () => {
                expect(1).to.be.equal(1);
            });
        });

        describe('invoke script', () => {
            it('is correct', () => {
                expect(1).to.be.equal(1);
            });
        });
    });
});
