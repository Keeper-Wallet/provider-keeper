import { expect } from 'chai';
import * as mocha from 'mocha';
import { By, until } from 'selenium-webdriver';
import {
  BurnArgs,
  ReissueArgs,
  SetAssetScriptArgs,
  SignedTx,
  Signer,
  SignerBurnTx,
  SignerIssueTx,
  SignerReissueTx,
  SignerSetAssetScriptTx,
  SignerSponsorshipTx,
  SponsorshipArgs,
} from '@waves/signer';
import {
  App,
  CreateNewAccount,
  Network,
  Settings,
  Windows,
} from './utils/actions';
import { ProviderKeeper } from '../src';
import {
  address,
  base58Encode,
  blake2b,
  publicKey,
  verifySignature,
} from '@waves/ts-lib-crypto';
import { ISSUER_SEED, USER_1_SEED, USER_2_SEED } from './utils/constants';
import { BroadcastedTx, IssueArgs } from '@waves/signer/dist/cjs/types';
import { makeTxBytes } from '@waves/waves-transactions';
import { faucet, getNetworkByte } from './utils/nodeInteraction';
import { ERRORS } from '@waves/signer/dist/cjs/SignerError';

const m = 60000;
const WAVES = 100000000; // waves token scale

declare global {
  interface Window {
    signer: Signer;
    Signer: typeof Signer;
    ProviderKeeper: typeof ProviderKeeper;
    result?: Promise<unknown>;
  }
}

type WithAssetId = { assetId: string };

