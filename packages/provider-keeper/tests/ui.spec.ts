import { expect } from 'chai';
import { Builder, until, By } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import * as fs from 'fs';
import * as path from 'path';
import Extension from './utils/extension';

let extension, driver;
const extensionId = 'lpilbniiabackdjcionkobglmddfbcjo';

before(async () => {
    extension = new Extension(extensionId);
    const extensionPath = path.resolve(__dirname, '../extension.crx');
    await extension.saveTo(extensionPath);

    let options = new chrome.Options().addExtensions(
        fs.readFileSync(extensionPath, {
            encoding: 'base64',
        })
    );
    driver = new Builder().forBrowser('chrome').setChromeOptions(options).build();
});

after(async () => {
    if (driver) await driver.quit();
    if (extension) extension.delete();
});

describe('Selenium webdriver', function () {
    // @ts-ignore
    this.timeout(0);

    it('extension is loaded', async () => {
        driver.get(`chrome-extension://${extensionId}/popup.html`);
        let elem = await driver.wait(
            until.elementLocated(By.css('.app button[type=submit]')),
            5000,
            'Timeout after 10 sec',
            100
        );
        expect(await elem.getText()).to.be.equal('Get Started');
    });
});
