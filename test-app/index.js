import { Signer } from '@waves/signer';
import { ProviderKeeper } from '../src';

window.Signer = Signer;
window.ProviderKeeper = ProviderKeeper;
window.result = Promise.resolve();
