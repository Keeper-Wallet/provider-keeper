import { expect } from 'chai';
import { describe } from 'mocha';

import ProviderKeeperAsModule, { ProviderKeeper } from '../src';

describe('Package', () => {
  it('import ProviderKeeper as module', () => {
    expect(new ProviderKeeperAsModule()).to.be.instanceof(ProviderKeeper);
  });
});
