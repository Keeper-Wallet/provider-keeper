import { Signer } from '@waves/signer';
import { ProviderKeeper } from '..';

window.Signer = Signer;
window.ProviderKeeper = ProviderKeeper;
window.result = Promise.resolve();
