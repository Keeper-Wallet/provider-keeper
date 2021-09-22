import { expect } from 'chai';
import { Builder, until, By } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import { GenericContainer, StartedTestContainer, Network, StartedNetwork } from 'testcontainers';
import { resolve } from 'path';
import { fetchExtension, setupWavesKeeperAccounts } from './ui';
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

const s = 1000,
    m = 60000,
    timeout = 10 * s;

describe('Selenium webdriver', function () {
    let driver, cSelenium: StartedTestContainer, cUI: StartedTestContainer;
    const extension = 'lpilbniiabackdjcionkobglmddfbcjo';
    const ui = { host: 'ui', port: 8081, dockerFilePath: resolve(__dirname, '..', '..', '..') };
    const accounts = {
        rich: 'waves private node seed with waves tokens',
        default: 'waves private node seed with test account',
        smart: 'waves private node seed with smart account',
    };

    this.timeout(10 * m);
    let tabWavesKeeper, tabUI;

    before(async function () {
        this.timeout(5 * m);
        const ext: Promise<string> = fetchExtension(extension);
        const local: StartedNetwork = await new Network().start();

        // ui container
        cUI = await (await GenericContainer.fromDockerfile(ui.dockerFilePath).build())
            .withNetworkMode(local.getName())
            .withNetworkAliases(ui.host)
            .start();

        // selenium container
        cSelenium = await new GenericContainer('selenium/standalone-chrome')
            .withExposedPorts(4444)
            .withNetworkMode(local.getName())
            .start();

        // selenium webdriver
        driver = new Builder()
            .forBrowser('chrome')
            .usingServer(`http://${cSelenium.getHost()}:${cSelenium.getMappedPort(4444)}/wd/hub`)
            .setChromeOptions(new chrome.Options().addExtensions(await ext))
            .build();

        await setupWavesKeeperAccounts(extension, driver, accounts);

        // prepare browse keeper and ui tabs
        await driver.get(`chrome-extension://${extension}/popup.html`);
        tabWavesKeeper = await driver.getWindowHandle();

        await driver.switchTo().newWindow('tab');
        await driver.get(`http://${ui.host}:${ui.port}`);
        await driver.wait(until.elementLocated(By.id('sign-in')), timeout);
        tabUI = await driver.getWindowHandle();
        await driver.sleep(2000);
    });

    after(async function () {
        this.timeout(60 * s);
        driver && (await driver.quit());
        cSelenium && (await cSelenium.stop());
        cUI && (await cUI.stop());
    });

    it('auth tx', async () => {
        await driver.switchTo().window(tabUI);

        const loginBtn = await driver.wait(until.elementLocated(By.css('#sign-in:not(.disabled)')), timeout);
        await loginBtn.click();

        await driver.switchTo().window(tabWavesKeeper);
        // site permission request
        await driver.wait(until.elementLocated(By.xpath("//div[contains(@class, '-originAuthTx')]")));
        let acceptBtn = await driver.findElement(By.css('.app button[type=submit]'));
        await acceptBtn.click();
        // site auth request
        await driver.wait(until.elementLocated(By.xpath("//div[contains(@class, '-authTx')]")));
        acceptBtn = await driver.findElement(By.css('.app button[type=submit]'));
        await acceptBtn.click();
        // close window
        const closeBtn = await driver.wait(until.elementLocated(By.xpath("//button[contains(@class, '-closeBtn')]")));
        await closeBtn.click();

        await driver.switchTo().window(tabUI);
        const userData = await driver.executeScript(() => {
            return (window as any).getOutput();
        });
        expect(userData.signature).to.exist;
    });

    const signedTxShouldBeValid = async (tx, formSelector) => {
        await driver.switchTo().window(tabUI);
        await driver.executeScript((tx) => {
            (window as any).setInput(tx);
        }, tx);
        const sendTxBtn = await driver.wait(until.elementLocated(By.css('#send-tx:not(.disabled)')), timeout);
        await sendTxBtn.click();

        // tx request
        await driver.switchTo().window(tabWavesKeeper);
        await driver.wait(until.elementLocated(formSelector));
        const acceptBtn = await driver.findElement(By.css('.app button[type=submit]'));
        await acceptBtn.click();
        // close window
        const closeBtn = await driver.wait(until.elementLocated(By.xpath("//button[contains(@class, '-closeBtn')]")));
        await closeBtn.click();

        await driver.switchTo().window(tabUI);
        await driver.wait(until.elementLocated(By.css('#send-tx.disabled')), timeout);
        const signed = await driver.executeScript(() => {
            return (window as any).getOutput();
        });
        expect(signed.length).to.be.equal(1);
        const signedTx = signed[0];
        const commonFields = ['id', 'type', 'chainId', 'senderPublicKey', 'timestamp', 'proofs', 'version'];
        expect(signedTx).to.include.all.keys(...commonFields, ...Object.keys(tx));
    };

    it('issue tx', async () => {
        await signedTxShouldBeValid(ISSUE, By.xpath("//div[contains(@class, '-issueTx')]"));
    });

    it('transfer tx', async () => {
        await signedTxShouldBeValid(TRANSFER, By.xpath("//div[contains(@class, '-transferTx')]"));
    });

    it('reissue tx', async () => {
        await signedTxShouldBeValid(REISSUE, By.xpath("//div[contains(@class, '-reissueTx')]"));
    });

    it('burn tx', async () => {
        await signedTxShouldBeValid(BURN, By.xpath("//div[contains(@class, '-burnTx')]"));
    });

    it('lease tx', async () => {
        await signedTxShouldBeValid(LEASE, By.xpath("//div[contains(@class, '-leaseTx')]"));
    });

    it('cancel lease tx', async () => {
        await signedTxShouldBeValid(CANCEL_LEASE, By.xpath("//div[contains(@class, '-cancelLeaseTx')]"));
    });

    it('alias tx', async () => {
        await signedTxShouldBeValid(ALIAS, By.xpath("//div[contains(@class, '-aliasTx')]"));
    });

    it('mass transfer tx', async () => {
        await signedTxShouldBeValid(MASS_TRANSFER, By.xpath("//div[contains(@class, '-massTransferTx')]"));
    });

    it('data tx', async () => {
        await signedTxShouldBeValid(DATA, By.xpath("//div[contains(@class, '-dataTx')]"));
    });

    it('set script tx', async () => {
        await signedTxShouldBeValid(SET_SCRIPT, By.xpath("//div[contains(@class, '-setScriptTx')]"));
    });

    it('sponsorship tx', async () => {
        await signedTxShouldBeValid(SPONSORSHIP, By.xpath("//div[contains(@class, '-sponsorshipTx')]"));
    });

    it('set asset script tx', async () => {
        await signedTxShouldBeValid(SET_ASSET_SCRIPT, By.xpath("//div[contains(@class, '-assetScriptTx')]"));
    });

    describe('invoke tx', async () => {
        it('default call', async () => {
            await signedTxShouldBeValid(
                INVOKE_DEFAULT_CALL,
                By.xpath("//div[contains(@class, '-scriptInvocationTx')]")
            );
        });

        it('with no args but single payment', async () => {
            await signedTxShouldBeValid(
                INVOKE_NO_ARGS_SINGLE_PAYMENTS,
                By.xpath("//div[contains(@class, '-scriptInvocationTx')]")
            );
        });

        it('with no args but many payments', async () => {
            await signedTxShouldBeValid(
                INVOKE_NO_ARGS_MANY_PAYMENTS,
                By.xpath("//div[contains(@class, '-scriptInvocationTx')]")
            );
        });

        it('with native args and no payments', async () => {
            await signedTxShouldBeValid(
                INVOKE_NATIVE_ARGS_NO_PAYMENTS,
                By.xpath("//div[contains(@class, '-scriptInvocationTx')]")
            );
        });

        it('with list args and no payments', async () => {
            await signedTxShouldBeValid(
                INVOKE_LIST_ARGS_NO_PAYMENTS,
                By.xpath("//div[contains(@class, '-scriptInvocationTx')]")
            );
        });
    });
});
