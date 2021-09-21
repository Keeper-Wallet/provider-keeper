import { expect } from 'chai';
import { Builder, until, By } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import { GenericContainer, StartedTestContainer, Network, StartedNetwork } from 'testcontainers';
import { resolve } from 'path';
import { fetchExtension, setupWavesKeeperAccounts } from './ui';
import { TRANSACTION_TYPE } from '@waves/ts-types';

const s = 1000,
    m = 60000,
    timeout = 10 * s,
    maxLong = '9223372036854775807',
    minLong = '-9223372036854775808',
    assetScript = '7sP5abE9nGRwZxkgaEXgkQDZ3ERBcm9PLHixaUE5SYoT',
    scriptTrue = 'base64:BQbtKNoM',
    scriptTest =
        'base64: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',
    dApp = '3My2kBJaGfeM2koiZroaYdd3y8rAgfV2EAx',
    dAppMinFee = 1000000;

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

    const isValidSignedTx = async (formSelector, tx) => {
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
        expect(signedTx.id).to.exist;
        expect(signedTx.type).to.exist;
        expect(signedTx.chainId).to.exist;
        expect(signedTx.senderPublicKey).to.exist;
        expect(signedTx.timestamp).to.exist;
        expect(signedTx.proofs).to.exist;
        expect(signedTx.version).to.exist;
    };

    it('issue tx', async () => {
        await isValidSignedTx(By.xpath("//div[contains(@class, '-issueTx')]"), {
            type: TRANSACTION_TYPE.ISSUE,
            name: 'UiTest',
            decimals: 8,
            quantity: maxLong,
            reissuable: true,
            description: 'issued token from ui test',
            script: scriptTrue,
        });
    });

    it('transfer tx', async () => {
        await isValidSignedTx(By.xpath("//div[contains(@class, '-transferTx')]"), {
            type: TRANSACTION_TYPE.TRANSFER,
            amount: 1,
            recipient: 'merry',
        });
    });

    it('reissue tx', async () => {
        await isValidSignedTx(By.xpath("//div[contains(@class, '-reissueTx')]"), {
            type: TRANSACTION_TYPE.REISSUE,
            assetId: assetScript,
            quantity: maxLong,
            reissuable: true,
        });
    });

    it('burn tx', async () => {
        await isValidSignedTx(By.xpath("//div[contains(@class, '-burnTx')]"), {
            type: TRANSACTION_TYPE.BURN,
            assetId: assetScript,
            amount: maxLong,
        });
    });

    it('lease tx', async () => {
        await isValidSignedTx(By.xpath("//div[contains(@class, '-leaseTx')]"), {
            type: TRANSACTION_TYPE.LEASE,
            amount: maxLong,
            recipient: 'merry',
        });
    });

    it('cancel lease tx', async () => {
        await isValidSignedTx(By.xpath("//div[contains(@class, '-cancelLeaseTx')]"), {
            type: TRANSACTION_TYPE.CANCEL_LEASE,
            leaseId: '6r2u8Bf3WTqJw4HQvPTsWs8Zak5PLwjzjjGU76nXph1u',
        });
    });

    it('alias tx', async () => {
        await isValidSignedTx(By.xpath("//div[contains(@class, '-aliasTx')]"), {
            type: TRANSACTION_TYPE.ALIAS,
            alias: `testy`,
        });
    });

    it('mass transfer tx', async () => {
        await isValidSignedTx(By.xpath("//div[contains(@class, '-massTransferTx')]"), {
            type: TRANSACTION_TYPE.MASS_TRANSFER,
            transfers: [
                {
                    amount: maxLong,
                    recipient: 'testy',
                },
                {
                    amount: 1,
                    recipient: 'merry',
                },
            ],
        });
    });

    it('data tx', async () => {
        await isValidSignedTx(By.xpath("//div[contains(@class, '-dataTx')]"), {
            type: TRANSACTION_TYPE.DATA,
            data: [
                { key: 'name', type: 'string', value: 'Lorem ipsum dolor sit amet' },
                { key: 'longMaxValue', type: 'integer', value: maxLong },
                { key: 'longMinValue', type: 'integer', value: minLong },
                { key: 'flag1', type: 'boolean', value: true },
                { key: 'flag2', type: 'boolean', value: true },
                { key: 'flag3', type: 'boolean', value: true },
                { key: 'flag4', type: 'boolean', value: true },
            ],
        });
    });

    it('set script tx', async () => {
        await isValidSignedTx(By.xpath("//div[contains(@class, '-setScriptTx')]"), {
            type: TRANSACTION_TYPE.SET_SCRIPT,
            script: scriptTest,
        });
    });

    it('sponsorship tx', async () => {
        await isValidSignedTx(By.xpath("//div[contains(@class, '-sponsorshipTx')]"), {
            type: TRANSACTION_TYPE.SPONSORSHIP,
            assetId: assetScript,
            minSponsoredAssetFee: maxLong,
        });
    });

    it('set asset script tx', async () => {
        await isValidSignedTx(By.xpath("//div[contains(@class, '-assetScriptTx')]"), {
            type: TRANSACTION_TYPE.SET_ASSET_SCRIPT,
            assetId: assetScript,
            script: scriptTrue,
        });
    });

    describe('invoke tx', async () => {
        it('default call', async () => {
            await isValidSignedTx(By.xpath("//div[contains(@class, '-scriptInvocationTx')]"), {
                type: TRANSACTION_TYPE.INVOKE_SCRIPT,
                dApp: dApp,
                fee: dAppMinFee,
                call: {
                    function: 'default',
                    args: [],
                },
                payment: [],
            });
        });

        it('with no args but single payment', async () => {
            await isValidSignedTx(By.xpath("//div[contains(@class, '-scriptInvocationTx')]"), {
                type: TRANSACTION_TYPE.INVOKE_SCRIPT,
                dApp: dApp,
                fee: dAppMinFee,
                payment: [
                    {
                        assetId: 'WAVES',
                        amount: maxLong,
                    },
                ],
                call: {
                    function: 'callWithPaymentsButNoArgs',
                    args: [],
                },
            });
        });

        it('with no args but many payments', async () => {
            await isValidSignedTx(By.xpath("//div[contains(@class, '-scriptInvocationTx')]"), {
                type: TRANSACTION_TYPE.INVOKE_SCRIPT,
                dApp: dApp,
                fee: dAppMinFee,
                payment: [
                    {
                        assetId: 'WAVES',
                        amount: 1,
                    },
                    {
                        assetId: 'WAVES',
                        amount: 1,
                    },
                    {
                        assetId: 'WAVES',
                        amount: 1,
                    },
                    {
                        assetId: 'WAVES',
                        amount: 1,
                    },
                    {
                        assetId: 'WAVES',
                        amount: 1,
                    },
                    {
                        assetId: 'WAVES',
                        amount: 1,
                    },
                    {
                        assetId: 'WAVES',
                        amount: 1,
                    },
                    {
                        assetId: 'WAVES',
                        amount: 1,
                    },
                    {
                        assetId: 'WAVES',
                        amount: 1,
                    },
                    {
                        assetId: 'WAVES',
                        amount: 1,
                    },
                ],
                call: {
                    function: 'callWithPaymentsButNoArgs',
                    args: [],
                },
            });
        });

        it('with native args and no payments', async () => {
            await isValidSignedTx(By.xpath("//div[contains(@class, '-scriptInvocationTx')]"), {
                type: TRANSACTION_TYPE.INVOKE_SCRIPT,
                dApp: dApp,
                fee: dAppMinFee,
                call: {
                    function: 'callWithNativeArgsAndNoPayments',
                    args: [
                        { type: 'binary', value: 'base64:BQbtKNoM' },
                        { type: 'boolean', value: true },
                        { type: 'integer', value: maxLong },
                        { type: 'string', value: 'Lorem ipsum dolor sit amet' },
                    ],
                },
                payment: [],
            });
        });

        it('with list args and no payments', async () => {
            await isValidSignedTx(By.xpath("//div[contains(@class, '-scriptInvocationTx')]"), {
                type: TRANSACTION_TYPE.INVOKE_SCRIPT,
                dApp: dApp,
                fee: dAppMinFee,
                call: {
                    function: 'callWithListArgsAndNoPayments',
                    args: [
                        {
                            type: 'list',
                            value: [
                                { type: 'binary', value: scriptTrue },
                                { type: 'binary', value: scriptTest },
                            ],
                        },
                        {
                            type: 'list',
                            value: [
                                { type: 'boolean', value: true },
                                { type: 'boolean', value: false },
                            ],
                        },
                        {
                            type: 'list',
                            value: [
                                { type: 'integer', value: maxLong },
                                { type: 'integer', value: minLong },
                            ],
                        },
                        {
                            type: 'list',
                            value: [
                                { type: 'string', value: 'Lorem ipsum' },
                                { type: 'string', value: 'dolor sit amet' },
                            ],
                        },
                    ],
                },
                payment: [],
            });
        });
    });
});
