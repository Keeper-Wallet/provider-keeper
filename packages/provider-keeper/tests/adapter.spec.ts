import { keeperTxFactory, signerTxFactory } from '../src/adapter';
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
    SignerTxToSignedTx,
} from '@waves/signer';
import { expect } from 'chai';
import { TRANSACTION_TYPE, TransactionMap } from '@waves/ts-types';

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

describe('Adapter', () => {
    describe('converting tx from Signer to Keeper', () => {
        function isValidFee(tx: SignerIssueTx);
        function isValidFee(tx: SignerTransferTx);
        function isValidFee(tx: SignerReissueTx);
        function isValidFee(tx: SignerBurnTx);
        function isValidFee(tx: SignerLeaseTx);
        function isValidFee(tx: SignerCancelLeaseTx);
        function isValidFee(tx: SignerAliasTx);
        function isValidFee(tx: SignerMassTransferTx);
        function isValidFee(tx: SignerDataTx);
        function isValidFee(tx: SignerSetScriptTx);
        function isValidFee(tx: SignerSponsorshipTx);
        function isValidFee(tx: SignerSetAssetScriptTx);
        function isValidFee(tx: SignerInvokeTx);
        function isValidFee(tx) {
            it('fee is empty', () => {
                expect(keeperTxFactory(tx).data.fee).to.be.undefined;
            });

            it('fee is money-like', () => {
                tx.fee = amount; // now tx with fee in WAVES

                expect(keeperTxFactory(tx).data.fee).to.be.deep.equal({
                    amount: tx.fee,
                    assetId: 'WAVES',
                });

                if (tx.type === TRANSACTION_TYPE.TRANSFER || tx.type === TRANSACTION_TYPE.INVOKE_SCRIPT) {
                    tx.feeAssetId = assetId; // tx with fee in asset

                    expect(keeperTxFactory(tx).data.fee).to.be.deep.equal({
                        amount: tx.fee,
                        assetId: tx.feeAssetId,
                    });
                }
            });
        }

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

            it('is valid', () => {
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

            it('optional fields are valid', () => {
                delete txIssue.description; // description is undefined
                expect(keeperTxFactory(txIssue).data.description).to.be.equal('');
                delete txIssue.reissuable; // reissuable is undefined
                expect(keeperTxFactory(txIssue).data.reissuable).to.be.equal(false);
                delete txIssue.script; // script is undefined
                expect(keeperTxFactory(txIssue).data.script).to.be.undefined;
            });

            isValidFee(txIssue);
        });

        describe('transfer', () => {
            const txTransfer: SignerTransferTx = {
                type: TRANSACTION_TYPE.TRANSFER,
                recipient,
                amount: amount, // amount in WAVES
                attachment: attachment,
            };

            it('is valid', () => {
                expect(keeperTxFactory(txTransfer)).to.be.deep.equal({
                    type: txTransfer.type,
                    data: {
                        recipient: txTransfer.recipient,
                        amount: { amount: txTransfer.amount, assetId: 'WAVES' },
                        attachment: txTransfer.attachment,
                    },
                });
            });

            it('amount in asset', () => {
                txTransfer.assetId = assetId;
                expect(keeperTxFactory(txTransfer).data.amount.assetId).to.be.equal(txTransfer.assetId);
            });

            it('attachment is undefined', () => {
                delete txTransfer.attachment;
                expect(keeperTxFactory(txTransfer).data.attachment).to.be.undefined;
            });

            isValidFee(txTransfer);
        });

        describe('reissue', () => {
            const txReissue: SignerReissueTx = {
                type: TRANSACTION_TYPE.REISSUE,
                assetId: assetId,
                quantity: amount,
                reissuable: true,
            };
            it('is valid', () => {
                expect(keeperTxFactory(txReissue)).to.be.deep.equal({
                    type: txReissue.type,
                    data: {
                        assetId: txReissue.assetId,
                        quantity: txReissue.quantity,
                        reissuable: txReissue.reissuable,
                    },
                });
            });
            isValidFee(txReissue);
        });

        describe('burn', () => {
            const txBurn: SignerBurnTx = {
                type: TRANSACTION_TYPE.BURN,
                assetId: assetId,
                amount: amount,
            };

            it('is valid', () => {
                expect(keeperTxFactory(txBurn)).to.be.deep.equal({
                    type: txBurn.type,
                    data: {
                        assetId: txBurn.assetId,
                        amount: txBurn.amount,
                    },
                });
            });

            isValidFee(txBurn);
        });

        describe('lease', () => {
            const txLease: SignerLeaseTx = {
                type: TRANSACTION_TYPE.LEASE,
                recipient: recipient,
                amount: amount,
            };

            it('is valid', () => {
                expect(keeperTxFactory(txLease)).to.be.deep.equal({
                    type: txLease.type,
                    data: {
                        recipient: txLease.recipient,
                        amount: txLease.amount,
                    },
                });
            });

            isValidFee(txLease);
        });

        describe('lease cancel', () => {
            const txLeaseCancel: SignerCancelLeaseTx = {
                type: TRANSACTION_TYPE.CANCEL_LEASE,
                leaseId: leaseId,
            };

            it('is valid', () => {
                expect(keeperTxFactory(txLeaseCancel)).to.be.deep.equal({
                    type: txLeaseCancel.type,
                    data: {
                        leaseId: txLeaseCancel.leaseId,
                    },
                });
            });

            isValidFee(txLeaseCancel);
        });

        describe('alias', () => {
            const txAlias: SignerAliasTx = {
                type: TRANSACTION_TYPE.ALIAS,
                alias: aliasStr,
            };

            it('is valid', () => {
                expect(keeperTxFactory(txAlias)).to.be.deep.equal({
                    type: txAlias.type,
                    data: {
                        alias: txAlias.alias,
                    },
                });
            });

            isValidFee(txAlias);
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

            it('is valid', () => {
                expect(keeperTxFactory(txMassTransfer)).to.be.deep.equal({
                    type: txMassTransfer.type,
                    data: {
                        totalAmount: { amount: 0, assetId: assetId },
                        transfers: txMassTransfer.transfers,
                        attachment: attachment,
                    },
                });
            });

            it('attachment is null', () => {
                txMassTransfer.attachment = null;
                expect(keeperTxFactory(txMassTransfer).data.attachment).to.be.undefined;
            });

            isValidFee(txMassTransfer);
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

            it('is valid', () => {
                expect(keeperTxFactory(txData)).to.be.deep.equal({
                    type: txData.type,
                    data: {
                        data: txData.data,
                    },
                });
            });

            isValidFee(txData);
        });

        describe('set script', () => {
            const txSetScript: SignerSetScriptTx = {
                type: TRANSACTION_TYPE.SET_SCRIPT,
                script: script,
            };

            it('is valid', () => {
                expect(keeperTxFactory(txSetScript)).to.be.deep.equal({
                    type: txSetScript.type,
                    data: {
                        script: txSetScript.script,
                    },
                });
            });

            isValidFee(txSetScript);
        });

        describe('sponsorship', () => {
            const txSponsorship: SignerSponsorshipTx = {
                type: TRANSACTION_TYPE.SPONSORSHIP,
                assetId: assetId,
                minSponsoredAssetFee: amount,
            };

            it('is valid', () => {
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

            isValidFee(txSponsorship);
        });

        describe('set asset script', () => {
            const txSetAssetScript: SignerSetAssetScriptTx = {
                type: TRANSACTION_TYPE.SET_ASSET_SCRIPT,
                assetId: assetId,
                script: script,
            };

            it('is valid', () => {
                expect(keeperTxFactory(txSetAssetScript)).to.be.deep.equal({
                    type: txSetAssetScript.type,
                    data: {
                        assetId: txSetAssetScript.assetId,
                        script: txSetAssetScript.script,
                    },
                });
            });

            isValidFee(txSetAssetScript);
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

            it('is valid', () => {
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

            isValidFee(txInvokeScript);
        });
    });

    describe('converting signed tx from Keeper to Signer', () => {
        function isValidTx(signedTx: SignedTx<SignerTx>, type: keyof TransactionMap) {
            it('is valid', () => {
                expect(signedTx.id).exist;
                expect(signedTx.type).to.be.equal(type);
                expect(signedTx.version).exist;
                expect(signedTx.senderPublicKey).exist;
                expect(signedTx.proofs).exist;
                expect(signedTx.chainId).exist;
                expect(signedTx.timestamp).exist;
            });
        }

        describe('issue', () => {
            const tx =
                '{"type":3,"version":2,"senderPublicKey":"5J8Xa74xPNdtYUAbiTRZiv4DHw1LBsnj5Hu2jfR2EiWR",' +
                '"name":"NonScriptToken","description":"NonScriptToken","quantity":9223372036854775807,' +
                '"script":null,"decimals":0,"reissuable":true,"fee":100000000,"timestamp":1631598834062,"chainId":84,' +
                '"proofs":["3va7tvQPwHWEZcoh6LUoVVDethHDTPhuwMkZM6nM34MV3L3wnMkPc7yNe91u1ctf8cQEjFiYQUAqq8Y6G3YGrhoB"],' +
                '"id":"2Bp948nuo35W8Mfyn43x966F5yyDco1YP3iPUpJFQUWv"}';
            const jsonTx = signerTxFactory(tx) as SignerTxToSignedTx<SignerIssueTx>;

            isValidTx(jsonTx, TRANSACTION_TYPE.ISSUE);

            it('quantity is long', () => {
                expect(jsonTx.quantity).to.be.equal(longMax);
            });
        });

        describe('transfer', () => {
            const tx =
                '{"type":4,"version":2,"senderPublicKey":"5J8Xa74xPNdtYUAbiTRZiv4DHw1LBsnj5Hu2jfR2EiWR",' +
                '"assetId":null,"recipient":"alias:T:merry","amount":9223372036854775807,"attachment":"","fee":100000,"feeAssetId":null,' +
                '"timestamp":1631600073629,"proofs":["64aFuZfht5f2jQ3CjeKenE1EQfrkQBpizkUVrVuSjnjbQRyxq6Kn53ps1zYXxUmVU2jzRpUSWHea2C7rus6Bk2q5"],' +
                '"chainId":84,"id":"FxdVVSaxg39w4wjxhdg9eEEhHJhiMHZHdX7P2LxiNAU7"}';
            const jsonTx = signerTxFactory(tx) as SignerTxToSignedTx<SignerTransferTx>;

            isValidTx(jsonTx, TRANSACTION_TYPE.TRANSFER);

            it('amount is long', () => {
                expect(jsonTx.amount).to.be.equal(longMax);
            });
        });

        describe('reissue', () => {
            const tx =
                '{"type":5,"version":2,"senderPublicKey":"5J8Xa74xPNdtYUAbiTRZiv4DHw1LBsnj5Hu2jfR2EiWR",' +
                '"assetId":"7sP5abE9nGRwZxkgaEXgkQDZ3ERBcm9PLHixaUE5SYoT","quantity":9223372036854775807,"reissuable":true,' +
                '"chainId":84,"fee":100000000,"timestamp":1631601181966,"proofs":["5gaXGhUCp445rt3AJiW9HUcnFDMrABP2rPx7becf5eLK1XjztiDtGg4FPDps45dCLask3WQokcGUtAg1aYJLDNAR"],' +
                '"id":"HesBbvik7ZAU3poHKkYgvPNmLkhVdCZ6hwpc2gRALJK1"}';
            const jsonTx = signerTxFactory(tx) as SignerTxToSignedTx<SignerReissueTx>;

            isValidTx(jsonTx, TRANSACTION_TYPE.REISSUE);

            it('quantity is long', () => {
                expect(jsonTx.quantity).to.be.equal(longMax);
            });
        });

        describe('burn', () => {
            const tx =
                '{"type":6,"version":2,"senderPublicKey":"5J8Xa74xPNdtYUAbiTRZiv4DHw1LBsnj5Hu2jfR2EiWR",' +
                '"assetId":"7sP5abE9nGRwZxkgaEXgkQDZ3ERBcm9PLHixaUE5SYoT","amount":9223372036854775807,"chainId":84,' +
                '"fee":100000,"timestamp":1631601295621,"proofs":["62frDCYP51Gkv6qV6gtcqfiume8VnnDKE6Em3fRb6pBmK4mYu7gDomp24Nx5wX9CKipmBTzZRsBxvekKud3Aze5y"],' +
                '"id":"GqHCGGrkhmghxjpiqLQsPpzRUoiRXcBFGT2w3zc78rHW","quantity":{"bn":{"s":1,"e":18,"c":[92233,72036854775807]}}}';
            const jsonTx = signerTxFactory(tx) as SignerTxToSignedTx<SignerBurnTx>;

            isValidTx(jsonTx, TRANSACTION_TYPE.BURN);

            it('amount is long', () => {
                expect(jsonTx.amount).to.be.equal(longMax);
            });
        });

        describe('lease', () => {
            const tx =
                '{"type":8,"version":2,"senderPublicKey":"5J8Xa74xPNdtYUAbiTRZiv4DHw1LBsnj5Hu2jfR2EiWR",' +
                '"amount":9223372036854775807,"recipient":"alias:T:merry","fee":100000,"timestamp":1631601942821,' +
                '"proofs":["21tzJ23wi8JVagA2Pk4EDgPpEZTEXJisheiNxPgnQyX2RUQzzFrpAwdY3TR979U1ZdFedf9Sm4AUJjcGojc78CfG"],' +
                '"chainId":84,"id":"CDeJFP8zCzS55eBve5wrCt7XaEKm9gPVuKJG2VrtUnU7","leaseAssetId":null}';
            const jsonTx = signerTxFactory(tx) as SignerTxToSignedTx<SignerLeaseTx>;

            isValidTx(jsonTx, TRANSACTION_TYPE.LEASE);
        });

        describe('lease cancel', () => {
            const tx =
                '{"type":9,"version":2,"senderPublicKey":"5J8Xa74xPNdtYUAbiTRZiv4DHw1LBsnj5Hu2jfR2EiWR",' +
                '"leaseId":"6r2u8Bf3WTqJw4HQvPTsWs8Zak5PLwjzjjGU76nXph1u","fee":100000,"timestamp":1631602199008,' +
                '"chainId":84,"proofs":["5wWwdaKnKyshBwdLRZtmHLgcSEopqNGSn72xjEGEVb1QYho2GuEJFq4yz4pnP8TB2HALnyJGD2Mkt7VoKJ9Rght8"],' +
                '"id":"CRkSDzty2VfnWaYpSq35hs7oYSdpacXAfhjEzSr4dvhM"}';
            const jsonTx = signerTxFactory(tx) as SignerTxToSignedTx<SignerCancelLeaseTx>;

            isValidTx(jsonTx, TRANSACTION_TYPE.CANCEL_LEASE);
        });

        describe('alias', () => {
            const tx =
                '{"type":10,"version":2,"senderPublicKey":"5J8Xa74xPNdtYUAbiTRZiv4DHw1LBsnj5Hu2jfR2EiWR",' +
                '"alias":"testy","fee":100000,"timestamp":1631602241360,"chainId":84,' +
                '"proofs":["53PSrkG39n5KjpBp9kTQiP7SXyxYWzPDUQQ7sh66CwvcyhbcjGEyZU1omTT56u4YSUmhcjkdD6yHMhUxUTvKGjC9"],' +
                '"id":"J2nE6nHhZ8N9CKsx6P3K1dRa6ZTKiKYeWxZADPAFfQMP"}';
            const jsonTx = signerTxFactory(tx) as SignerTxToSignedTx<SignerAliasTx>;

            isValidTx(jsonTx, TRANSACTION_TYPE.ALIAS);
        });

        describe('mass transfer', () => {
            const tx =
                '{"type":11,"version":1,"senderPublicKey":"5J8Xa74xPNdtYUAbiTRZiv4DHw1LBsnj5Hu2jfR2EiWR","assetId":null,' +
                '"transfers":[{"recipient":"alias:T:testy","amount":9223372036854775807},' +
                '{"recipient":"alias:T:merry","amount":1}],"fee":200000,"timestamp":1631605221662,"attachment":"",' +
                '"proofs":["5m8FTY9bExL52fzCuaT1dVL65WtRMtdYHAFyHxQCZjrrHzsQVJ4knSvqA6pP3kGSPthmDto811612anNjut8kg7b"],' +
                '"chainId":84,"id":"6cHCKWyCW8g559CWWJDAL8iV57TJGoJFfpnRZ5HAkcZD"}';
            const jsonTx = signerTxFactory(tx) as SignerTxToSignedTx<SignerMassTransferTx>;

            isValidTx(jsonTx, TRANSACTION_TYPE.MASS_TRANSFER);

            it('amount is long', () => {
                expect(jsonTx.transfers[0].amount).to.be.equal(longMax);
            });
        });

        describe('data', () => {
            const tx =
                '{"type":12,"version":1,"senderPublicKey":"5J8Xa74xPNdtYUAbiTRZiv4DHw1LBsnj5Hu2jfR2EiWR","fee":100000,' +
                '"timestamp":1631605359010,"proofs":["3TiPqCV1Y1iDsYG3VWJaunxkFy3e1TzV8Z8QuFeY6mMKord7YodZ7ndE6yUDtGjSFKesqqvRySXER6XJ3ScCnGhC"],' +
                '"chainId":84,"id":"9KCGHukX7RQYDEr2wSZmM5pGhm6Tauumxps2Sz1PXrxn",' +
                '"data":[{"value":9223372036854775807,"key":"longMaxValue","type":"integer"},{"value":-9223372036854775808,' +
                '"key":"longMinValue","type":"integer"}]}';
            const jsonTx = signerTxFactory(tx) as SignerTxToSignedTx<SignerDataTx>;

            isValidTx(jsonTx, TRANSACTION_TYPE.DATA);

            it('longMaxValue is long', () => {
                expect(jsonTx.data[0].value).to.be.equal(longMax);
            });

            it('longMinValue is long', () => {
                expect(jsonTx.data[1].value).to.be.equal(longMin);
            });
        });

        describe('set script', () => {
            const tx =
                '{"type":13,"version":1,"senderPublicKey":"5J8Xa74xPNdtYUAbiTRZiv4DHw1LBsnj5Hu2jfR2EiWR","chainId":84,' +
                '"fee":1800000,"timestamp":1631605992415,"proofs":["GsTxZsfVDyL2y8waKGvGQukFp6Ph2ko2448DG1AYrVmZZQaY4mfitXE6soV5aXKdQnTKL6iBk9ueMXqdNSMRiBf"],' +
                '"id":"BnAYgdjAywznY39Pj1Qtmpx1LjVpmt1vZtjEJACwNNhQ","script":"base64:BQbtKNoM"}';
            const jsonTx = signerTxFactory(tx) as SignerTxToSignedTx<SignerSetScriptTx>;

            isValidTx(jsonTx, TRANSACTION_TYPE.SET_SCRIPT);
        });

        describe('sponsorship', () => {
            const tx =
                '{"type":14,"version":1,"senderPublicKey":"5J8Xa74xPNdtYUAbiTRZiv4DHw1LBsnj5Hu2jfR2EiWR",' +
                '"minSponsoredAssetFee":9223372036854775807,"assetId":"7sP5abE9nGRwZxkgaEXgkQDZ3ERBcm9PLHixaUE5SYoT",' +
                '"fee":100000000,"timestamp":1631606336992,"chainId":84,' +
                '"proofs":["g3ArPaNBPL5EdDXsb7r6oooZuhGJn93JsxaSyYkTpUgsnq1Cfmqe8pVV6iP926CBbWgVP1G5Mmaiu6CMfDKAzeM"],' +
                '"id":"Age9ZkrntpB3HyE5cdHh8qyEC5dg7dgCDtrr2J1kUs89"}';
            const jsonTx = signerTxFactory(tx) as SignerTxToSignedTx<SignerSponsorshipTx>;

            isValidTx(jsonTx, TRANSACTION_TYPE.SPONSORSHIP);

            it('minSponsoredAssetFee is long', () => {
                expect(jsonTx.minSponsoredAssetFee).to.be.equal(longMax);
            });
        });

        describe('set asset script', () => {
            const tx =
                '{"type":15,"version":1,"senderPublicKey":"5J8Xa74xPNdtYUAbiTRZiv4DHw1LBsnj5Hu2jfR2EiWR",' +
                '"assetId":"7sP5abE9nGRwZxkgaEXgkQDZ3ERBcm9PLHixaUE5SYoT","chainId":84,"fee":100000000,' +
                '"timestamp":1631606518866,' +
                '"proofs":["2vJrV2uk4VSssgEVpD6rhpDrC2ctyR7dAyy3757G831MYp6V2T35eYBehLpJ13JvhF4dFrmzBqHEPb8HC8xJcyP2"],' +
                '"id":"DfdAaKyEhGV5pmqsQ4LVSFHwp71Wg4m6wiwAdY1mVdS1","script":"base64:BQbtKNoM"}';
            const jsonTx = signerTxFactory(tx) as SignerTxToSignedTx<SignerSetAssetScriptTx>;

            isValidTx(jsonTx, TRANSACTION_TYPE.SET_ASSET_SCRIPT);
        });

        describe('invoke script', () => {
            const tx =
                '{"type":16,"version":1,"senderPublicKey":"5J8Xa74xPNdtYUAbiTRZiv4DHw1LBsnj5Hu2jfR2EiWR",' +
                '"dApp":"3My2kBJaGfeM2koiZroaYdd3y8rAgfV2EAx","call":{"function":"callWithPaymentsButNoArgs",' +
                '"args":[]},"payment":[{"amount":9223372036854775807,"assetId":null}],"fee":1000000,"feeAssetId":null,' +
                '"timestamp":1631606933494,"chainId":84,' +
                '"proofs":["419Sb8KhTJfLYucSgDieQQRWmD2NLmckgWYkS5rN2H3VMs1RHZp5XRtQ9dRqox9MoJi1vxsejFN4uwUVnLVXC8p7"],' +
                '"id":"BTvyYZpGgy23eknbnnqYrJoK6q3hJDQ1A2gt6FrofNa"}';
            const jsonTx = signerTxFactory(tx) as SignerTxToSignedTx<SignerInvokeTx>;

            isValidTx(jsonTx, TRANSACTION_TYPE.INVOKE_SCRIPT);

            it('payment amount is long', () => {
                expect(jsonTx.payment![0].amount).to.be.equal(longMax);
            });
        });
    });
});
