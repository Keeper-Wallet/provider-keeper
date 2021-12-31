import ProviderKeeperAsModule, { ProviderKeeper } from '../src';
import { expect } from 'chai';
import { describe } from 'mocha';

describe('Package', () => {
    it('import ProviderKeeper as module', () => {
        expect(new ProviderKeeperAsModule()).to.be.instanceof(ProviderKeeper);
    });
});
