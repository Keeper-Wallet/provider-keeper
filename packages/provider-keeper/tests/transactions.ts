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
} from '@waves/signer';
import { TRANSACTION_TYPE } from '@waves/ts-types';

const assetId = '7sP5abE9nGRwZxkgaEXgkQDZ3ERBcm9PLHixaUE5SYoT';
const leaseId = '6r2u8Bf3WTqJw4HQvPTsWs8Zak5PLwjzjjGU76nXph1u';
const aliasStr = 'merry';
const recipient = '3N5HNJz5otiUavvoPrxMBrXBVv5HhYLdhiD';
const script = 'base64:BQbtKNoM';
const attachment = 'base64:BQbtKNoM';
const amount = 123456790;
const longMax = '9223372036854775807';
const longMin = '-9223372036854775808';
const dApp = '3My2kBJaGfeM2koiZroaYdd3y8rAgfV2EAx';
const dAppMinFee = 1000000;
const scriptTrue = 'base64:BQbtKNoM';
// compiled version of `scriptTest.ride`
const scriptTest =
    'base64:AAIFAAAAAAAAAiUIAhIAEgASBgoEAgQBCBIGCgQSFBEYGgcKAmExEgFpGgoKAmEyEgR0eElkGhQKAmEzEg5hZGRQYXltZW50SW5mbxoJCgJhNBIDYWNjGgsKAmE1EgVpbmRleBoJCgJhNhIDcG10GgsKAmE3EgVhc3NldBoNCgJhOBIHJG1hdGNoMBoICgJhORICaWQaCwoCYjESBXdhdmVzGhEKAmIyEgskbGlzdDcxNDc3NRoRCgJiMxILJHNpemU3MTQ3NzUaEQoCYjQSCyRhY2MwNzE0Nzc1GhEKAmI1EgskYWNjMTcxNDc3NRoRCgJiNhILJGFjYzI3MTQ3NzUaEQoCYjcSCyRhY2MzNzE0Nzc1GhEKAmI4EgskYWNjNDcxNDc3NRoRCgJiORILJGFjYzU3MTQ3NzUaEQoCYzESCyRhY2M2NzE0Nzc1GhEKAmMyEgskYWNjNzcxNDc3NRoRCgJjMxILJGFjYzg3MTQ3NzUaEQoCYzQSCyRhY2M5NzE0Nzc1GhIKAmM1EgwkYWNjMTA3MTQ3NzUaEgoCYzYSDCRhY2MxMTcxNDc3NRoJCgJjNxIDYmluGgoKAmM4EgRib29sGgkKAmM5EgNpbnQaCQoCZDESA3N0choNCgJkMhIHYmluU2l6ZRoOCgJkMxIIYm9vbFNpemUaDQoCZDQSB2ludFNpemUaDQoCZDUSB3N0clNpemUaCAoCZDYSAnR4GgwKAmQ3EgZ2ZXJpZnkAAAAAAAAABAAAAAJhMQEAAAAHZGVmYXVsdAAAAAAJAARMAAAAAgkBAAAAC1N0cmluZ0VudHJ5AAAAAgIAAAAPZGVmYXVsdC1jYWxsLWlkCQACWAAAAAEIBQAAAAJhMQAAAA10cmFuc2FjdGlvbklkBQAAAANuaWwAAAACYTEBAAAAGWNhbGxXaXRoUGF5bWVudHNCdXROb0FyZ3MAAAAABAAAAAJhMgkAAlgAAAABCAUAAAACYTEAAAANdHJhbnNhY3Rpb25JZAoBAAAAAmEzAAAAAgAAAAJhNAAAAAJhNQMJAABnAAAAAgUAAAACYTUJAAGQAAAAAQgFAAAAAmExAAAACHBheW1lbnRzBQAAAAJhNAQAAAACYTYJAAGRAAAAAggFAAAAAmExAAAACHBheW1lbnRzBQAAAAJhNQQAAAACYTcEAAAAAmE4CAUAAAACYTYAAAAHYXNzZXRJZAMJAAABAAAAAgUAAAACYTgCAAAACkJ5dGVWZWN0b3IEAAAAAmE5BQAAAAJhOAkAASwAAAACCQABLAAAAAIJAAEsAAAAAggJAQAAAAV2YWx1ZQAAAAEJAAPsAAAAAQUAAAACYTkAAAAEbmFtZQIAAAACICgJAAJYAAAAAQUAAAACYTkCAAAAASkDCQAAAQAAAAIFAAAAAmE4AgAAAARVbml0BAAAAAJiMQUAAAACYTgCAAAABVdBVkVTCQAAAgAAAAECAAAAC01hdGNoIGVycm9yCQAETQAAAAIFAAAAAmE0CQEAAAALU3RyaW5nRW50cnkAAAACCQABLAAAAAIJAAEsAAAAAgUAAAACYTICAAAAAV8JAAGkAAAAAQUAAAACYTUJAAEsAAAAAgkAASwAAAACCQABpAAAAAEIBQAAAAJhNgAAAAZhbW91bnQCAAAAASAFAAAAAmE3BAAAAAJiMgkABEwAAAACAAAAAAAAAAAACQAETAAAAAIAAAAAAAAAAAEJAARMAAAAAgAAAAAAAAAAAgkABEwAAAACAAAAAAAAAAADCQAETAAAAAIAAAAAAAAAAAQJAARMAAAAAgAAAAAAAAAABQkABEwAAAACAAAAAAAAAAAGCQAETAAAAAIAAAAAAAAAAAcJAARMAAAAAgAAAAAAAAAACAkABEwAAAACAAAAAAAAAAAJBQAAAANuaWwEAAAAAmIzCQABkAAAAAEFAAAAAmIyBAAAAAJiNAUAAAADbmlsAwkAAAAAAAACBQAAAAJiMwAAAAAAAAAAAAUAAAACYjQEAAAAAmI1CQEAAAACYTMAAAACBQAAAAJiNAkAAZEAAAACBQAAAAJiMgAAAAAAAAAAAAMJAAAAAAAAAgUAAAACYjMAAAAAAAAAAAEFAAAAAmI1BAAAAAJiNgkBAAAAAmEzAAAAAgUAAAACYjUJAAGRAAAAAgUAAAACYjIAAAAAAAAAAAEDCQAAAAAAAAIFAAAAAmIzAAAAAAAAAAACBQAAAAJiNgQAAAACYjcJAQAAAAJhMwAAAAIFAAAAAmI2CQABkQAAAAIFAAAAAmIyAAAAAAAAAAACAwkAAAAAAAACBQAAAAJiMwAAAAAAAAAAAwUAAAACYjcEAAAAAmI4CQEAAAACYTMAAAACBQAAAAJiNwkAAZEAAAACBQAAAAJiMgAAAAAAAAAAAwMJAAAAAAAAAgUAAAACYjMAAAAAAAAAAAQFAAAAAmI4BAAAAAJiOQkBAAAAAmEzAAAAAgUAAAACYjgJAAGRAAAAAgUAAAACYjIAAAAAAAAAAAQDCQAAAAAAAAIFAAAAAmIzAAAAAAAAAAAFBQAAAAJiOQQAAAACYzEJAQAAAAJhMwAAAAIFAAAAAmI5CQABkQAAAAIFAAAAAmIyAAAAAAAAAAAFAwkAAAAAAAACBQAAAAJiMwAAAAAAAAAABgUAAAACYzEEAAAAAmMyCQEAAAACYTMAAAACBQAAAAJjMQkAAZEAAAACBQAAAAJiMgAAAAAAAAAABgMJAAAAAAAAAgUAAAACYjMAAAAAAAAAAAcFAAAAAmMyBAAAAAJjMwkBAAAAAmEzAAAAAgUAAAACYzIJAAGRAAAAAgUAAAACYjIAAAAAAAAAAAcDCQAAAAAAAAIFAAAAAmIzAAAAAAAAAAAIBQAAAAJjMwQAAAACYzQJAQAAAAJhMwAAAAIFAAAAAmMzCQABkQAAAAIFAAAAAmIyAAAAAAAAAAAIAwkAAAAAAAACBQAAAAJiMwAAAAAAAAAACQUAAAACYzQEAAAAAmM1CQEAAAACYTMAAAACBQAAAAJjNAkAAZEAAAACBQAAAAJiMgAAAAAAAAAACQMJAAAAAAAAAgUAAAACYjMAAAAAAAAAAAoFAAAAAmM1BAAAAAJjNgkBAAAAAmEzAAAAAgUAAAACYzUJAAGRAAAAAgUAAAACYjIAAAAAAAAAAAoJAAACAAAAAQIAAAATTGlzdCBzaXplIGV4Y2VlZCAxMAAAAAJhMQEAAAAfY2FsbFdpdGhOYXRpdmVBcmdzQW5kTm9QYXltZW50cwAAAAQAAAACYzcAAAACYzgAAAACYzkAAAACZDEEAAAAAmEyCQACWAAAAAEIBQAAAAJhMQAAAA10cmFuc2FjdGlvbklkCQAETAAAAAIJAQAAAAtCaW5hcnlFbnRyeQAAAAIJAAEsAAAAAgUAAAACYTICAAAABF9iaW4FAAAAAmM3CQAETAAAAAIJAQAAAAxCb29sZWFuRW50cnkAAAACCQABLAAAAAIFAAAAAmEyAgAAAAVfYm9vbAUAAAACYzgJAARMAAAAAgkBAAAADEludGVnZXJFbnRyeQAAAAIJAAEsAAAAAgUAAAACYTICAAAABF9pbnQFAAAAAmM5CQAETAAAAAIJAQAAAAtTdHJpbmdFbnRyeQAAAAIJAAEsAAAAAgUAAAACYTICAAAABF9zdHIFAAAAAmQxBQAAAANuaWwAAAACYTEBAAAAHWNhbGxXaXRoTGlzdEFyZ3NBbmROb1BheW1lbnRzAAAABAAAAAJjNwAAAAJjOAAAAAJjOQAAAAJkMQQAAAACYTIJAAJYAAAAAQgFAAAAAmExAAAADXRyYW5zYWN0aW9uSWQEAAAAAmQyCQABkAAAAAEFAAAAAmM3BAAAAAJkMwkAAZAAAAABBQAAAAJjOAQAAAACZDQJAAGQAAAAAQUAAAACYzkEAAAAAmQ1CQABkAAAAAEFAAAAAmQxCQAETAAAAAIJAQAAAAxJbnRlZ2VyRW50cnkAAAACCQABLAAAAAIFAAAAAmEyAgAAAAlfYmluX3NpemUFAAAAAmQyCQAETAAAAAIJAQAAAAtCaW5hcnlFbnRyeQAAAAIJAAEsAAAAAgUAAAACYTICAAAACl9iaW5fZmlyc3QJAAGRAAAAAgUAAAACYzcAAAAAAAAAAAAJAARMAAAAAgkBAAAAC0JpbmFyeUVudHJ5AAAAAgkAASwAAAACBQAAAAJhMgIAAAAJX2Jpbl9sYXN0CQABkQAAAAIFAAAAAmM3CQAAZQAAAAIFAAAAAmQyAAAAAAAAAAABCQAETAAAAAIJAQAAAAxJbnRlZ2VyRW50cnkAAAACCQABLAAAAAIFAAAAAmEyAgAAAApfYm9vbF9zaXplBQAAAAJkMwkABEwAAAACCQEAAAAMQm9vbGVhbkVudHJ5AAAAAgkAASwAAAACBQAAAAJhMgIAAAALX2Jvb2xfZmlyc3QJAAGRAAAAAgUAAAACYzgAAAAAAAAAAAAJAARMAAAAAgkBAAAADEJvb2xlYW5FbnRyeQAAAAIJAAEsAAAAAgUAAAACYTICAAAACl9ib29sX2xhc3QJAAGRAAAAAgUAAAACYzgJAABlAAAAAgUAAAACZDMAAAAAAAAAAAEJAARMAAAAAgkBAAAADEludGVnZXJFbnRyeQAAAAIJAAEsAAAAAgUAAAACYTICAAAACV9pbnRfc2l6ZQUAAAACZDQJAARMAAAAAgkBAAAADEludGVnZXJFbnRyeQAAAAIJAAEsAAAAAgUAAAACYTICAAAACl9pbnRfZmlyc3QJAAGRAAAAAgUAAAACYzkAAAAAAAAAAAAJAARMAAAAAgkBAAAADEludGVnZXJFbnRyeQAAAAIJAAEsAAAAAgUAAAACYTICAAAACV9pbnRfbGFzdAkAAZEAAAACBQAAAAJjOQkAAGUAAAACBQAAAAJkNAAAAAAAAAAAAQkABEwAAAACCQEAAAAMSW50ZWdlckVudHJ5AAAAAgkAASwAAAACBQAAAAJhMgIAAAAJX3N0cl9zaXplBQAAAAJkNQkABEwAAAACCQEAAAALU3RyaW5nRW50cnkAAAACCQABLAAAAAIFAAAAAmEyAgAAAApfc3RyX2ZpcnN0CQABkQAAAAIFAAAAAmQxAAAAAAAAAAAACQAETAAAAAIJAQAAAAtTdHJpbmdFbnRyeQAAAAIJAAEsAAAAAgUAAAACYTICAAAACV9zdHJfbGFzdAkAAZEAAAACBQAAAAJkMQkAAGUAAAACBQAAAAJkNQAAAAAAAAAAAQUAAAADbmlsAAAAAQAAAAJkNgEAAAACZDcAAAAACQAB9AAAAAMIBQAAAAJkNgAAAAlib2R5Qnl0ZXMJAAGRAAAAAggFAAAAAmQ2AAAABnByb29mcwAAAAAAAAAAAAgFAAAAAmQ2AAAAD3NlbmRlclB1YmxpY0tleYCvB0c=';

