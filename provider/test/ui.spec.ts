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

const m = 60000;

declare global {
  interface Window {
    signer: Signer;
    Signer: typeof Signer;
    ProviderKeeper: typeof ProviderKeeper;
    result: any;
  }
}

describe('Signer integration', function () {
  this.timeout(5 * m);
  let wavesKeeper, testApp;

  before(async function () {
    await App.initVault.call(this);
    await Network.switchTo.call(this, 'Testnet');
    await CreateNewAccount.importAccount.call(
      this,
      'rich',
      'waves private node seed with waves tokens'
    );
    await Settings.setMaxSessionTimeout.call(this);

    // prepare browse keeper and test-app tabs
    await App.open.call(this);
    wavesKeeper = await this.driver.getWindowHandle();

    await this.driver.switchTo().newWindow('tab');
    await this.driver.get(this.testAppUrl);
    await this.driver.executeScript(function (nodeUrl) {
      window.signer = new window.Signer({
        NODE_URL: nodeUrl,
      });
      window.signer.setProvider(new window.ProviderKeeper());
    }, 'https://nodes-testnet.wavesnodes.com');
    testApp = await this.driver.getWindowHandle();
  });

  it('Current provider is ProviderKeeper', async function () {
    expect(
      await this.driver.executeScript(function () {
        return window.signer.currentProvider instanceof window.ProviderKeeper;
      })
    ).to.be.true;
  });

  function windowResult(this: mocha.Context): any {
    return this.driver.executeAsyncScript(function () {
      const done = arguments[arguments.length - 1];
      window.result.then(done).catch(done);
    });
  }

  it('auth tx', async function () {
    await this.driver.switchTo().window(testApp);

    await this.driver.executeScript(() => {
      window.result = window.signer.login();
    });

    await this.driver.switchTo().window(wavesKeeper);
    // site permission request
    await this.driver.wait(
      until.elementLocated(By.xpath("//div[contains(@class, '-originAuthTx')]"))
    );
    let acceptBtn = await this.driver.findElement(
      By.css('.app button[type=submit]')
    );
    await acceptBtn.click();
    // site auth request
    await this.driver.wait(
      until.elementLocated(By.xpath("//div[contains(@class, '-authTx')]"))
    );
    acceptBtn = await this.driver.findElement(
      By.css('.app button[type=submit]')
    );
    await acceptBtn.click();
    // close window
    const closeBtn = await this.driver.wait(
      until.elementLocated(By.css('[data-testid="closeTransaction"]'))
    );
    await closeBtn.click();

    await this.driver.switchTo().window(testApp);

    const userData: UserData = await windowResult.call(this);
    expect(userData.address).to.exist;
    expect(userData.publicKey).to.exist;
  });

  it('Error when Waves Keeper on the wrong network', async function () {
    await this.driver.switchTo().window(wavesKeeper);
    await Network.switchTo.call(this, 'Mainnet');

    await this.driver.switchTo().window(testApp);
    const error: SignerError = await this.driver.executeAsyncScript(
      function () {
        const done = arguments[arguments.length - 1];
        window.signer.login().then(done).catch(done);
      }
    );
    expect(error.code).to.be.equal(ERRORS.ENSURE_PROVIDER);
    expect(error.type).to.be.equal('provider');

    await this.driver.switchTo().window(wavesKeeper);
    await Network.switchTo.call(this, 'Testnet');
  });

  const signedTxShouldBeValid = async function (
    this: mocha.Context,
    method: string,
    tx: SignerTx | SignerTx[],
    formSelector: By
  ) {
    await this.driver.switchTo().window(testApp);
    await this.driver.executeScript(
      function (tx, method) {
        window.result = window.signer[method](tx).sign();
      },
      tx,
      method
    );

    // tx request
    await this.driver.switchTo().window(wavesKeeper);
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

    await this.driver.switchTo().window(testApp);
    const signed: any[] = await windowResult.call(this);

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
      By.xpath("//div[contains(@class, '-issueTx')]")
    );
  });

  it('transfer tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      'transfer',
      TRANSFER,
      By.xpath("//div[contains(@class, '-transferTx')]")
    );
  });

  it('reissue tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      'reissue',
      REISSUE,
      By.xpath("//div[contains(@class, '-reissueTx')]")
    );
  });

  it('burn tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      'burn',
      BURN,
      By.xpath("//div[contains(@class, '-burnTx')]")
    );
  });

  it('lease tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      'lease',
      LEASE,
      By.xpath("//div[contains(@class, '-leaseTx')]")
    );
  });

  it('cancel lease tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      'cancelLease',
      CANCEL_LEASE,
      By.xpath("//div[contains(@class, '-cancelLeaseTx')]")
    );
  });

  it('alias tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      'alias',
      ALIAS,
      By.xpath("//div[contains(@class, '-aliasTx')]")
    );
  });

  it('mass transfer tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      'massTransfer',
      MASS_TRANSFER,
      By.xpath("//div[contains(@class, '-massTransferTx')]")
    );
  });

  it('data tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      'data',
      DATA,
      By.xpath("//div[contains(@class, '-dataTx')]")
    );
  });

  it('set script tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      'setScript',
      SET_SCRIPT,
      By.xpath("//div[contains(@class, '-setScriptTx')]")
    );
  });

  it('sponsorship tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      'sponsorship',
      SPONSORSHIP,
      By.xpath("//div[contains(@class, '-sponsorshipTx')]")
    );
  });

  it('set asset script tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      'setAssetScript',
      SET_ASSET_SCRIPT,
      By.xpath("//div[contains(@class, '-assetScriptTx')]")
    );
  });

  it('package tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      'batch',
      [ISSUE, TRANSFER, REISSUE, BURN, LEASE, CANCEL_LEASE, ALIAS],
      By.xpath("//div[contains(@class, '-dataTx')]")
    );
    await signedTxShouldBeValid.call(
      this,
      'batch',
      [MASS_TRANSFER, DATA, SET_SCRIPT, SPONSORSHIP, SET_ASSET_SCRIPT],
      By.xpath("//div[contains(@class, '-dataTx')]")
    );
  });

  describe('invoke tx', function () {
    it('default call', async function () {
      await signedTxShouldBeValid.call(
        this,
        'invoke',
        INVOKE_DEFAULT_CALL,
        By.xpath("//div[contains(@class, '-scriptInvocationTx')]")
      );
    });

    it('with no args but single payment', async function () {
      await signedTxShouldBeValid.call(
        this,
        'invoke',
        INVOKE_NO_ARGS_SINGLE_PAYMENTS,
        By.xpath("//div[contains(@class, '-scriptInvocationTx')]")
      );
    });

    it('with no args but many payments', async function () {
      await signedTxShouldBeValid.call(
        this,
        'invoke',
        INVOKE_NO_ARGS_MANY_PAYMENTS,
        By.xpath("//div[contains(@class, '-scriptInvocationTx')]")
      );
    });

    it('with native args and no payments', async function () {
      await signedTxShouldBeValid.call(
        this,
        'invoke',
        INVOKE_NATIVE_ARGS_NO_PAYMENTS,
        By.xpath("//div[contains(@class, '-scriptInvocationTx')]")
      );
    });

    it('with list args and no payments', async function () {
      await signedTxShouldBeValid.call(
        this,
        'invoke',
        INVOKE_LIST_ARGS_NO_PAYMENTS,
        By.xpath("//div[contains(@class, '-scriptInvocationTx')]")
      );
    });
  });
});
