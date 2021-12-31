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
} from './transactions';
import { SignerTx, UserData } from '@waves/signer';
import { App, CreateNewAccount, Network, Settings } from './utils/actions';

const m = 60000;

describe('Selenium webdriver', function () {
  this.timeout(15 * m);
  let tabWavesKeeper, tabUI;

  before(async function () {
    await App.initVault.call(this);
    await Network.switchTo.call(this, 'Testnet');
    await CreateNewAccount.importAccount.call(
      this,
      'rich',
      'waves private node seed with waves tokens'
    );
    await Settings.setMaxSessionTimeout.call(this);

    // prepare browse keeper and ui tabs
    await App.open.call(this);
    tabWavesKeeper = await this.driver.getWindowHandle();

    await this.driver.switchTo().newWindow('tab');
    await this.driver.get(this.testAppUrl);
    await this.driver.wait(until.elementLocated(By.id('sign-in')), this.wait);
    tabUI = await this.driver.getWindowHandle();
    await this.driver.sleep(2000);
  });

  it('auth tx', async function () {
    await this.driver.switchTo().window(tabUI);

    const loginBtn = await this.driver.wait(
      until.elementLocated(By.css('#sign-in:not(.disabled)')),
      this.wait
    );
    await loginBtn.click();

    await this.driver.switchTo().window(tabWavesKeeper);
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

    await this.driver.switchTo().window(tabUI);
    const userData: UserData = await this.driver.executeScript(() => {
      return (window as any).getOutput();
    });
    expect(userData.address).to.exist;
    expect(userData.publicKey).to.exist;
  });

  const signedTxShouldBeValid = async function (
    this: mocha.Context,
    tx: SignerTx | SignerTx[],
    formSelector: By
  ) {
    await this.driver.switchTo().window(tabUI);
    await this.driver.executeScript(tx => {
      (window as any).setInput(tx);
    }, tx);

    const sendTxBtn = await this.driver.wait(
      until.elementLocated(By.css('#send-tx:not(.disabled)')),
      this.wait
    );
    await sendTxBtn.click();

    // tx request
    await this.driver.switchTo().window(tabWavesKeeper);
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

    await this.driver.switchTo().window(tabUI);
    await this.driver.wait(
      until.elementLocated(By.css('#send-tx.disabled')),
      this.wait
    );
    const signed: any[] = await this.driver.executeScript(() => {
      return (window as any).getOutput();
    });

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
      ISSUE,
      By.xpath("//div[contains(@class, '-issueTx')]")
    );
  });

  it('transfer tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      TRANSFER,
      By.xpath("//div[contains(@class, '-transferTx')]")
    );
  });

  it('reissue tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      REISSUE,
      By.xpath("//div[contains(@class, '-reissueTx')]")
    );
  });

  it('burn tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      BURN,
      By.xpath("//div[contains(@class, '-burnTx')]")
    );
  });

  it('lease tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      LEASE,
      By.xpath("//div[contains(@class, '-leaseTx')]")
    );
  });

  it('cancel lease tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      CANCEL_LEASE,
      By.xpath("//div[contains(@class, '-cancelLeaseTx')]")
    );
  });

  it('alias tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      ALIAS,
      By.xpath("//div[contains(@class, '-aliasTx')]")
    );
  });

  it('mass transfer tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      MASS_TRANSFER,
      By.xpath("//div[contains(@class, '-massTransferTx')]")
    );
  });

  it('data tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      DATA,
      By.xpath("//div[contains(@class, '-dataTx')]")
    );
  });

  it('set script tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      SET_SCRIPT,
      By.xpath("//div[contains(@class, '-setScriptTx')]")
    );
  });

  it('sponsorship tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      SPONSORSHIP,
      By.xpath("//div[contains(@class, '-sponsorshipTx')]")
    );
  });

  it('set asset script tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      SET_ASSET_SCRIPT,
      By.xpath("//div[contains(@class, '-assetScriptTx')]")
    );
  });

  it('package tx', async function () {
    await signedTxShouldBeValid.call(
      this,
      [ISSUE, TRANSFER, REISSUE, BURN, LEASE, CANCEL_LEASE, ALIAS],
      By.xpath("//div[contains(@class, '-dataTx')]")
    );
    await signedTxShouldBeValid.call(
      this,
      [MASS_TRANSFER, DATA, SET_SCRIPT, SPONSORSHIP, SET_ASSET_SCRIPT],
      By.xpath("//div[contains(@class, '-dataTx')]")
    );
  });

  describe('invoke tx', function () {
    it('default call', async function () {
      await signedTxShouldBeValid.call(
        this,
        INVOKE_DEFAULT_CALL,
        By.xpath("//div[contains(@class, '-scriptInvocationTx')]")
      );
    });

    it('with no args but single payment', async function () {
      await signedTxShouldBeValid.call(
        this,
        INVOKE_NO_ARGS_SINGLE_PAYMENTS,
        By.xpath("//div[contains(@class, '-scriptInvocationTx')]")
      );
    });

    it('with no args but many payments', async function () {
      await signedTxShouldBeValid.call(
        this,
        INVOKE_NO_ARGS_MANY_PAYMENTS,
        By.xpath("//div[contains(@class, '-scriptInvocationTx')]")
      );
    });

    it('with native args and no payments', async function () {
      await signedTxShouldBeValid.call(
        this,
        INVOKE_NATIVE_ARGS_NO_PAYMENTS,
        By.xpath("//div[contains(@class, '-scriptInvocationTx')]")
      );
    });

    it('with list args and no payments', async function () {
      await signedTxShouldBeValid.call(
        this,
        INVOKE_LIST_ARGS_NO_PAYMENTS,
        By.xpath("//div[contains(@class, '-scriptInvocationTx')]")
      );
    });
  });
});