describe('Signer integration', function () {
  this.timeout(5 * m);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let issuer, user1, user2;

  let testAppTab: string;
  let messageWindow: string | null = null;
  let chainId;

  async function prepareAccounts(this: mocha.Context) {
    chainId = await getNetworkByte(this.hostNodeUrl);

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
    testAppTab = await this.driver.getWindowHandle();

    await this.driver.switchTo().window(tabAccounts);
    await this.driver.close();

    await this.driver.switchTo().window(testAppTab);
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
    await this.driver.switchTo().window(testAppTab);
  }

  describe('Permission request from origin', function () {
    async function performPermissionRequest(this: mocha.Context) {
      await this.driver.executeScript(() => {
        window.result = window.signer.login();
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
      return this.driver.executeAsyncScript(function (...args) {
        const done = args[args.length - 1];
        const { result } = window;
        result?.then(done).catch(done);
        window.result = Promise.resolve();
      });
    }

    async function changeKeeperNetworkAndClose(
      this: mocha.Context,
      network: 'Mainnet' | 'Stagenet' | 'Testnet' | 'Custom'
    ) {
      await this.driver.switchTo().newWindow('tab');
      await App.open.call(this);
      await Network.switchTo.call(this, network);
      await this.driver.close();
      await this.driver.switchTo().window(testAppTab);
    }

    it('Rejected', async function () {
      await changeKeeperNetworkAndClose.call(this, 'Custom');

      await waitPermissionRequest.call(this);
      await rejectMessage.call(this);
      await closeMessage.call(this);

      const result = await getPermissionRequestResult.call(this);

      expect(result).to.deep.contain({
        code: ERRORS.ENSURE_PROVIDER,
        type: 'provider',
      });
    });

    it('Approved', async function () {
      await waitPermissionRequest.call(this);
      await approveMessage.call(this);
      await closeMessage.call(this);

      const result = await getPermissionRequestResult.call(this);

      expect(result).to.deep.equal({
        address: issuer.address,
        publicKey: issuer.publicKey,
      });
    });

    it('Keeper has no accounts', async function () {
      await changeKeeperNetworkAndClose.call(this, 'Mainnet');

      await performPermissionRequest.call(this);

      const result = await getPermissionRequestResult.call(this);

      expect(result).to.deep.contain({
        code: ERRORS.ENSURE_PROVIDER,
        type: 'provider',
      });
    });

    it('Keeper network mismatch', async function () {
      await changeKeeperNetworkAndClose.call(this, 'Testnet');

      await performPermissionRequest.call(this);

      const result = await getPermissionRequestResult.call(this);

      expect(result).to.deep.contain({
        code: ERRORS.ENSURE_PROVIDER,
        type: 'provider',
      });
    });

    it('Already approved', async function () {
      await changeKeeperNetworkAndClose.call(this, 'Custom');

      await performPermissionRequest.call(this);

      const result = await getPermissionRequestResult.call(this);

      expect(result).to.deep.equal({
        address: issuer.address,
        publicKey: issuer.publicKey,
      });
    });
  });

  let assetWithMaxValuesId: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let assetWithMinValuesId: string;
  let assetSmartId: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let nftId: string;

  async function getSignTransactionResult(this: mocha.Context) {
    return this.driver.executeAsyncScript(function (...args) {
      const done = args[args.length - 1];
      const { result } = window;
      result?.then(done).catch(done);
      delete window.result;
    });
  }

  describe('Asset issue', function () {
    async function performIssueTransaction(
      this: mocha.Context,
      data: IssueArgs
    ) {
      const { waitForNewWindows } = await Windows.captureNewWindows.call(this);
      await this.driver.executeScript(data => {
        window.result = window.signer.issue(data).broadcast();
      }, data);
      [messageWindow] = await waitForNewWindows(1);
      await this.driver.switchTo().window(messageWindow);
      await this.driver.navigate().refresh();
    }

    it('Asset with max values', async function () {
      const data = {
        name: '16 characters :)',
        description:
          'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. ' +
          'Aenean commodo ligula eget dolor. Aenean'.repeat(10),
        quantity: '9223372036854775807',
        decimals: 8 as const,
        reissuable: true,
      };
      await performIssueTransaction.call(this, data);

      await approveMessage.call(this);
      await closeMessage.call(this);

      const result = (await getSignTransactionResult.call(this)) as [
        BroadcastedTx<SignedTx<SignerIssueTx>> & WithAssetId
      ];

      const [parsedApproveResult] = result;
      const expectedApproveResult = {
        type: 3 as const,
        version: 3,
        senderPublicKey: issuer.publicKey,
        name: data.name,
        description: data.description,
        quantity: data.quantity,
        decimals: data.decimals,
        reissuable: data.reissuable,
        fee: 100000000,
        chainId,
      };

      const bytes = makeTxBytes({
        ...expectedApproveResult,
        timestamp: parsedApproveResult.timestamp,
      });

      expect(parsedApproveResult).to.deep.contain(expectedApproveResult);
      expect(parsedApproveResult.id).to.equal(base58Encode(blake2b(bytes)));

      expect(
        verifySignature(issuer.publicKey, bytes, parsedApproveResult.proofs[0])
      ).to.be.true;

      assetWithMaxValuesId = parsedApproveResult.assetId;
    });

    it('Asset with min values', async function () {
      const data = {
        name: 'Four',
        description: '',
        quantity: 1,
        decimals: 0 as const,
        reissuable: false,
      };
      await performIssueTransaction.call(this, data);

      await approveMessage.call(this);
      await closeMessage.call(this);

      const result = (await getSignTransactionResult.call(this)) as [
        BroadcastedTx<SignedTx<SignerIssueTx>> & WithAssetId
      ];

      const [parsedApproveResult] = result;
      const expectedApproveResult = {
        type: 3 as const,
        version: 3,
        senderPublicKey: issuer.publicKey,
        name: data.name,
        description: data.description,
        quantity: data.quantity,
        decimals: data.decimals,
        reissuable: data.reissuable,
        fee: 100000,
        chainId,
      };

      const bytes = makeTxBytes({
        ...expectedApproveResult,
        timestamp: parsedApproveResult.timestamp,
      });

      expect(parsedApproveResult).to.deep.contain(expectedApproveResult);
      expect(parsedApproveResult.id).to.equal(base58Encode(blake2b(bytes)));

      expect(
        verifySignature(issuer.publicKey, bytes, parsedApproveResult.proofs[0])
      ).to.be.true;

      assetWithMinValuesId = parsedApproveResult.assetId;
    });

    it('Smart asset', async function () {
      const data = {
        name: 'Smart Asset',
        description: 'Asset with script',
        quantity: 100000000000,
        decimals: 8 as const,
        reissuable: true,
        script: 'base64:BQbtKNoM',
      };
      await performIssueTransaction.call(this, data);

      await approveMessage.call(this);
      await closeMessage.call(this);

      const result = (await getSignTransactionResult.call(this)) as [
        BroadcastedTx<SignedTx<SignerIssueTx>> & WithAssetId
      ];

      const [parsedApproveResult] = result;
      const expectedApproveResult = {
        type: 3 as const,
        version: 3,
        senderPublicKey: issuer.publicKey,
        name: data.name,
        description: data.description,
        quantity: data.quantity,
        decimals: data.decimals,
        reissuable: data.reissuable,
        script: data.script,
        fee: 100000000,
        chainId,
      };

      const bytes = makeTxBytes({
        ...expectedApproveResult,
        timestamp: parsedApproveResult.timestamp,
      });

      expect(parsedApproveResult).to.deep.contain(expectedApproveResult);
      expect(parsedApproveResult.id).to.equal(base58Encode(blake2b(bytes)));

      expect(
        verifySignature(issuer.publicKey, bytes, parsedApproveResult.proofs[0])
      ).to.be.true;

      assetSmartId = parsedApproveResult.assetId;
    });

    it('NFT', async function () {
      const data = {
        name: 'Non-fungible',
        description:
          'NFT is a non-reissuable asset with quantity 1 and decimals 0',
        quantity: 1,
        decimals: 0 as const,
        reissuable: false,
        script: 'base64:BQbtKNoM',
      };
      await performIssueTransaction.call(this, data);

      await approveMessage.call(this);
      await closeMessage.call(this);

      const result = (await getSignTransactionResult.call(this)) as [
        BroadcastedTx<SignedTx<SignerIssueTx>> & WithAssetId
      ];

      const [parsedApproveResult] = result;
      const expectedApproveResult = {
        type: 3 as const,
        version: 3,
        senderPublicKey: issuer.publicKey,
        name: data.name,
        description: data.description,
        quantity: data.quantity,
        decimals: data.decimals,
        reissuable: data.reissuable,
        script: data.script,
        fee: 100000,
        chainId,
      };

      const bytes = makeTxBytes({
        ...expectedApproveResult,
        timestamp: parsedApproveResult.timestamp,
      });

      expect(parsedApproveResult).to.deep.contain(expectedApproveResult);
      expect(parsedApproveResult.id).to.equal(base58Encode(blake2b(bytes)));

      expect(
        verifySignature(issuer.publicKey, bytes, parsedApproveResult.proofs[0])
      ).to.be.true;

      nftId = parsedApproveResult.assetId;
    });
  });

  describe('Editing an asset', function () {
    it('Reissue', async function () {
      const data: ReissueArgs = {
        quantity: 777,
        assetId: assetSmartId,
        reissuable: false,
      };

      const { waitForNewWindows } = await Windows.captureNewWindows.call(this);
      await this.driver.executeScript(data => {
        window.result = window.signer.reissue(data).broadcast();
      }, data);
      [messageWindow] = await waitForNewWindows(1);
      await this.driver.switchTo().window(messageWindow);
      await this.driver.navigate().refresh();

      await approveMessage.call(this);
      await closeMessage.call(this);

      const result = (await getSignTransactionResult.call(this)) as [
        BroadcastedTx<SignedTx<SignerReissueTx>>
      ];

      const [parsedApproveResult] = result;
      const expectedApproveResult = {
        type: 5 as const,
        version: 3,
        senderPublicKey: issuer.publicKey,
        assetId: data.assetId,
        quantity: data.quantity,
        reissuable: data.reissuable,
        fee: 500000,
        chainId,
      };

      const bytes = makeTxBytes({
        ...expectedApproveResult,
        timestamp: parsedApproveResult.timestamp,
      });

      expect(parsedApproveResult).to.deep.contain(expectedApproveResult);
      expect(parsedApproveResult.id).to.equal(base58Encode(blake2b(bytes)));

      expect(
        verifySignature(issuer.publicKey, bytes, parsedApproveResult.proofs[0])
      ).to.be.true;
    });

    it('Burn', async function () {
      const data: BurnArgs = {
        amount: 100500,
        assetId: assetSmartId,
      };

      const { waitForNewWindows } = await Windows.captureNewWindows.call(this);
      await this.driver.executeScript(data => {
        window.result = window.signer.burn(data).broadcast();
      }, data);
      [messageWindow] = await waitForNewWindows(1);
      await this.driver.switchTo().window(messageWindow);
      await this.driver.navigate().refresh();

      await approveMessage.call(this);
      await closeMessage.call(this);

      const result = (await getSignTransactionResult.call(this)) as [
        BroadcastedTx<SignedTx<SignerBurnTx>>
      ];

      const [parsedApproveResult] = result;
      const expectedApproveResult = {
        type: 6 as const,
        version: 3,
        senderPublicKey: issuer.publicKey,
        assetId: data.assetId,
        amount: data.amount,
        fee: 500000,
        chainId,
      };

      const bytes = makeTxBytes({
        ...expectedApproveResult,
        timestamp: parsedApproveResult.timestamp,
      });

      expect(parsedApproveResult).to.deep.contain(expectedApproveResult);
      expect(parsedApproveResult.id).to.equal(base58Encode(blake2b(bytes)));

      expect(
        verifySignature(issuer.publicKey, bytes, parsedApproveResult.proofs[0])
      ).to.be.true;
    });

    it('Set asset script', async function () {
      const data: SetAssetScriptArgs = {
        assetId: assetSmartId,
        script: 'base64:BQQAAAAHJG1hdGNoMAUAAAACdHgGGDRbEA==',
      };

      const { waitForNewWindows } = await Windows.captureNewWindows.call(this);
      await this.driver.executeScript(data => {
        window.result = window.signer.setAssetScript(data).broadcast();
      }, data);
      [messageWindow] = await waitForNewWindows(1);
      await this.driver.switchTo().window(messageWindow);
      await this.driver.navigate().refresh();

      await approveMessage.call(this);
      await closeMessage.call(this);

      const result = (await getSignTransactionResult.call(this)) as [
        BroadcastedTx<SignedTx<SignerSetAssetScriptTx>>
      ];

      const [parsedApproveResult] = result;
      const expectedApproveResult = {
        type: 15 as const,
        version: 2,
        senderPublicKey: issuer.publicKey,
        assetId: data.assetId,
        fee: 100000000,
        script: data.script,
        chainId,
      };

      const bytes = makeTxBytes({
        ...expectedApproveResult,
        timestamp: parsedApproveResult.timestamp,
      });

      expect(parsedApproveResult).to.deep.contain(expectedApproveResult);
      expect(parsedApproveResult.id).to.equal(base58Encode(blake2b(bytes)));

      expect(
        verifySignature(issuer.publicKey, bytes, parsedApproveResult.proofs[0])
      ).to.be.true;
    });

    async function performSponsorshipTransaction(
      this: mocha.Context,
      data: SponsorshipArgs
    ) {
      const { waitForNewWindows } = await Windows.captureNewWindows.call(this);
      await this.driver.executeScript(data => {
        window.result = window.signer.sponsorship(data).broadcast();
      }, data);
      [messageWindow] = await waitForNewWindows(1);
      await this.driver.switchTo().window(messageWindow);
      await this.driver.navigate().refresh();
    }

    it('Enable sponsorship fee', async function () {
      const data: SponsorshipArgs = {
        minSponsoredAssetFee: 10000000,
        assetId: assetWithMaxValuesId,
      };

      await performSponsorshipTransaction.call(this, data);

      await approveMessage.call(this);
      await closeMessage.call(this);

      const result = (await getSignTransactionResult.call(this)) as [
        BroadcastedTx<SignedTx<SignerSponsorshipTx>>
      ];

      const [parsedApproveResult] = result;
      const expectedApproveResult = {
        type: 14 as const,
        version: 2,
        senderPublicKey: issuer.publicKey,
        minSponsoredAssetFee: data.minSponsoredAssetFee,
        assetId: data.assetId,
        fee: 100000,
        chainId,
      };

      const bytes = makeTxBytes({
        ...expectedApproveResult,
        timestamp: parsedApproveResult.timestamp,
      });

      expect(parsedApproveResult).to.deep.contain(expectedApproveResult);
      expect(parsedApproveResult.id).to.equal(base58Encode(blake2b(bytes)));

      expect(
        verifySignature(issuer.publicKey, bytes, parsedApproveResult.proofs[0])
      ).to.be.true;
    });

    it('Disable sponsorship fee', async function () {
      const data: SponsorshipArgs = {
        minSponsoredAssetFee: 0,
        assetId: assetWithMaxValuesId,
      };

      await performSponsorshipTransaction.call(this, data);

      await approveMessage.call(this);
      await closeMessage.call(this);

      const result = (await getSignTransactionResult.call(this)) as [
        BroadcastedTx<SignedTx<SignerSponsorshipTx>>
      ];

      const [parsedApproveResult] = result;
      const expectedApproveResult = {
        type: 14 as const,
        version: 2,
        senderPublicKey: issuer.publicKey,
        minSponsoredAssetFee: null,
        assetId: data.assetId,
        fee: 100000,
        chainId,
      };

      const bytes = makeTxBytes({
        ...expectedApproveResult,
        timestamp: parsedApproveResult.timestamp,
      });

      expect(parsedApproveResult).to.deep.contain(expectedApproveResult);
      expect(parsedApproveResult.id).to.equal(base58Encode(blake2b(bytes)));

      expect(
        verifySignature(issuer.publicKey, bytes, parsedApproveResult.proofs[0])
      ).to.be.true;
    });
  });

  describe('Transfers', function () {
    it('Transfer');
    it('Mass transfer');
  });

  describe('Record in the account data storage', function () {
    it('Write to Data storage');
    it('Remove entry from Data storage');
    it('Write MAX values to Data storage');
  });

  describe('Installing the script on the account and calling it', function () {
    it('Set script');
    it('Invoke script with payment');
    it('Invoke with argument');
    it('Invoke with long arguments and payments list');
    it('Remove script');
  });

  describe('Leasing', function () {
    it('Lease');
    it('Cancel lease');
  });

  describe('Aliases', function () {
    it('Create alias');
  });
});