export const ISSUE: SignerIssueTx = {
    type: TRANSACTION_TYPE.ISSUE,
    name: 'ScriptToken',
    decimals: 8,
    quantity: longMax,
    reissuable: true,
    description: 'ScriptToken',
    script: script,
};

export const TRANSFER: SignerTransferTx = {
    type: TRANSACTION_TYPE.TRANSFER,
    recipient,
    assetId: assetId,
    amount: amount,
    attachment: attachment,
};

export const REISSUE: SignerReissueTx = {
    type: TRANSACTION_TYPE.REISSUE,
    assetId: assetId,
    quantity: amount,
    reissuable: true,
};

export const BURN: SignerBurnTx = {
    type: TRANSACTION_TYPE.BURN,
    assetId: assetId,
    amount: amount,
};

export const LEASE: SignerLeaseTx = {
    type: TRANSACTION_TYPE.LEASE,
    recipient: recipient,
    amount: amount,
};

export const CANCEL_LEASE: SignerCancelLeaseTx = {
    type: TRANSACTION_TYPE.CANCEL_LEASE,
    leaseId: leaseId,
};

export const ALIAS: SignerAliasTx = {
    type: TRANSACTION_TYPE.ALIAS,
    alias: aliasStr,
};

export const MASS_TRANSFER: SignerMassTransferTx = {
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

export const DATA: SignerDataTx = {
    type: TRANSACTION_TYPE.DATA,
    data: [
        { key: 'stringValue', type: 'string', value: 'Lorem ipsum dolor sit amet' },
        { key: 'longMaxValue', type: 'integer', value: longMax },
        { key: 'flagValue', type: 'boolean', value: true },
        { key: 'base64', type: 'binary', value: script },
    ],
};

export const SET_SCRIPT: SignerSetScriptTx = {
    type: TRANSACTION_TYPE.SET_SCRIPT,
    script: script,
};

export const SPONSORSHIP: SignerSponsorshipTx = {
    type: TRANSACTION_TYPE.SPONSORSHIP,
    assetId: assetId,
    minSponsoredAssetFee: amount,
};

export const SET_ASSET_SCRIPT: SignerSetAssetScriptTx = {
    type: TRANSACTION_TYPE.SET_ASSET_SCRIPT,
    assetId: assetId,
    script: script,
};

export const INVOKE: SignerInvokeTx = {
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

export const INVOKE_DEFAULT_CALL: SignerInvokeTx = {
    type: TRANSACTION_TYPE.INVOKE_SCRIPT,
    dApp: dApp,
    fee: dAppMinFee,
    call: {
        function: 'default',
        args: [],
    },
    payment: [],
};

export const INVOKE_NO_ARGS_SINGLE_PAYMENTS: SignerInvokeTx = {
    type: TRANSACTION_TYPE.INVOKE_SCRIPT,
    dApp: dApp,
    fee: dAppMinFee,
    payment: [
        {
            assetId: 'WAVES',
            amount: longMax,
        },
    ],
    call: {
        function: 'callWithPaymentsButNoArgs',
        args: [],
    },
};

export const INVOKE_NO_ARGS_MANY_PAYMENTS: SignerInvokeTx = {
    type: TRANSACTION_TYPE.INVOKE_SCRIPT,
    dApp: dApp,
    fee: dAppMinFee,
    payment: [
        {
            assetId: 'WAVES',
            amount: 1,
        },
        {
            assetId: 'WAVES',
            amount: 1,
        },
        {
            assetId: 'WAVES',
            amount: 1,
        },
        {
            assetId: 'WAVES',
            amount: 1,
        },
        {
            assetId: 'WAVES',
            amount: 1,
        },
        {
            assetId: 'WAVES',
            amount: 1,
        },
        {
            assetId: 'WAVES',
            amount: 1,
        },
        {
            assetId: 'WAVES',
            amount: 1,
        },
        {
            assetId: 'WAVES',
            amount: 1,
        },
        {
            assetId: 'WAVES',
            amount: 1,
        },
    ],
    call: {
        function: 'callWithPaymentsButNoArgs',
        args: [],
    },
};

export const INVOKE_NATIVE_ARGS_NO_PAYMENTS: SignerInvokeTx = {
    type: TRANSACTION_TYPE.INVOKE_SCRIPT,
    dApp: dApp,
    fee: dAppMinFee,
    call: {
        function: 'callWithNativeArgsAndNoPayments',
        args: [
            { type: 'binary', value: 'base64:BQbtKNoM' },
            { type: 'boolean', value: true },
            { type: 'integer', value: longMax },
            { type: 'string', value: 'Lorem ipsum dolor sit amet' },
        ],
    },
    payment: [],
};

export const INVOKE_LIST_ARGS_NO_PAYMENTS: SignerInvokeTx = {
    type: TRANSACTION_TYPE.INVOKE_SCRIPT,
    dApp: dApp,
    fee: dAppMinFee,
    call: {
        function: 'callWithListArgsAndNoPayments',
        args: [
            {
                type: 'list',
                value: [
                    { type: 'binary', value: scriptTrue },
                    { type: 'binary', value: scriptTest },
                ],
            },
            {
                type: 'list',
                value: [
                    { type: 'boolean', value: true },
                    { type: 'boolean', value: false },
                ],
            },
            {
                type: 'list',
                value: [
                    { type: 'integer', value: longMax },
                    { type: 'integer', value: longMin },
                ],
            },
            {
                type: 'list',
                value: [
                    { type: 'string', value: 'Lorem ipsum' },
                    { type: 'string', value: 'dolor sit amet' },
                ],
            },
        ],
    },
    payment: [],
};
