import {IConnectOptions, IProvider, ITypedData, IUserData, TLong, TTransactionParamWithType} from '@waves/signer';
import {IWithId, TTransactionWithProofs} from '@waves/ts-types';
import TWavesKeeperApi = WavesKeeper.TWavesKeeperApi;
import IAuthData = WavesKeeper.IAuthData;

export class ProviderKeeper implements IProvider {
    public user: IUserData | null = null;
    private readonly _api: TWavesKeeperApi = window.WavesKeeper;
    private readonly _authData: IAuthData;
    private _options: IConnectOptions = {
        NETWORK_BYTE: 'W'.charCodeAt(0),
        NODE_URL: 'https://nodes.wavesnodes.com',
    };

    constructor(authData: IAuthData) {
        this._authData = authData;
        // TODO wait WavesKeeper extension API
    }

    public connect(options: IConnectOptions): Promise<void> {
        this._options = options;
        // TODO check networkCode, networkServer the same as WavesKeeper.publicState
        return Promise.resolve()
    }

    public sign(
        list: Array<TTransactionParamWithType>
    ): Promise<Array<TTransactionWithProofs<TLong> & IWithId>> {
        return Promise.resolve() as any;
    }

    public login(): Promise<IUserData> {
        // TODO
        return Promise.resolve() as any
    }

    public logout(): Promise<void> {
        this.user = null;
        return Promise.resolve();
    }

    public signTypedData(data: Array<ITypedData>): Promise<string> {
        // TODO
        return Promise.resolve() as any;
    }

    public signMessage(data: string | number): Promise<string> {
        // TODO
        return Promise.resolve() as any;
    }
}
