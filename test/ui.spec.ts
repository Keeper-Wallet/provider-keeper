import { expect } from 'chai';
import * as mocha from 'mocha';
import { By, until } from 'selenium-webdriver';
import { Signer } from '@waves/signer';
import {
  App,
  CreateNewAccount,
  Network,
  Settings,
  Windows,
} from './utils/actions';
import { ProviderKeeper } from '../src';
import { address, publicKey } from '@waves/ts-lib-crypto';
import { ISSUER_SEED, USER_1_SEED, USER_2_SEED } from './utils/constants';
import { faucet, getNetworkByte } from './utils/nodeInteraction';

const m = 60000;
const WAVES = 100000000; // waves token scale

declare global {
  interface Window {
    signer: Signer;
    Signer: typeof Signer;
    ProviderKeeper: typeof ProviderKeeper;
    result: unknown;
  }
}

describe('Signer integration', function () {
  this.timeout(5 * m);

  let tabTestApp;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let issuer, user1, user2;

  let messageWindow: string | null = null;

  async function prepareAccounts(this: mocha.Context) {
    const chainId = await getNetworkByte(this.hostNodeUrl);

    issuer = {
      address: address(ISSUER_SEED, chainId),
      publicKey: publicKey(ISSUER_SEED),
    };
    user1 = {
      address: address(USER_1_SEED, chainId),
      publicKey: publicKey(USER_1_SEED),
    };
    user2 = {
      address: address(USER_2_SEED, chainId),
      publicKey: publicKey(USER_2_SEED),
    };

    await faucet({
      recipient: issuer.address,
      amount: 10 * WAVES,
      nodeUrl: this.hostNodeUrl,
    });
  }

  before(async function () {
    await prepareAccounts.call(this);
    await App.initVault.call(this);

    const tabKeeper = await this.driver.getWindowHandle();
    const { waitForNewWindows } = await Windows.captureNewWindows.call(this);
    await this.driver
      .wait(
        until.elementLocated(By.css('[data-testid="addAccountBtn"]')),
        this.wait
      )
      .click();
    const [tabAccounts] = await waitForNewWindows(1);

    await this.driver.switchTo().window(tabKeeper);
    await Settings.setMaxSessionTimeout.call(this);
    await this.driver.close();

    await this.driver.switchTo().window(tabAccounts);
    await this.driver.navigate().refresh();
    await Network.switchTo.call(this, 'Custom', this.nodeUrl);
    await CreateNewAccount.importAccount.call(this, 'user2', USER_2_SEED);
    await CreateNewAccount.importAccount.call(this, 'user1', USER_1_SEED);
    await CreateNewAccount.importAccount.call(this, 'issuer', ISSUER_SEED);
    await Network.switchTo.call(this, 'Testnet');
    await CreateNewAccount.importAccount.call(this, 'test', ISSUER_SEED);

    await this.driver.switchTo().newWindow('tab');
    await this.driver.get(this.testAppUrl);
    await this.driver.executeScript(function (nodeUrl) {
      window.signer = new window.Signer({
        NODE_URL: nodeUrl,
      });
      window.signer.setProvider(new window.ProviderKeeper());
    }, this.nodeUrl);
    tabTestApp = await this.driver.getWindowHandle();

    await this.driver.switchTo().window(tabAccounts);
    await this.driver.close();

    await this.driver.switchTo().window(tabTestApp);
  });

  it('Current provider is ProviderKeeper', async function () {
    expect(
      await this.driver.executeScript(function () {
        return window.signer.currentProvider instanceof window.ProviderKeeper;
      })
    ).to.be.true;
  });

  async function approveMessage(this: mocha.Context, wait = this.wait) {
    await this.driver
      .wait(until.elementLocated(By.css('#approve')), wait)
      .click();

    await this.driver.wait(
      until.elementLocated(By.css('.tx-approve-icon')),
      this.wait
    );
  }

  async function rejectMessage(this: mocha.Context, wait = this.wait) {
    await this.driver
      .wait(until.elementLocated(By.css('#reject')), wait)
      .click();

    await this.driver.wait(
      until.elementLocated(By.css('.tx-reject-icon')),
      this.wait
    );
  }

  async function closeMessage(this: mocha.Context) {
    await this.driver.findElement(By.css('#close')).click();
    expect(messageWindow).not.to.be.null;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await Windows.waitForWindowToClose.call(this, messageWindow!);
    messageWindow = null;
    await this.driver.switchTo().window(tabTestApp);
  }

  describe('Permission request from origin', function () {
    async function performPermissionRequest(this: mocha.Context) {
      await this.driver.executeScript(() => {
        window.signer.login().then(
          result => {
            window.result = JSON.stringify(['RESOLVED', result]);
          },
          err => {
            window.result = JSON.stringify(['REJECTED', err]);
          }
        );
      });
    }

    async function waitPermissionRequest(this: mocha.Context) {
      const { waitForNewWindows } = await Windows.captureNewWindows.call(this);
      await performPermissionRequest.call(this);
      [messageWindow] = await waitForNewWindows(1);
      await this.driver.switchTo().window(messageWindow);
      await this.driver.navigate().refresh();
    }

    async function getPermissionRequestResult(this: mocha.Context) {
      return JSON.parse(
        await this.driver.executeScript(() => {
          const { result } = window;
          delete window.result;
          return result;
        })
      );
    }

    async function changeKeeperNetworkAndClose(
      this: mocha.Context,
      network: 'Mainnet' | 'Stagenet' | 'Testnet' | 'Custom'
    ) {
      await this.driver.switchTo().newWindow('tab');
      await App.open.call(this);
      await Network.switchTo.call(this, network);
      await this.driver.close();
      await this.driver.switchTo().window(tabTestApp);
    }

    it('Rejected', async function () {
      await changeKeeperNetworkAndClose.call(this, 'Custom');

      await waitPermissionRequest.call(this);
      await rejectMessage.call(this);
      await closeMessage.call(this);

      const [status, result] = await getPermissionRequestResult.call(this);

      expect(status).to.equal('REJECTED');

      expect(result).to.deep.equal({
        code: 1004,
        type: 'provider',
      });
    });

    it('Approved', async function () {
      await waitPermissionRequest.call(this);
      await approveMessage.call(this);
      await closeMessage.call(this);

      const [status, result] = await getPermissionRequestResult.call(this);

      expect(status).to.equal('RESOLVED');
      expect(result.address).to.equal(issuer.address);
      expect(result.publicKey).to.equal(issuer.publicKey);
    });

    it('Keeper has no accounts', async function () {
      await changeKeeperNetworkAndClose.call(this, 'Mainnet');

      await performPermissionRequest.call(this);

      const [status, result] = await getPermissionRequestResult.call(this);

      expect(status).to.equal('REJECTED');

      expect(result).to.deep.equal({
        code: 1004,
        type: 'provider',
      });
    });

    it('Keeper network mismatch', async function () {
      await changeKeeperNetworkAndClose.call(this, 'Testnet');

      await performPermissionRequest.call(this);

      const [status, result] = await getPermissionRequestResult.call(this);

      expect(status).to.equal('REJECTED');

      expect(result).to.deep.equal({
        code: 1004,
        type: 'provider',
      });
    });

    it('Already approved', async function () {
      await changeKeeperNetworkAndClose.call(this, 'Custom');

      await performPermissionRequest.call(this);

      const [status, result] = await getPermissionRequestResult.call(this);

      expect(status).to.equal('RESOLVED');
      expect(result.address).to.equal(issuer.address);
      expect(result.publicKey).to.equal(issuer.publicKey);
    });
  });
});
