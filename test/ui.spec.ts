import { expect } from 'chai';
import * as mocha from 'mocha';
import { By, until } from 'selenium-webdriver';
import {
  ALIAS,
  BURN,
  CANCEL_LEASE,
  DATA,
  INVOKE_DEFAULT_CALL,
  INVOKE_LIST_ARGS_NO_PAYMENTS,
  INVOKE_NATIVE_ARGS_NO_PAYMENTS,
  INVOKE_NO_ARGS_MANY_PAYMENTS,
  INVOKE_NO_ARGS_SINGLE_PAYMENTS,
  ISSUE,
  LEASE,
  MASS_TRANSFER,
  REISSUE,
  SET_ASSET_SCRIPT,
  SET_SCRIPT,
  SPONSORSHIP,
  TRANSFER,
} from './utils/transactions';
import { Signer, SignerTx, UserData } from '@waves/signer';
import { App, CreateNewAccount, Network, Settings } from './utils/actions';
import { ProviderKeeper } from '../src';
import { ERRORS, SignerError } from '@waves/signer/dist/cjs/SignerError';
import { address } from '@waves/ts-lib-crypto';
import { ISSUER_SEED, USER_1_SEED, USER_2_SEED } from './utils/constants';
import { faucet, getNetworkByte } from './utils/nodeInteraction';

const m = 60000;
const WAVES = 100000000; // waves token scale

declare global {
  interface Window {
    signer: Signer;
    Signer: typeof Signer;
    ProviderKeeper: typeof ProviderKeeper;
    result: Promise<unknown>;
  }
}

