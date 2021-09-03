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
import {EventEmitter} from 'typed-ts-events';
import {keeperTxFactory} from "./adapter";
import TWavesKeeperApi = WavesKeeper.TWavesKeeperApi;
import IAuthData = WavesKeeper.IAuthData;
import TTypedData = WavesKeeper.TTypedData;
import TSignTransactionPackageData = WavesKeeper.TSignTransactionPackageData;

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
        return this._api.publicState().then(state => {
            let {code: keeperCode, server: keeperURL} = state.network;
            let {NETWORK_BYTE: signerByte, NODE_URL: signerURL} = this._options;

            if (keeperCode.charCodeAt(0) !== signerByte) {
                throw new Error(`Network byte mismatch: Signer(${signerByte}), Keeper(${keeperCode.charCodeAt(0)})`);
            } else if (keeperURL.replace(/\/$/, "") !== signerURL.replace(/\/$/, "")) {
                throw new Error(`Node URL mismatch: Signer(${signerURL}) Keeper(${keeperURL})`);
            }
        })
    }

    public login(): Promise<UserData> {
        return this._api.auth(this._authData)
            .then(userData => this.user = userData);
    }

    public logout(): Promise<void> {
        this.user = null;
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
            toSign.map(tx => keeperTxFactory(tx)) as TSignTransactionPackageData
        ).then(data => {
            return Promise.resolve(
                data.map(tx => JSON.parse(tx))
            );
        }) as Promise<SignedTx<T>>;
    }
}
