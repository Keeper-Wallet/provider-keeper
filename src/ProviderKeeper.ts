import {AuthEvents, ConnectOptions, Handler, Provider, SignedTx, SignerTx, TypedData, UserData} from '@waves/signer';
import {EventEmitter} from 'typed-ts-events';
import {keeperTxFactory} from "./adapter";
import TWavesKeeperApi = WavesKeeper.TWavesKeeperApi;
import IAuthData = WavesKeeper.IAuthData;
import TTypedData = WavesKeeper.TTypedData;


export class ProviderKeeper implements Provider {

    public user: UserData | null = null;
    private readonly _api: TWavesKeeperApi = window.WavesKeeper;
    private readonly _authData: IAuthData;
    private _options: ConnectOptions = {
        NETWORK_BYTE: 'W'.charCodeAt(0),
        NODE_URL: 'https://nodes.wavesnodes.com',
    };
    private readonly emitter: EventEmitter<AuthEvents> = new EventEmitter<AuthEvents>();

    constructor(authData: IAuthData) {
        this._authData = authData;
        // TODO wait WavesKeeper extension API
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
        // TODO check networkCode, networkServer the same as WavesKeeper.publicState
        return Promise.resolve()
    }

    public login(): Promise<UserData> {
        return this._api.auth(this._authData)
            .then(userData => this.user = userData);
    }

    public logout(): Promise<void> {
        this.user = null;
        // TODO connect to extension via Port and close his connection
        return Promise.resolve();
    }

    public signMessage(data: string | number): Promise<string> {
        return this._api.signCustomData({
            version: 1,
            binary: data as string
        }).then(data => {
            return Promise.resolve(
                data.signature
            );
        });
    }

    public signTypedData(data: Array<TypedData>): Promise<string> {
        return this._api.signCustomData({
            version: 2,
            data: data as TTypedData[]
        }).then(data => {
            return Promise.resolve(
                data.signature
            );
        });
    }

    public sign<T extends Array<SignerTx>>(toSign: T): Promise<SignedTx<T>> {
        return this._api.signTransactionPackage(
            toSign.map(tx => keeperTxFactory(tx)) as any
        ).then(data => {
            return Promise.resolve(
                data.map(tx => JSON.parse(tx)) as any
            );
        });
    }
}
