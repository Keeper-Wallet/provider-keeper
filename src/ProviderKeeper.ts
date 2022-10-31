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
import { EventEmitter } from 'typed-ts-events';
import { keeperTxFactory, signerTxFactory } from './adapter';

export class ProviderKeeper implements Provider {
  public user: UserData | null = null;
  protected _apiPromise: Promise<WavesKeeper.TWavesKeeperApi>;
  protected _connectPromise: Promise<void>; // used in _ensureApi
  private _connectResolve!: () => void; // initialized in Promise constructor
  private _options: ConnectOptions = {
    NETWORK_BYTE: 'W'.charCodeAt(0),
    NODE_URL: 'https://nodes.wavesnodes.com',
  };
  private readonly _emitter: EventEmitter<AuthEvents> =
    new EventEmitter<AuthEvents>();

  constructor() {
    this._apiPromise = isKeeperInstalled().then(isInstalled => {
      return isInstalled
        ? window.WavesKeeper.initialPromise.then(api => Promise.resolve(api))
        : Promise.reject(new Error('WavesKeeper is not installed.'));
    });

    this._apiPromise.catch(() => {
      // avoid unhandled rejection
    });

    this._connectPromise = new Promise(resolve => {
      this._connectResolve = resolve;
    });
  }

  public on<EVENT extends keyof AuthEvents>(
    event: EVENT,
    handler: Handler<AuthEvents[EVENT]>
  ): Provider {
    this._emitter.on(event, handler);

    return this;
  }

  public once<EVENT extends keyof AuthEvents>(
    event: EVENT,
    handler: Handler<AuthEvents[EVENT]>
  ): Provider {
    this._emitter.once(event, handler);

    return this;
  }

  public off<EVENT extends keyof AuthEvents>(
    event: EVENT,
    handler: Handler<AuthEvents[EVENT]>
  ): Provider {
    this._emitter.off(event, handler);

    return this;
  }

  public connect(options: ConnectOptions): Promise<void> {
    this._options = options;
    this._connectResolve();
    return Promise.resolve();
  }

  public login(): Promise<UserData> {
    return this._ensureApi()
      .then(api => api.publicState())
      .then(state => {
        // in this case we already have state.account,
        // otherwise api.publicState will throw an error
        this.user = {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          address: state.account!.address,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          publicKey: state.account!.publicKey,
        };
        this._emitter.trigger('login', this.user);
        return this.user;
      });
  }

  public logout(): Promise<void> {
    this.user = null;
    this._emitter.trigger('logout', void 0);
    return Promise.resolve();
  }

  public signMessage(data: string | number): Promise<string> {
    return this._ensureApi()
      .then(api =>
        api.signCustomData({
          version: 1,
          binary: 'base64:' + btoa(String(data)),
        })
      )
      .then(data => data.signature);
  }

  public signTypedData(data: Array<TypedData>): Promise<string> {
    return this._ensureApi()
      .then(api =>
        api.signCustomData({
          version: 2,
          data: data as WavesKeeper.TTypedData[],
        })
      )
      .then(data => data.signature);
  }

  sign<T extends SignerTx>(toSign: T[]): Promise<SignedTx<T>>;
  sign<T extends Array<SignerTx>>(toSign: T): Promise<SignedTx<T>>;
  public async sign<T extends SignerTx>(toSign: T[]): Promise<SignedTx<T>> {
    const apiPromise = this._ensureApi();

    if (toSign.length == 1) {
      return apiPromise
        .then(api => api.signTransaction(keeperTxFactory(toSign[0])))
        .then(data => [signerTxFactory(data)]) as Promise<SignedTx<T>>;
    }

    return apiPromise
      .then(api =>
        api.signTransactionPackage(
          toSign.map(tx =>
            keeperTxFactory(tx)
          ) as WavesKeeper.TSignTransactionPackageData
        )
      )
      .then(data => data.map(tx => signerTxFactory(tx))) as Promise<
      SignedTx<T>
    >;
  }

  private async _ensureApi(): Promise<WavesKeeper.TWavesKeeperApi> {
    // api is ready
    const [api] = await Promise.all([this._apiPromise, this._connectPromise]);

    // has accounts
    const state = await api.publicState();

    // and is on the same network
    const keeperNetworkByte = state.network.code.charCodeAt(0);
    const signerNetworkByte = this._options.NETWORK_BYTE;

    if (keeperNetworkByte !== signerNetworkByte) {
      const keeperNodeUrl = state.network.server;
      const signerNodeUrl = this._options.NODE_URL;

      throw new Error(
        `Invalid connect options. Signer connect ` +
          `(${signerNodeUrl} ${signerNetworkByte}) not equals ` +
          `keeper connect (${keeperNodeUrl} ${keeperNetworkByte})`
      );
    }

    return api;
  }
}

const poll = (
  resolve: (result: boolean) => void,
  reject: (...args: unknown[]) => void,
  attempt = 0,
  retries = 30,
  interval = 100
) => {
  if (attempt > retries) return resolve(false);

  if (typeof WavesKeeper !== 'undefined') {
    return resolve(true);
  } else setTimeout(() => poll(resolve, reject, ++attempt), interval);
};

const _isKeeperInstalled = new Promise(poll);

export async function isKeeperInstalled() {
  return _isKeeperInstalled;
}
