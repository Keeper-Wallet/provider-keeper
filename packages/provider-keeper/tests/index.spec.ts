import ProviderKeeperAsModule from '../src';
import { ProviderKeeper } from '../src';
import { expect } from 'chai';
import { describe } from 'mocha';

describe('Package', () => {
    it('import ProviderKeeper as module', () => {
        expect(new ProviderKeeperAsModule({ data: 'data' })).to.be.instanceof(ProviderKeeper);
    });
});
