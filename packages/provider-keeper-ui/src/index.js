import { Signer } from '@waves/signer';
import { ProviderKeeper } from '@waves/provider-keeper';

const assetScript = '7sP5abE9nGRwZxkgaEXgkQDZ3ERBcm9PLHixaUE5SYoT';
const scriptTrue = 'base64:BQbtKNoM';
const scriptTest =
    'base64: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';
const longMaxValue = '9223372036854775807';
const longMinValue = '-9223372036854775808';

let dApp = '3My2kBJaGfeM2koiZroaYdd3y8rAgfV2EAx';
let dAppMinFee = 1000000;

const txDataExample = {
    issueScript: {
        name: 'ScriptToken',
        decimals: 1,
        quantity: longMaxValue,
        reissuable: true,
        description: 'ScriptToken',
        script: scriptTrue,
    },
    transfer: {
        recipient: 'merry',
        amount: 1,
    },
    reissue: {
        assetId: assetScript,
        quantity: longMaxValue,
        reissuable: true,
    },
    burn: {
        assetId: assetScript,
        amount: longMaxValue,
    },
    lease: {
        amount: longMaxValue,
        recipient: 'merry',
    },
    cancelLease: {
        leaseId: '6r2u8Bf3WTqJw4HQvPTsWs8Zak5PLwjzjjGU76nXph1u',
    },
    alias: {
        alias: `testy`,
    },
    massTransfer: {
        transfers: [
            {
                amount: longMaxValue,
                recipient: 'testy',
            },
            {
                amount: 1,
                recipient: 'merry',
            },
        ],
    },
    data: {
        data: [
            { key: 'name', type: 'string', value: 'Lorem ipsum dolor sit amet' },
            { key: 'longMaxValue', type: 'integer', value: longMaxValue },
            { key: 'longMinValue', type: 'integer', value: longMinValue },
            { key: 'flag1', type: 'boolean', value: true },
            { key: 'flag2', type: 'boolean', value: true },
            { key: 'flag3', type: 'boolean', value: true },
            { key: 'flag4', type: 'boolean', value: true },
        ],
    },
    dataRemove: {
        data: [
            { key: 'flag1', type: 'boolean', value: null },
            // {key: 'flag2', value: null},
            // {key: 'flag3', type: null},
            // {key: 'flag4'}
        ],
    },
    setScript: {
        fee: 1800000,
        script: scriptTest,
    },
    sponsorship: {
        assetId: assetScript,
        minSponsoredAssetFee: longMaxValue,
    },
    setAssetScript: {
        assetId: assetScript,
        script: scriptTrue,
    },
    invokeDefault: {
        dApp: dApp,
        fee: dAppMinFee,
        call: {
            function: 'default',
            args: [],
        },
        payment: [],
    },
    invokeNull: {
        dApp: dApp,
        fee: dAppMinFee,
        call: null,
        payment: [],
    },
    callWithNoArgsButSinglePayment: {
        dApp: dApp,
        fee: dAppMinFee,
        payment: [
            {
                assetId: 'WAVES',
                amount: longMaxValue,
            },
        ],
        call: {
            function: 'callWithPaymentsButNoArgs',
            args: [],
        },
    },
    callWithNoArgsButManyPayments: {
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
    },
    callWithNativeArgsAndNoPayments: {
        dApp: dApp,
        fee: dAppMinFee,
        call: {
            function: 'callWithNativeArgsAndNoPayments',
            args: [
                { type: 'binary', value: 'base64:BQbtKNoM' },
                { type: 'boolean', value: true },
                { type: 'integer', value: longMaxValue },
                { type: 'string', value: 'Lorem ipsum dolor sit amet' },
            ],
        },
        payment: [],
    },
    callWithListArgsAndNoPayments: {
        dApp: dApp,
        fee: dAppMinFee,
        call: {
            function: 'callWithListArgsAndNoPayments',
            args: [
                {
                    type: 'list',
                    value: [
                        { type: 'binary', value: 'base64:BQbtKNoM' },
                        { type: 'binary', value: 'base64:BQbtKNoM' },
                    ],
                },
                {
                    type: 'list',
                    value: [
                        { type: 'boolean', value: true },
                        { type: 'boolean', value: false },
                        { type: 'boolean', value: true },
                    ],
                },
                {
                    type: 'list',
                    value: [
                        { type: 'integer', value: longMaxValue },
                        { type: 'integer', value: longMinValue },
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
    },
};
const signer = new Signer({ NODE_URL: 'https://nodes-testnet.wavesnodes.com', LOG_LEVEL: 'verbose' });
const provider = new ProviderKeeper({ data: 'test-generated-data' });
signer.setProvider(provider);

document.querySelector('.js-login').addEventListener('click', async function (evt) {
    try {
        const userData = await signer.login();
        evt.target.classList.add('clicked');
        evt.target.innerHTML = `
            authorized as <br>
            ${userData.address}`;
        document.querySelector('.explorer-link').innerHTML =
            `<a href='https://wavesexplorer.com/testnet/address/${userData.address}' target='_blank'>` +
            `Check the Explorer</a>`;
        console.log(userData);
    } catch (e) {
        console.error('login rejected');
    }
});

document.querySelector('.js-issue').addEventListener('click', function () {
    signer
        .issue({
            name: 'NonScriptToken',
            decimals: 0,
            quantity: longMaxValue,
            reissuable: true,
            description: 'NonScriptToken',
        })
        .broadcast()
        .then(console.log);
});

document.querySelectorAll('.js').forEach((js) => {
    js.addEventListener('click', function (evt) {
        const { type, tx: _txData = type } = evt.target.dataset;
        signer[type](txDataExample[_txData]).sign().then(console.log);
    });
});

document.querySelector('.js-transfer-package').addEventListener('click', function () {
    signer
        .transfer({
            recipient: 'merry',
            amount: 100,
        })
        .transfer({
            recipient: dApp,
            amount: 100,
        })
        .sign()
        .then(console.log);
});
