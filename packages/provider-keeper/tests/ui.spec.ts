import { expect } from 'chai';
import { Builder, until, By } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import fetchById from './utils/extension';
import { GenericContainer, StartedTestContainer, Network, Wait } from 'testcontainers';
import { resolve } from 'path';
import { transfer, broadcast, waitForTx } from '@waves/waves-transactions';
import { address } from '@waves/ts-lib-crypto';
import getNetworkCode from '@waves/node-api-js/cjs/tools/blocks/getNetworkCode';

let driver, cSelenium: StartedTestContainer, cUI: StartedTestContainer, cNode: StartedTestContainer;
const s = 1000,
    m = 60000;
const extensionId = 'lpilbniiabackdjcionkobglmddfbcjo';
const node = { host: 'node', port: 6869, url: '' };
const ui = { host: 'ui', port: 8081, dockerFilePath: resolve(__dirname, '..', '..', '..') };

const seeds = {
    rich: 'waves private node seed with waves tokens',
    default: 'waves private node seed with test account',
    smart: 'waves private node seed with smart account',
};

describe('Selenium webdriver', function () {
    this.timeout(10 * m);
    // first test may have extra lag time
    const webdriverLag = 30 * s;

    before(async function () {
        this.timeout(5 * m);

        const local = await new Network().start();
        const ext = fetchById(extensionId);
        // waves-node container
        node.url = `http://${node.host}:${node.port}`;

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
        // ui node container
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
        // transfer waves from rich account

        const exposedNodeUrl = `http://${cNode.getHost()}:${cNode.getMappedPort(node.port)}`;
        const options = {
            apiBase: exposedNodeUrl,
        };
        const chainId = await getNetworkCode(exposedNodeUrl);

        await waitForTx(
            (
                await broadcast(
                    transfer(
                        {
                            amount: '1000000000',
                            recipient: address(seeds.default, chainId),
                            chainId,
                        },
                        seeds.rich
                    ),
                    exposedNodeUrl
                )
            ).id,
            options
        );

        await waitForTx(
            (
                await broadcast(
                    transfer(
                        {
                            amount: '1000000000',
                            recipient: address(seeds.smart, chainId),
                            chainId,
                        },
                        seeds.rich
                    ),
                    exposedNodeUrl
                )
            ).id,
            options
        );
    });

    after(async function () {
        this.timeout(60 * s);

        driver && (await driver.quit());
        cSelenium && (await cSelenium.stop());
        cUI && (await cUI.stop());
    });

    it('extension is loaded', async () => {
        driver.get(`chrome-extension://${extensionId}/popup.html`);
        let elem = await driver.wait(until.elementLocated(By.css('.app button[type=submit]')), 10 * s, 'Timeout', 100);
        expect(await elem.getText()).to.be.equal('Get Started');
    });

    it('second test should be faster', async () => {
        let elem = await driver.wait(until.elementLocated(By.css('.app button[type=submit]')), 10 * s, 'Timeout', 100);
        expect(await elem.getText()).to.be.equal('Get Started');
    });
});
