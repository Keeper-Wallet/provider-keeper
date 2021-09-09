import {
    AuthEvents,
    ConnectOptions,
    Handler,
    Provider,
    SignedTx,
    SignerTx,
    TypedData,
    UserData,
} from '@waves/signer';
import {json} from '@waves/marshall';
import {EventEmitter} from 'typed-ts-events';
import {keeperTxFactory} from "./adapter";
import TWavesKeeperApi = WavesKeeper.TWavesKeeperApi;
import IAuthData = WavesKeeper.IAuthData;
import TTypedData = WavesKeeper.TTypedData;
import TSignTransactionPackageData = WavesKeeper.TSignTransactionPackageData;

export class ProviderKeeper implements Provider {

    public user: UserData | null = null;
    private readonly _authData: IAuthData;
    private _api!: TWavesKeeperApi;
    private _options: ConnectOptions = {
        NETWORK_BYTE: 'W'.charCodeAt(0),
        NODE_URL: 'https://nodes.wavesnodes.com',
    };
    private readonly emitter: EventEmitter<AuthEvents> = new EventEmitter<AuthEvents>();

    constructor(authData: IAuthData) {
        this._authData = authData;
    }

    public on<EVENT extends keyof AuthEvents>(
        event: EVENT,
        handler: Handler<AuthEvents[EVENT]>
    ): Provider {
        this.emitter.on(event, handler);

        return this;
    }

    public once<EVENT extends keyof AuthEvents>(
        event: EVENT,
        handler: Handler<AuthEvents[EVENT]>
    ): Provider {
        this.emitter.once(event, handler);

        return this;
    }

    public off<EVENT extends keyof AuthEvents>(
        event: EVENT,
        handler: Handler<AuthEvents[EVENT]>
    ): Provider {
        this.emitter.once(event, handler);

        return this;
    }

    public connect(options: ConnectOptions): Promise<void> {
        this._options = options;

        const poll = resolve => {
            if(!!window.WavesKeeper) {
                window.WavesKeeper.initialPromise.then((api) => {
                    resolve(this._api = api)
                });
            }
            else setTimeout(_ => poll(resolve), 100);
        }

        return new Promise(poll);
    }

    public login(): Promise<UserData> {
        return this._api.auth(this._authData)
            .then(userData => {
                this.user = userData
                return userData
            });
    }

    public logout(): Promise<void> {
        this.user = null;
        return Promise.resolve();
    }

    public signMessage(data: string | number): Promise<string> {
        return this._api.signCustomData({
            version: 1,
            binary: data as string
        }).then(data => data.signature);
    }

    public signTypedData(data: Array<TypedData>): Promise<string> {
        return this._api.signCustomData({
            version: 2,
            data: data as TTypedData[]
        }).then(data => data.signature);
    }

    public sign<T extends SignerTx>(toSign: T[]): Promise<SignedTx<T>>;
    public sign<T extends Array<SignerTx>>(toSign: T): Promise<SignedTx<T>> {
        if (toSign.length == 1) {
            return this._api.signTransaction(
                keeperTxFactory(toSign[0])
            ).then(data => [json.parseTx(data)]) as Promise<SignedTx<T>>
        }
        return this._api.signTransactionPackage(
            toSign.map(tx => keeperTxFactory(tx)) as TSignTransactionPackageData
        ).then(data => data.map(tx => json.parseTx(tx))) as Promise<SignedTx<T>>;
    }
}
