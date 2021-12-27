import { AuthEvents, ConnectOptions, Handler, Provider, SignedTx, SignerTx, TypedData, UserData } from '@waves/signer';
import { EventEmitter } from 'typed-ts-events';
import { base16Encode, base64Encode, randomBytes, stringToBytes } from '@waves/ts-lib-crypto';
import { keeperTxFactory, signerTxFactory } from './adapter';
import { ensureNetwork } from './decorators';

export class ProviderKeeper implements Provider {
    public user: UserData | null = null;
    private readonly _authData: WavesKeeper.IAuthData;
    private _api!: WavesKeeper.TWavesKeeperApi;
    private _options: ConnectOptions = {
        NETWORK_BYTE: 'W'.charCodeAt(0),
        NODE_URL: 'https://nodes.wavesnodes.com',
    };
    private readonly _emitter: EventEmitter<AuthEvents> = new EventEmitter<AuthEvents>();
    private readonly _maxRetries = 10;

    constructor() {
        this._authData = { data: base16Encode(randomBytes(16)) };
    }

    public on<EVENT extends keyof AuthEvents>(event: EVENT, handler: Handler<AuthEvents[EVENT]>): Provider {
        this._emitter.on(event, handler);

        return this;
    }

    public once<EVENT extends keyof AuthEvents>(event: EVENT, handler: Handler<AuthEvents[EVENT]>): Provider {
        this._emitter.once(event, handler);

        return this;
    }

    public off<EVENT extends keyof AuthEvents>(event: EVENT, handler: Handler<AuthEvents[EVENT]>): Provider {
        this._emitter.off(event, handler);

        return this;
    }

    public connect(options: ConnectOptions): Promise<void> {
        this._options = options;

        const poll = (resolve, reject, attempt = 0) => {
            if (attempt > this._maxRetries) {
                return reject(new Error('WavesKeeper is not installed.'));
            }

            if (!!window.WavesKeeper) {
                return window.WavesKeeper.initialPromise.then(api => resolve((this._api = api)));
            } else setTimeout(() => poll(resolve, reject, ++attempt), 100);
        };

        return new Promise(poll);
    }

    @ensureNetwork
    public login(): Promise<UserData> {
        return this._api.auth(this._authData).then(auth => {
            this.user = { address: auth.address, publicKey: auth.publicKey };
            this._emitter.trigger('login', this.user);
            return this.user;
        });
    }

    public logout(): Promise<void> {
        this.user = null;
        this._emitter.trigger('logout', void 0);
        return Promise.resolve();
    }

    @ensureNetwork
    public signMessage(data: string | number): Promise<string> {
        return this._api
            .signCustomData({
                version: 1,
                binary: 'base64:' + base64Encode(stringToBytes(String(data))),
            })
            .then(data => data.signature);
    }

    @ensureNetwork
    public signTypedData(data: Array<TypedData>): Promise<string> {
        return this._api
            .signCustomData({
                version: 2,
                data: data as WavesKeeper.TTypedData[],
            })
            .then(data => data.signature);
    }

    public sign<T extends SignerTx>(toSign: T[]): Promise<SignedTx<T>>;
    @ensureNetwork
    public sign<T extends Array<SignerTx>>(toSign: T): Promise<SignedTx<T>> {
        if (toSign.length == 1) {
            return this._api
                .signTransaction(keeperTxFactory(toSign[0]))
                .then(data => [signerTxFactory(data)]) as Promise<SignedTx<T>>;
        }

        return this._api
            .signTransactionPackage(toSign.map(tx => keeperTxFactory(tx)) as WavesKeeper.TSignTransactionPackageData)
            .then(data => data.map(tx => signerTxFactory(tx))) as Promise<SignedTx<T>>;
    }
}
