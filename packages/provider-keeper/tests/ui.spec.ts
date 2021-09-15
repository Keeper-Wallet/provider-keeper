import { expect } from 'chai';
import { Builder, until, By } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import fetchById from './utils/extension';
import { GenericContainer } from 'testcontainers';

let driver, sc;
const s = 1000,
    m = 60000;
const extensionId = 'lpilbniiabackdjcionkobglmddfbcjo';

before(async function () {
    this.timeout(60 * s);

    const ext = fetchById(extensionId);
    // selenium container
    sc = await new GenericContainer('selenium/standalone-chrome').withExposedPorts(4444).start();
    // selenium webdriver
    driver = new Builder()
        .forBrowser('chrome')
        .usingServer(`http://${sc.getHost()}:${sc.getMappedPort(4444)}/wd/hub`)
        .setChromeOptions(new chrome.Options().addExtensions(await ext))
        .build();
});

after(async function () {
    this.timeout(60 * s);

    driver && (await driver.quit());
    sc && (await sc.stop());
});

describe('Selenium webdriver', function () {
    this.timeout(10 * m);
    // first test may have extra lag time
    const lag = 30 * s;

    it('extension is loaded', async () => {
        driver.get(`chrome-extension://${extensionId}/popup.html`);
        let elem = await driver.wait(
            until.elementLocated(By.css('.app button[type=submit]')),
            lag + 10 * s,
            'Timeout',
            100
        );
        expect(await elem.getText()).to.be.equal('Get Started');
    });

    it('second test should be faster', async () => {
        let elem = await driver.wait(until.elementLocated(By.css('.app button[type=submit]')), 10 * s, 'Timeout', 100);
        expect(await elem.getText()).to.be.equal('Get Started');
    });
});
