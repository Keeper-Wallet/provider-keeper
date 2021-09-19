import { expect } from 'chai';
import { Builder, until, By } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import { GenericContainer, StartedTestContainer, Network, Wait } from 'testcontainers';
import { resolve } from 'path';
import { fetchExtension, setupNodeAccounts, setupWavesKeeperAccounts } from './ui';

const s = 1000,
    m = 60000;

describe('Selenium webdriver', function () {
    let browser, driver, cSelenium: StartedTestContainer, cUI: StartedTestContainer, cNode: StartedTestContainer;
    const extension = 'lpilbniiabackdjcionkobglmddfbcjo';
    const node = { host: 'node', port: 6869, url: '' };
    const ui = { host: 'ui', port: 8081, dockerFilePath: resolve(__dirname, '..', '..', '..') };
    const accounts = {
        rich: 'waves private node seed with waves tokens',
        default: 'waves private node seed with test account',
        smart: 'waves private node seed with smart account',
    };

    this.timeout(10 * m);
    let nodeUrl: string;
    let uiUrl: string;
    let tabWavesKeeper, tabUI;

    before(async function () {
        this.timeout(5 * m);

        const ext = fetchExtension(extension);

        const local = await new Network().start();
        node.url = `http://${node.host}:${node.port}`;
        // waves-node container
        cNode = await new GenericContainer('wavesplatform/waves-private-node')
            .withExposedPorts(node.port)
            .withNetworkMode(local.getName())
            .withNetworkAliases(node.host)
            .withHealthCheck({
                test: `curl -f ${node.url}/node/version`,
                startPeriod: 15000,
            })
            .withWaitStrategy(Wait.forHealthCheck())
            .start();

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

        nodeUrl = `http://${node.host}:${node.port}`;
        await setupNodeAccounts(nodeUrl, accounts);
        await setupWavesKeeperAccounts(extension, driver, nodeUrl, accounts);

        // prepare browse keeper and ui tabs
        uiUrl = 'http://127.0.0.1:8081';
        await driver.get(`chrome-extension://${extension}/popup.html`);
        tabWavesKeeper = await driver.getWindowHandle();
        await driver.switchTo().newWindow('tab');
        await driver.get(uiUrl);
        tabUI = await driver.getWindowHandle();
        await driver.sleep(2000);
    });

    after(async function () {
        this.timeout(60 * s);
        driver && (await driver.quit());
        browser && (await browser.deleteSession());
        cSelenium && (await cSelenium.stop());
        cUI && (await cUI.stop());
    });

    it('login', async () => {
        const timeout = 10000;
        await driver.switchTo().window(tabUI);

        const loginBtn = await driver.wait(until.elementLocated(By.css('.js-login')), timeout);
        await driver.wait(until.elementIsEnabled(loginBtn), timeout);
        await loginBtn.click();
        // await driver.sleep(10000);
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
        const explorerLink = await driver.findElement(By.css('.explorer-link'));
        expect(await explorerLink.isDisplayed()).to.be.true;
    });
});
