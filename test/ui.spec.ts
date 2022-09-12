import { expect } from 'chai';
import * as mocha from 'mocha';
import { By, until } from 'selenium-webdriver';
import {
  AliasArgs,
  BurnArgs,
  CancelLeaseArgs,
  DataArgs,
  InvokeArgs,
  LeaseArgs,
  MassTransferArgs,
  ReissueArgs,
  SetAssetScriptArgs,
  SetScriptArgs,
  SignedTx,
  Signer,
  SignerAliasTx,
  SignerBurnTx,
  SignerCancelLeaseTx,
  SignerDataTx,
  SignerInvokeTx,
  SignerIssueTx,
  SignerLeaseTx,
  SignerMassTransferTx,
  SignerReissueTx,
  SignerSetAssetScriptTx,
  SignerSetScriptTx,
  SignerSponsorshipTx,
  SignerTransferTx,
  SponsorshipArgs,
  TransferArgs,
  TypedData,
  UserData,
} from '@waves/signer';
import { Accounts, App, Network, Settings, Windows } from './utils/actions';
import { ProviderKeeper } from '../src';
import {
  address,
  base58Encode,
  blake2b,
  publicKey,
  stringToBytes,
  verifySignature,
} from '@waves/ts-lib-crypto';
import { ISSUER_SEED, USER_1_SEED, USER_2_SEED } from './utils/constants';
import { BroadcastedTx, IssueArgs } from '@waves/signer/dist/cjs/types';
import { makeTxBytes, serializeCustomData } from '@waves/waves-transactions';
import { faucet, getNetworkByte } from './utils/nodeInteraction';
import { ERRORS } from '@waves/signer/dist/cjs/SignerError';
import { ICustomDataV2 } from '@waves/waves-transactions/src/requests/custom-data';

