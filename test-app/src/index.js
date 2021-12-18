import { Signer } from '@waves/signer';
import { ProviderKeeper } from '@waves/provider-keeper';
import { json } from '@waves/marshall';
import { TRANSACTION_TYPE } from '@waves/ts-types';

let signer, input, output;

window.setInput = value => {
    resetIO();
    input = value;

    document.querySelector('#input').textContent = JSON.stringify(value);
    document.querySelector('#send-tx.disabled').classList.remove('disabled');
};

const setOutput = value => {
    output = value;

    if (!Array.isArray(value)) {
        value = [value];
    }

    document.querySelector('#output').textContent = value
        .map(item => {
            const stringify = !!value.type ? json.stringifyTx : JSON.stringify;
            return stringify(item) || stringify(item.message);
        })
        .join('\n');
};

window.getOutput = () => {
    return output;
};

window.setupSigner = async nodeUrl => {
    document.querySelector('#sign-in').classList.add('disabled');
    signer = new Signer({ NODE_URL: nodeUrl, LOG_LEVEL: 'verbose' });
    const provider = new ProviderKeeper({ data: 'test-generated-data' });
    await signer.setProvider(provider);
    document.querySelector('#sign-in').classList.remove('disabled');
};

const resetIO = () => {
    input = output = null;
    document.querySelector('#input').textContent = '';
    document.querySelector('#output').textContent = '';
    document.querySelector('#send-tx').classList.add('disabled');
};

resetIO();
window.setupSigner('https://nodes-testnet.wavesnodes.com');

const signerByTxType = tx => {
    if (Array.isArray(tx)) {
        return signer.batch(tx);
    }

    switch (tx.type) {
        case TRANSACTION_TYPE.ISSUE:
            return signer.issue(tx);
        case TRANSACTION_TYPE.TRANSFER:
            return signer.transfer(tx);
        case TRANSACTION_TYPE.REISSUE:
            return signer.reissue(tx);
        case TRANSACTION_TYPE.BURN:
            return signer.burn(tx);
        case TRANSACTION_TYPE.LEASE:
            return signer.lease(tx);
        case TRANSACTION_TYPE.CANCEL_LEASE:
            return signer.cancelLease(tx);
        case TRANSACTION_TYPE.ALIAS:
            return signer.alias(tx);
        case TRANSACTION_TYPE.MASS_TRANSFER:
            return signer.massTransfer(tx);
        case TRANSACTION_TYPE.DATA:
            return signer.data(tx);
        case TRANSACTION_TYPE.SET_SCRIPT:
            return signer.setScript(tx);
        case TRANSACTION_TYPE.SPONSORSHIP:
            return signer.sponsorship(tx);
        case TRANSACTION_TYPE.SET_ASSET_SCRIPT:
            return signer.setAssetScript(tx);
        case TRANSACTION_TYPE.INVOKE_SCRIPT:
            return signer.invoke(tx);
        default:
            throw new Error('Unsupported transaction type');
    }
};

document.querySelector('#sign-in').addEventListener('click', async evt => {
    if (evt.target.classList.contains('disabled')) {
        return;
    }
    try {
        setOutput(await signer.login());
    } catch (err) {
        setOutput(err);
    }
});

document.querySelector('#send-tx').addEventListener('click', async evt => {
    if (evt.target.classList.contains('disabled')) {
        return;
    }
    try {
        evt.target.classList.add('disabled');
        setOutput(await signerByTxType(input).sign());
    } catch (err) {
        setOutput(err);
    }
});
