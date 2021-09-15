import { expect } from 'chai';
import { Builder, until, By } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import * as fs from 'fs';
import * as path from 'path';

let driver;
const extensionId = 'lpilbniiabackdjcionkobglmddfbcjo';
const extensionUrl =
    'https://clients2.google.com/service/update2/crx?' +
    'response=redirect' +
    '&os=mac' +
    '&arch=x86-64' +
    '&os_arch=x86-64' +
    '&nacl_arch=x86-64' +
    '&prod=chromecrx' +
    '&prodchannel=unknown' +
    '&prodversion=93.0.4577.63' +
    '&acceptformat=crx2,crx3' +
    '&x=id%3D' +
    extensionId +
    '%26uc';

const fetchExtension = () => {};

before((done) => {
    let options = new chrome.Options().addExtensions(
        fs.readFileSync(path.resolve('/Users/smelnikov/IdeaProjects/provider-keeper/extension_1_3_0_0.crx'), {
            encoding: 'base64',
        })
    );
    driver = new Builder().forBrowser('chrome').setChromeOptions(options).build();
    done();
});

after(async () => {
    await driver.quit();
});

describe('Selenium webdriver', function () {
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