const m = 60000;
const WAVES = Math.pow(10, 8); // waves token scale

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
    await Accounts.importAccount.call(this, 'user2', USER_2_SEED);
    await Accounts.importAccount.call(this, 'user1', USER_1_SEED);
    await Accounts.importAccount.call(this, 'issuer', ISSUER_SEED);
    await Network.switchTo.call(this, 'Testnet');
    await Accounts.importAccount.call(this, 'test', ISSUER_SEED);

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
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        result!.then(done).catch(done);
        delete window.result;
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

    async function getCurrentProviderUser(
      this: mocha.Context
    ): Promise<UserData> {
      return this.driver.executeScript(
        () => window.signer.currentProvider?.user
      );
    }

    it('Approved', async function () {
      await waitPermissionRequest.call(this);
      await approveMessage.call(this);
      await closeMessage.call(this);

      const result = await getPermissionRequestResult.call(this);

      expect(result).to.deep.equal({
        address: issuer.address,
        publicKey: issuer.publicKey,
      });

      const currentUser = await getCurrentProviderUser.call(this);

      expect(currentUser).to.deep.equal({
        address: issuer.address,
        publicKey: issuer.publicKey,
      });
    });

    it('Logged out', async function () {
      const result = await this.driver.executeAsyncScript((...args) => {
        const done = args[args.length - 1];

        window.signer
          .logout()
          .then(() => done('RESOLVED'))
          .catch(() => done('REJECTED'));
      });

      expect(result).to.equal('RESOLVED');

      const currentUser = await getCurrentProviderUser.call(this);

      expect(currentUser).to.be.null;
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

      const currentUser = await getCurrentProviderUser.call(this);

      expect(currentUser).to.deep.equal({
        address: issuer.address,
        publicKey: issuer.publicKey,
      });
    });
  });

  async function getApproveResult(this: mocha.Context) {
    return this.driver.executeAsyncScript(function (...args) {
      const done = args[args.length - 1];
      const { result } = window;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      result!.then(done).catch(done);
      delete window.result;
    });
  }

  describe('Custom data', async function () {
    it('signMessage', async function () {
      const data = 'test-message-to-sign';

      const { waitForNewWindows } = await Windows.captureNewWindows.call(this);
      await this.driver.executeScript(data => {
        window.result = window.signer.signMessage(data);
      }, data);

      [messageWindow] = await waitForNewWindows(1);
      await this.driver.switchTo().window(messageWindow);
      await this.driver.navigate().refresh();

      await approveMessage.call(this);
      await closeMessage.call(this);

      const signature = (await getApproveResult.call(this)) as string;

      expect(
        verifySignature(
          issuer.publicKey,
          serializeCustomData({
            version: 1,
            binary: 'base64:' + btoa(data),
          }),
          signature
        )
      ).to.be.true;
    });

    it('signTypedData', async function () {
      const data: TypedData[] = [
        {
          key: 'stringValue',
          type: 'string' as const,
          value: 'Lorem ipsum dolor sit amet',
        },
        {
          key: 'longMaxValue',
          type: 'integer' as const,
          value: '9223372036854775807',
        },
        { key: 'flagValue', type: 'boolean' as const, value: true },
        { key: 'base64', type: 'binary' as const, value: 'base64:BQbtKNoM' },
      ];

      const { waitForNewWindows } = await Windows.captureNewWindows.call(this);
      await this.driver.executeScript(data => {
        window.result = window.signer.signTypedData(data);
      }, data);

      [messageWindow] = await waitForNewWindows(1);
      await this.driver.switchTo().window(messageWindow);
      await this.driver.navigate().refresh();

      await approveMessage.call(this);
      await closeMessage.call(this);

      const signature = (await getApproveResult.call(this)) as string;

      expect(
        verifySignature(
          issuer.publicKey,
          serializeCustomData({
            version: 2,
            data: data as ICustomDataV2['data'],
          }),
          signature
        )
      ).to.be.true;
    });
  });

  let assetWithMaxValuesId: string;
  let assetSmartId: string;

  describe('Asset issue', function () {
    async function performIssueTransaction(
      this: mocha.Context,
      data: IssueArgs
    ) {
      const { waitForNewWindows } = await Windows.captureNewWindows.call(this);
      await this.driver.executeScript(data => {
        window.result = window.signer
          .issue(data)
          .broadcast({ confirmations: 1 });
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

      const result = (await getApproveResult.call(this)) as [
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

      const result = (await getApproveResult.call(this)) as [
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

      const result = (await getApproveResult.call(this)) as [
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

      const result = (await getApproveResult.call(this)) as [
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
        window.result = window.signer
          .reissue(data)
          .broadcast({ confirmations: 0 });
      }, data);
      [messageWindow] = await waitForNewWindows(1);
      await this.driver.switchTo().window(messageWindow);
      await this.driver.navigate().refresh();

      await approveMessage.call(this);
      await closeMessage.call(this);

      const result = (await getApproveResult.call(this)) as [
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
        window.result = window.signer
          .burn(data)
          .broadcast({ confirmations: 0 });
      }, data);
      [messageWindow] = await waitForNewWindows(1);
      await this.driver.switchTo().window(messageWindow);
      await this.driver.navigate().refresh();

      await approveMessage.call(this);
      await closeMessage.call(this);

      const result = (await getApproveResult.call(this)) as [
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
        window.result = window.signer
          .setAssetScript(data)
          .broadcast({ confirmations: 0 });
      }, data);
      [messageWindow] = await waitForNewWindows(1);
      await this.driver.switchTo().window(messageWindow);
      await this.driver.navigate().refresh();

      await approveMessage.call(this);
      await closeMessage.call(this);

      const result = (await getApproveResult.call(this)) as [
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
        window.result = window.signer
          .sponsorship(data)
          .broadcast({ confirmations: 0 });
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

      const result = (await getApproveResult.call(this)) as [
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

      const result = (await getApproveResult.call(this)) as [
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
    it('Transfer', async function () {
      const data: TransferArgs = {
        amount: '10050000000000',
        assetId: assetWithMaxValuesId,
        recipient: user1.address,
        attachment: base58Encode(
          stringToBytes(
            'Far far away, behind the word mountains, far from the countries ' +
              'Vokalia and Consonantia, there live the blind texts. ' +
              'Separated they live in.'
          )
        ),
      };

      const { waitForNewWindows } = await Windows.captureNewWindows.call(this);
      await this.driver.executeScript(data => {
        window.result = window.signer
          .transfer(data)
          .broadcast({ confirmations: 0 });
      }, data);
      [messageWindow] = await waitForNewWindows(1);
      await this.driver.switchTo().window(messageWindow);
      await this.driver.navigate().refresh();

      await approveMessage.call(this);
      await closeMessage.call(this);

      const result = (await getApproveResult.call(this)) as [
        BroadcastedTx<SignedTx<SignerTransferTx>>
      ];

      const [parsedApproveResult] = result;
      const expectedApproveResult = {
        type: 4 as const,
        version: 3,
        senderPublicKey: issuer.publicKey,
        assetId: data.assetId,
        recipient: data.recipient,
        amount: data.amount,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        attachment: data.attachment!,
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

    it('Mass transfer', async function () {
      const data: MassTransferArgs = {
        transfers: [
          { recipient: user1.address, amount: 10000000 },
          { recipient: user2.address, amount: 10000000 },
        ],
        attachment: base58Encode(
          stringToBytes(
            'Far far away, behind the word mountains, far from the countries ' +
              'Vokalia and Consonantia, there live the blind texts. ' +
              'Separated they live in.'
          )
        ),
      };

      const { waitForNewWindows } = await Windows.captureNewWindows.call(this);
      await this.driver.executeScript(data => {
        window.result = window.signer
          .massTransfer(data)
          .broadcast({ confirmations: 0 });
      }, data);
      [messageWindow] = await waitForNewWindows(1);
      await this.driver.switchTo().window(messageWindow);
      await this.driver.navigate().refresh();

      await approveMessage.call(this);
      await closeMessage.call(this);

      const result = (await getApproveResult.call(this)) as [
        BroadcastedTx<SignedTx<SignerMassTransferTx>>
      ];

      const [parsedApproveResult] = result;
      const expectedApproveResult = {
        type: 11 as const,
        version: 2,
        senderPublicKey: issuer.publicKey,
        transfers: data.transfers,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        attachment: data.attachment!,
        fee: 200000,
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

  async function performDataTransaction(this: mocha.Context, data: DataArgs) {
    const { waitForNewWindows } = await Windows.captureNewWindows.call(this);
    await this.driver.executeScript(data => {
      window.result = window.signer.data(data).broadcast({ confirmations: 0 });
    }, data);
    [messageWindow] = await waitForNewWindows(1);
    await this.driver.switchTo().window(messageWindow);
    await this.driver.navigate().refresh();
  }

  describe('Record in the account data storage', function () {
    it('Write to Data storage', async function () {
      const data: DataArgs = {
        data: [
          {
            key: 'bool-entry',
            value: false,
            type: 'boolean',
          },
          {
            key: 'str-entry',
            value: 'Some string',
            type: 'string',
          },
          {
            key: 'binary',
            value: 'base64:AbCdAbCdAbCdAbCdAbCdAbCdAbCdAbCdAbCdAbCdAbCd',
            type: 'binary',
          },
          {
            key: 'integer',
            value: 20,
            type: 'integer',
          },
        ],
      };

      await performDataTransaction.call(this, data);

      await approveMessage.call(this);
      await closeMessage.call(this);

      const result = (await getApproveResult.call(this)) as [
        BroadcastedTx<SignedTx<SignerDataTx>>
      ];

      const [parsedApproveResult] = result;
      const expectedApproveResult = {
        type: 12 as const,
        version: 2,
        senderPublicKey: issuer.publicKey,
        data: data.data,
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

    it.skip('(unsupported by Signer) Remove entry from Data storage');

    it('Write MAX values to Data storage', async function () {
      const strValueMax =
        'Sed ut perspiciatis unde omnis iste natus error ' +
        'sit voluptatem accusantium doloremque laudantium, totam rem aperiam, ' +
        'eaque ipsa quae ab illo inventore\n'.repeat(217);
      const binValueMax = 'base64:' + btoa(strValueMax);
      const data: DataArgs = {
        data: [
          {
            key: 'bool-entry',
            value: true,
            type: 'boolean',
          },
          {
            key: 'str-entry',
            value: strValueMax,
            type: 'string',
          },
          {
            key: 'bin-entry',
            value: binValueMax,
            type: 'binary',
          },
          {
            key: 'int-entry',
            value: '9223372036854775807',
            type: 'integer',
          },
        ],
      };

      await performDataTransaction.call(this, data);

      await approveMessage.call(this);
      await closeMessage.call(this);

      const result = (await getApproveResult.call(this)) as [
        BroadcastedTx<SignedTx<SignerDataTx>>
      ];

      const [parsedApproveResult] = result;
      const expectedApproveResult = {
        type: 12 as const,
        version: 2,
        senderPublicKey: issuer.publicKey,
        data: data.data,
        fee: 1500000,
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

  async function changeKeeperAccountAndClose(
    this: mocha.Context,
    accountName: string
  ) {
    await this.driver.switchTo().newWindow('tab');
    await App.open.call(this);
    await Accounts.changeActiveAccount.call(this, accountName);
    await this.driver.close();
    await this.driver.switchTo().window(testAppTab);
  }

  async function waitKeeperAccountChanged(
    this: mocha.Context,
    user: { address: string; publicKey: string }
  ) {
    // todo this behaviour very tricky, should be removed later
    await this.driver.wait(async () => {
      const publicState = (await this.driver.executeAsyncScript(function (
        ...args
      ) {
        const done = args[args.length - 1];
        window.KeeperWallet.publicState().then(done);
      })) as WavesKeeper.IPublicStateResponse;

      return (
        publicState.account &&
        publicState.account.address == user.address &&
        publicState.account.publicKey == user.publicKey
      );
    }, this.wait);
  }

  describe('Installing the script on the account and calling it', function () {
    async function performSetScriptTransaction(
      this: mocha.Context,
      data: SetScriptArgs
    ) {
      const { waitForNewWindows } = await Windows.captureNewWindows.call(this);
      await this.driver.executeScript(data => {
        window.result = window.signer
          .setScript(data)
          .broadcast({ confirmations: 0 });
      }, data);

      [messageWindow] = await waitForNewWindows(1);
      await this.driver.switchTo().window(messageWindow);
      await this.driver.navigate().refresh();
    }

    it('Set script', async function () {
      await changeKeeperAccountAndClose.call(this, 'user1');
      await waitKeeperAccountChanged.call(this, user1);

      // script source see `test/utils/setScript.ride`
      const data: SetScriptArgs = {
        script:
          'base64:AAIFAAAAAAAAABIIAhIAEgMKAQESBwoFBAIBCB8AAAAAAAAAAwAAAANjdHgBAAAAB2RlcG9zaXQAAAAABAAAAANwbXQDCQAAZgAAAAIJAAGQAAAAAQgFAAAAA2N0eAAAAAhwYXltZW50cwAAAAAAAAAAAAkAAZE' +
          'AAAACCAUAAAADY3R4AAAACHBheW1lbnRzAAAAAAAAAAAACQAAAgAAAAECAAAAHUF0IGxlYXN0IG9uZSBwYXltZW50IGV4cGVjdGVkBAAAAAdhc3NldElkAwkBAAAACWlzRGVmaW5lZAAAAAEIBQAAAANwbXQAAAAH' +
          'YXNzZXRJZAkBAAAABXZhbHVlAAAAAQgFAAAAA3BtdAAAAAdhc3NldElkCQAAAgAAAAECAAAAG09ubHkgV0FWRVMgcGF5bWVudCBhY2NlcHRlZAkABEwAAAACCQEAAAAMSW50ZWdlckVudHJ5AAAAAgkABCUAAAABC' +
          'AUAAAADY3R4AAAABmNhbGxlcggFAAAAA3BtdAAAAAZhbW91bnQFAAAAA25pbAAAAANjdHgBAAAACHdpdGhkcmF3AAAAAQAAAAZhbW91bnQEAAAAB2FkZHJlc3MJAAQlAAAAAQgFAAAAA2N0eAAAAAZjYWxsZXIEAAA' +
          'AB2N1cnJlbnQJAQAAABN2YWx1ZU9yRXJyb3JNZXNzYWdlAAAAAgkABBoAAAACBQAAAAR0aGlzBQAAAAdhZGRyZXNzAgAAABhZb3UgZG9uJ3QgaGF2ZSBhIGRlcG9zaXQEAAAAA2FtdAMDCQAAZgAAAAIFAAAABmFtb3' +
          'VudAAAAAAAAAAAAAYJAABmAAAAAgUAAAAGYW1vdW50BQAAAAdjdXJyZW50BQAAAAZhbW91bnQJAAACAAAAAQIAAABEQW1vdW50IHRvIHdpdGhkcmF3IG11c3QgYmUgbW9yZSB0aGFuIDAgYW5kIGxlc3MgdGhhbiBj' +
          'dXJyZW50IGRlcG9zaXQDCQAAAAAAAAIFAAAABmFtb3VudAUAAAAHY3VycmVudAkABEwAAAACCQEAAAALRGVsZXRlRW50cnkAAAABBQAAAAdhZGRyZXNzBQAAAANuaWwJAARMAAAAAgkBAAAADEludGVnZXJFbnR' +
          'yeQAAAAIFAAAAB2FkZHJlc3MJAABlAAAAAgUAAAAHY3VycmVudAUAAAAGYW1vdW50CQAETAAAAAIJAQAAAA5TY3JpcHRUcmFuc2ZlcgAAAAMIBQAAAANjdHgAAAAGY2FsbGVyBQAAAAZhbW91bnQFAAAABHVuaXQF' +
          'AAAAA25pbAAAAANjdHgBAAAAC2FsbEFyZ1R5cGVzAAAABQAAAARib29sAAAAA2JpbgAAAANpbnQAAAADc3RyAAAABGxpc3QEAAAAB2luZGljZXMJAARMAAAAAgAAAAAAAAAAAQkABEwAAAACAAAAAAAAAAACCQAE' +
          'TAAAAAIAAAAAAAAAAAMJAARMAAAAAgAAAAAAAAAABAkABEwAAAACAAAAAAAAAAAFBQAAAANuaWwKAQAAAAtjb252ZXJ0TGlzdAAAAAIAAAADYWNjAAAABWluZGV4AwkAAGcAAAACBQAAAAVpbmRleAkAAZAAA' +
          'AABBQAAAARsaXN0BQAAAANhY2MEAAAAA2luZAkAAaQAAAABBQAAAAVpbmRleAkABE0AAAACBQAAAANhY2MEAAAAByRtYXRjaDAJAAGRAAAAAgUAAAAEbGlzdAUAAAAFaW5kZXgDCQAAAQAAAAIFAAAAByRtYXR' +
          'jaDACAAAAB0Jvb2xlYW4EAAAAAWIFAAAAByRtYXRjaDAJAQAAAAxCb29sZWFuRW50cnkAAAACCQABLAAAAAIFAAAAA2luZAIAAAAFLWJvb2wFAAAAAWIDCQAAAQAAAAIFAAAAByRtYXRjaDACAAAACkJ5dGVWZWN0b' +
          '3IEAAAAAWIFAAAAByRtYXRjaDAJAQAAAAtCaW5hcnlFbnRyeQAAAAIJAAEsAAAAAgUAAAADaW5kAgAAAAQtYmluBQAAAAFiAwkAAAEAAAACBQAAAAckbWF0Y2gwAgAAAANJbnQEAAAAAWkFAAAAByRtYXRjaDAJAQA' +
          'AAAxJbnRlZ2VyRW50cnkAAAACCQABLAAAAAIFAAAAA2luZAIAAAAELWludAUAAAABaQMJAAABAAAAAgUAAAAHJG1hdGNoMAIAAAAGU3RyaW5nBAAAAAFzBQAAAAckbWF0Y2gwCQEAAAALU3RyaW5nRW50cnkAAAA' +
          'CCQABLAAAAAIFAAAAA2luZAIAAAAELXN0cgUAAAABcwkAAAIAAAABAgAAAAtNYXRjaCBlcnJvcgkABE4AAAACCQAETAAAAAIJAQAAAAxCb29sZWFuRW50cnkAAAACAgAAAARib29sBQAAAARib29sCQAETAAAAAIJAQA' +
          'AAAtCaW5hcnlFbnRyeQAAAAICAAAAA2JpbgUAAAADYmluCQAETAAAAAIJAQAAAAxJbnRlZ2VyRW50cnkAAAACAgAAAANpbnQFAAAAA2ludAkABEwAAAACCQEAAAALU3RyaW5nRW50cnkAAAACAgAAAANzdHIFAAAAA' +
          '3N0cgUAAAADbmlsCgAAAAACJGwFAAAAB2luZGljZXMKAAAAAAIkcwkAAZAAAAABBQAAAAIkbAoAAAAABSRhY2MwBQAAAANuaWwKAQAAAAUkZjBfMQAAAAIAAAACJGEAAAACJGkDCQAAZwAAAAIFAAAAAiRpBQAAA' +
          'AIkcwUAAAACJGEJAQAAAAtjb252ZXJ0TGlzdAAAAAIFAAAAAiRhCQABkQAAAAIFAAAAAiRsBQAAAAIkaQoBAAAABSRmMF8yAAAAAgAAAAIkYQAAAAIkaQMJAABnAAAAAgUAAAACJGkFAAAAAiRzBQAAAAIkYQkAAAIAA' +
          'AABAgAAABNMaXN0IHNpemUgZXhjZWVkcyA1CQEAAAAFJGYwXzIAAAACCQEAAAAFJGYwXzEAAAACCQEAAAAFJGYwXzEAAAACCQEAAAAFJGYwXzEAAAACCQEAAAAFJGYwXzEAAAACCQEAAAAFJGYwXzEAAAA' +
          'CBQAAAAUkYWNjMAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAgAAAAAAAAAAAwAAAAAAAAAABAAAAAAAAAAABQAAAABWejDo',
      };

      await performSetScriptTransaction.call(this, data);

      await approveMessage.call(this);
      await closeMessage.call(this);

      const result = (await getApproveResult.call(this)) as [
        BroadcastedTx<SignedTx<SignerSetScriptTx>>
      ];

      const [parsedApproveResult] = result;
      const expectedApproveResult = {
        type: 13 as const,
        version: 2,
        senderPublicKey: user1.publicKey,
        script: data.script,
        fee: 300000,
        chainId,
      };

      const bytes = makeTxBytes({
        ...expectedApproveResult,
        timestamp: parsedApproveResult.timestamp,
      });

      expect(parsedApproveResult).to.deep.contain(expectedApproveResult);
      expect(parsedApproveResult.id).to.equal(base58Encode(blake2b(bytes)));

      expect(
        verifySignature(user1.publicKey, bytes, parsedApproveResult.proofs[0])
      ).to.be.true;
    });

    async function performInvokeTransaction(
      this: mocha.Context,
      data: InvokeArgs
    ) {
      const { waitForNewWindows } = await Windows.captureNewWindows.call(this);
      await this.driver.executeScript(data => {
        window.result = window.signer
          .invoke(data)
          .broadcast({ confirmations: 1 });
      }, data);

      [messageWindow] = await waitForNewWindows(1);
      await this.driver.switchTo().window(messageWindow);
      await this.driver.navigate().refresh();
    }

    it('Invoke script with payment', async function () {
      await changeKeeperAccountAndClose.call(this, 'issuer');
      await waitKeeperAccountChanged.call(this, issuer);

      const data: InvokeArgs = {
        dApp: user1.address,
        call: {
          function: 'deposit',
          args: [],
        },
        payment: [{ assetId: null, amount: 200000000 }],
      };

      await performInvokeTransaction.call(this, data);

      await approveMessage.call(this);
      await closeMessage.call(this);

      const result = (await getApproveResult.call(this)) as [
        BroadcastedTx<SignedTx<SignerInvokeTx>>
      ];

      const [parsedApproveResult] = result;
      const expectedApproveResult = {
        type: 16 as const,
        version: 2,
        senderPublicKey: issuer.publicKey,
        dApp: data.dApp,
        call: data.call,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        payment: data.payment!,
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

    it('Invoke with argument', async function () {
      const data: InvokeArgs = {
        dApp: user1.address,
        call: {
          function: 'withdraw',
          args: [{ type: 'integer', value: 100 }],
        },
        payment: [],
      };

      await performInvokeTransaction.call(this, data);

      await approveMessage.call(this);
      await closeMessage.call(this);

      const result = (await getApproveResult.call(this)) as [
        BroadcastedTx<SignedTx<SignerInvokeTx>>
      ];

      const [parsedApproveResult] = result;
      const expectedApproveResult = {
        type: 16 as const,
        version: 2,
        senderPublicKey: issuer.publicKey,
        dApp: data.dApp,
        call: data.call,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        payment: data.payment!,
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

    it('Invoke with long arguments and payments list', async function () {
      const binLong =
        'base64:' +
        btoa(
          new Uint8Array(
            Array(100).fill([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).flat()
          ).toString()
        );

      const data: InvokeArgs = {
        dApp: user1.address,
        call: {
          function: 'allArgTypes',
          args: [
            { type: 'boolean', value: true },
            { type: 'binary', value: binLong },
            { type: 'integer', value: '-9223372036854775808' },
            {
              type: 'string',
              value:
                'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. ' +
                'Aenean commodo ligula eget dolor. Aenean'.repeat(3),
            },
            {
              type: 'list',
              value: [
                { type: 'boolean', value: true },
                { type: 'binary', value: binLong },
                { type: 'integer', value: '-9223372036854775808' },
                {
                  type: 'string',
                  value:
                    'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. ' +
                    'Aenean commodo ligula eget dolor. Aenean'.repeat(3),
                },
              ],
            },
          ],
        },
        payment: [
          { assetId: null, amount: 27000000 },
          { assetId: assetWithMaxValuesId, amount: 27000000 },
          { assetId: assetSmartId, amount: 27000000 },
          { assetId: null, amount: 200000 },
          { assetId: assetWithMaxValuesId, amount: 150000 },
          { assetId: assetSmartId, amount: 12222 },
          { assetId: null, amount: 1212 },
          { assetId: assetWithMaxValuesId, amount: 3434 },
          { assetId: assetSmartId, amount: 5656 },
          { assetId: null, amount: 50000000 },
        ],
      };

      await performInvokeTransaction.call(this, data);

      await approveMessage.call(this);
      await closeMessage.call(this);

      const result = (await getApproveResult.call(this)) as [
        BroadcastedTx<SignedTx<SignerInvokeTx>>
      ];

      const [parsedApproveResult] = result;
      const expectedApproveResult = {
        type: 16 as const,
        version: 2,
        senderPublicKey: issuer.publicKey,
        dApp: data.dApp,
        call: data.call,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        payment: data.payment!,
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

    it('Remove script', async function () {
      await changeKeeperAccountAndClose.call(this, 'user1');
      await waitKeeperAccountChanged.call(this, user1);

      const data: SetScriptArgs = {
        script: null,
      };

      await performSetScriptTransaction.call(this, data);

      await approveMessage.call(this);
      await closeMessage.call(this);

      const result = (await getApproveResult.call(this)) as [
        BroadcastedTx<SignedTx<SignerSetScriptTx>>
      ];

      const [parsedApproveResult] = result;
      const expectedApproveResult = {
        type: 13 as const,
        version: 2,
        senderPublicKey: user1.publicKey,
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
        verifySignature(user1.publicKey, bytes, parsedApproveResult.proofs[0])
      ).to.be.true;
    });
  });

  describe('Leasing', function () {
    let leaseId: string;

    it('Lease', async function () {
      await changeKeeperAccountAndClose.call(this, 'issuer');
      await waitKeeperAccountChanged.call(this, issuer);

      const data: LeaseArgs = {
        amount: 1000,
        recipient: user2.address,
      };

      const { waitForNewWindows } = await Windows.captureNewWindows.call(this);
      await this.driver.executeScript(data => {
        window.result = window.signer
          .lease(data)
          .broadcast({ confirmations: 1 });
      }, data);

      [messageWindow] = await waitForNewWindows(1);
      await this.driver.switchTo().window(messageWindow);
      await this.driver.navigate().refresh();

      await approveMessage.call(this);
      await closeMessage.call(this);

      const result = (await getApproveResult.call(this)) as [
        SignedTx<SignerLeaseTx>
      ];

      const [parsedApproveResult] = result;
      const expectedApproveResult = {
        type: 8 as const,
        version: 3,
        senderPublicKey: issuer.publicKey,
        amount: data.amount,
        recipient: data.recipient,
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

      leaseId = parsedApproveResult.id;
    });

    it('Cancel lease', async function () {
      const data: CancelLeaseArgs = {
        leaseId,
      };

      const { waitForNewWindows } = await Windows.captureNewWindows.call(this);
      await this.driver.executeScript(data => {
        window.result = window.signer
          .cancelLease(data)
          .broadcast({ confirmations: 0 });
      }, data);

      [messageWindow] = await waitForNewWindows(1);
      await this.driver.switchTo().window(messageWindow);
      await this.driver.navigate().refresh();

      await approveMessage.call(this);
      await closeMessage.call(this);

      const result = (await getApproveResult.call(this)) as [
        BroadcastedTx<SignedTx<SignerCancelLeaseTx>>
      ];

      const [parsedApproveResult] = result;
      const expectedApproveResult = {
        type: 9 as const,
        version: 3,
        senderPublicKey: issuer.publicKey,
        leaseId: data.leaseId,
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

  describe('Aliases', function () {
    it('Create alias', async function () {
      const data: AliasArgs = {
        alias: 'test_' + Date.now(),
      };

      const { waitForNewWindows } = await Windows.captureNewWindows.call(this);
      await this.driver.executeScript(data => {
        window.result = window.signer
          .alias(data)
          .broadcast({ confirmations: 0 });
      }, data);

      [messageWindow] = await waitForNewWindows(1);
      await this.driver.switchTo().window(messageWindow);
      await this.driver.navigate().refresh();

      await approveMessage.call(this);
      await closeMessage.call(this);

      const result = (await getApproveResult.call(this)) as [
        BroadcastedTx<SignedTx<SignerAliasTx>>
      ];

      const [parsedApproveResult] = result;
      const expectedApproveResult = {
        type: 10 as const,
        version: 3,
        senderPublicKey: issuer.publicKey,
        alias: data.alias,
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
});