describe('Signer integration', function () {
  this.timeout(5 * m);
  let tabKeeper, tabAccounts, tabTestApp;

  let issuer, user1, user2;

  before(async function () {
    const chainId = await getNetworkByte(this.hostNodeUrl);

    issuer = address(ISSUER_SEED, chainId);
    user1 = address(USER_1_SEED, chainId);
    user2 = address(USER_2_SEED, chainId);

    await faucet({
      recipient: issuer,
      amount: 10 * WAVES,
      nodeUrl: this.hostNodeUrl,
    });

    await App.initVault.call(this);
    await Network.switchTo.call(this, 'Custom', this.nodeUrl);
    tabKeeper = await this.driver.getWindowHandle();
    await this.driver
      .wait(
        until.elementLocated(By.css('[data-testid="importForm"]')),
        this.wait
      )
      .findElement(By.css('[data-testid="addAccountBtn"]'))
      .click();
    await this.driver.wait(
      async () => (await this.driver.getAllWindowHandles()).length === 2,
      this.wait
    );
    for (const handle of await this.driver.getAllWindowHandles()) {
      if (handle !== tabKeeper) {
        tabAccounts = handle;
        await this.driver.switchTo().window(tabAccounts);
        await this.driver.navigate().refresh();
        break;
      }
    }
    await CreateNewAccount.importAccount.call(
      this,
      'rich',
      'waves private node seed with waves tokens'
    );
    await this.driver.close();
    await this.driver.switchTo().window(tabKeeper);
    await Settings.setMaxSessionTimeout.call(this);

    // prepare browse keeper and test-app tabs
    await App.open.call(this);

    await this.driver.switchTo().newWindow('tab');
    await this.driver.get(this.testAppUrl);
    await this.driver.executeScript(function (nodeUrl) {
      window.signer = new window.Signer({
        NODE_URL: nodeUrl,
      });
      window.signer.setProvider(new window.ProviderKeeper());
    }, 'https://nodes-testnet.wavesnodes.com');
    tabTestApp = await this.driver.getWindowHandle();
  });

  it('Current provider is ProviderKeeper', async function () {
    expect(
      await this.driver.executeScript(function () {
        return window.signer.currentProvider instanceof window.ProviderKeeper;
      })
    ).to.be.true;
  });

  function windowResult(this: mocha.Context): unknown {
    return this.driver.executeAsyncScript(function (...args) {
      const done = args[args.length - 1];
      window.result.then(done).catch(done);
    });
  }

  it('auth tx', async function () {
    await this.driver.switchTo().window(tabTestApp);

    await this.driver.executeScript(() => {
      window.result = window.signer.login();
    });

    await this.driver.switchTo().window(tabKeeper);
    // site permission request
    await this.driver.wait(
      until.elementLocated(
        By.xpath("//div[contains(@class, 'originAuth-transaction')]")
      )
    );
    const acceptBtn = await this.driver.findElement(
      By.css('.app button[type=submit]')
    );
    await acceptBtn.click();
    // close window
    const closeBtn = await this.driver.wait(
      until.elementLocated(By.css('[data-testid="closeTransaction"]'))
    );
    await closeBtn.click();

    await this.driver.switchTo().window(tabTestApp);

    const userData = (await windowResult.call(this)) as UserData;
    expect(userData.address).to.exist;
    expect(userData.publicKey).to.exist;
  });

  it('Error when Keeper Wallet is on the wrong network', async function () {
    await this.driver.switchTo().window(tabKeeper);
    await Network.switchTo.call(this, 'Mainnet');

    await this.driver.switchTo().window(tabTestApp);
    const error: SignerError = await this.driver.executeAsyncScript(function (
      ...args
    ) {
      const done = args[args.length - 1];
      window.signer.login().then(done).catch(done);
    });
    expect(error.code).to.be.equal(ERRORS.ENSURE_PROVIDER);
    expect(error.type).to.be.equal('provider');

    await this.driver.switchTo().window(tabKeeper);
    await Network.switchTo.call(this, 'Testnet');
  });

  const signedTxShouldBeValid = async function (
    this: mocha.Context,
    method: string,
    tx: SignerTx | SignerTx[],
    formSelector: By
  ) {
    await this.driver.switchTo().window(tabTestApp);
    await this.driver.executeScript(
      function (tx, method) {
        window.result = window.signer[method](tx).sign();
      },
      tx,
      method
    );

    // tx request
    await this.driver.switchTo().window(tabKeeper);
    await this.driver.wait(until.elementLocated(formSelector));
    const acceptBtn = await this.driver.findElement(
      By.css('.app button[type=submit]')
    );
    await acceptBtn.click();
    // close window
    const closeBtn = await this.driver.wait(
      until.elementLocated(By.css('[data-testid="closeTransaction"]'))
    );
    await closeBtn.click();

    await this.driver.switchTo().window(tabTestApp);
    const signed = (await windowResult.call(this)) as SignerTx[];

    tx = !Array.isArray(tx) ? [tx] : tx;
    expect(signed.length).to.be.equal(tx.length);
    signed.forEach((signedTx, idx) => {
      const commonFields = [
        'id',
        'type',
        'chainId',
        'senderPublicKey',
        'timestamp',
        'proofs',
        'version',
      ];
      expect(signedTx).to.include.all.keys(
        ...commonFields,
        ...Object.keys(tx[idx])
      );
    });
  };

  it('issue tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      'issue',
      ISSUE,
      By.xpath("//div[contains(@class, 'issue-transaction')]")
    );
  });

  it('transfer tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      'transfer',
      TRANSFER,
      By.xpath("//div[contains(@class, 'transfer-transaction')]")
    );
  });

  it('reissue tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      'reissue',
      REISSUE,
      By.xpath("//div[contains(@class, 'reissue-transaction')]")
    );
  });

  it('burn tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      'burn',
      BURN,
      By.xpath("//div[contains(@class, 'burn-transaction')]")
    );
  });

  it('lease tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      'lease',
      LEASE,
      By.xpath("//div[contains(@class, 'lease-transaction')]")
    );
  });

  it('cancel lease tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      'cancelLease',
      CANCEL_LEASE,
      By.xpath("//div[contains(@class, 'cancelLease-transaction')]")
    );
  });

  it('alias tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      'alias',
      ALIAS,
      By.xpath("//div[contains(@class, 'alias-transaction')]")
    );
  });

  it('mass transfer tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      'massTransfer',
      MASS_TRANSFER,
      By.xpath("//div[contains(@class, 'massTransfer-transaction')]")
    );
  });

  it('data tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      'data',
      DATA,
      By.xpath("//div[contains(@class, 'data-transaction')]")
    );
  });

  it('set script tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      'setScript',
      SET_SCRIPT,
      By.xpath("//div[contains(@class, 'setScript-transaction')]")
    );
  });

  it('sponsorship tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      'sponsorship',
      SPONSORSHIP,
      By.xpath("//div[contains(@class, 'sponsorship-transaction')]")
    );
  });

  it('set asset script tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      'setAssetScript',
      SET_ASSET_SCRIPT,
      By.xpath("//div[contains(@class, 'assetScript-transaction')]")
    );
  });

  it('package tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      'batch',
      [ISSUE, TRANSFER, REISSUE, BURN, LEASE, CANCEL_LEASE, ALIAS],
      By.xpath("//div[contains(@class, 'package-transaction')]")
    );
    await signedTxShouldBeValid.call(
      this,
      'batch',
      [MASS_TRANSFER, DATA, SET_SCRIPT, SPONSORSHIP, SET_ASSET_SCRIPT],
      By.xpath("//div[contains(@class, 'package-transaction')]")
    );
  });

  describe('invoke tx', function () {
    it('default call', async function () {
      await signedTxShouldBeValid.call(
        this,
        'invoke',
        INVOKE_DEFAULT_CALL,
        By.xpath("//div[contains(@class, 'scriptInvocation-transaction')]")
      );
    });

    it('with no args but single payment', async function () {
      await signedTxShouldBeValid.call(
        this,
        'invoke',
        INVOKE_NO_ARGS_SINGLE_PAYMENTS,
        By.xpath("//div[contains(@class, 'scriptInvocation-transaction')]")
      );
    });

    it('with no args but many payments', async function () {
      await signedTxShouldBeValid.call(
        this,
        'invoke',
        INVOKE_NO_ARGS_MANY_PAYMENTS,
        By.xpath("//div[contains(@class, 'scriptInvocation-transaction')]")
      );
    });

    it('with native args and no payments', async function () {
      await signedTxShouldBeValid.call(
        this,
        'invoke',
        INVOKE_NATIVE_ARGS_NO_PAYMENTS,
        By.xpath("//div[contains(@class, 'scriptInvocation-transaction')]")
      );
    });

    it('with list args and no payments', async function () {
      await signedTxShouldBeValid.call(
        this,
        'invoke',
        INVOKE_LIST_ARGS_NO_PAYMENTS,
        By.xpath("//div[contains(@class, 'scriptInvocation-transaction')]")
      );
    });
  });
});
