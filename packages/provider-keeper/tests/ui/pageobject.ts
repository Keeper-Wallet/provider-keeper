import { WebElement, until, By } from 'selenium-webdriver';

abstract class BasePage {
    timeout: number = 10000; // ms
    timeoutMsg: string = 'Timeout';
    pollTimeout: number = 200; // ms
    driver; // WebDriver, non-typed cause @types/selenium-webdriver out dated

    constructor(driver) {
        this.driver = driver;
    }

    abstract isReady(timeoutMsg?: string): Promise<boolean>;

    waitElement = (
        selector: By,
        timeout: number = this.timeout,
        pollTimeout: number = this.pollTimeout
    ): Promise<WebElement> => {
        return this.driver.wait(until.elementLocated(selector), timeout, this.timeoutMsg, pollTimeout);
    };

    findElement = (selector: By): Promise<WebElement> => {
        return this.waitElement(selector);
    };

    clickElement = async (element: WebElement): Promise<void> => {
        // virtual click if element is not interactable
        try {
            await element.click();
        } catch (err) {
            if (err.name === 'ElementNotInteractableError') {
                await this.driver.executeScript((el: WebElement) => {
                    el.click();
                }, element);
            }
        }
    };
}

class SubmitPage extends BasePage {
    cssBtn: By = By.css('.app button[type=submit]');

    isReady = async (): Promise<boolean> => {
        let btn = await this.waitElement(this.cssBtn);

        return Promise.resolve(await btn.isDisplayed());
    };

    getSubmitBtn = async (): Promise<WebElement> => {
        return this.findElement(this.cssBtn);
    };

    submit = async (): Promise<void> => {
        let btn = await this.getSubmitBtn();
        await btn.click();
    };
}

export class GetStartedPage extends SubmitPage {
    timeoutMsg = 'GetStartedPage timeout';
}

export class NewAccountPage extends SubmitPage {
    timeoutMsg = 'NewAccountPage timeout';

    cssPwd1 = By.css('.app input#first[type=password]');
    cssPwd2 = By.css('.app input#second[type=password]');
    cssTerms = By.css('.app input#termsAccepted[type=checkbox]');
    cssConditions = By.css('.app input#conditionsAccepted[type=checkbox]');

    getFirstPasswordInput = async (): Promise<WebElement> => {
        return this.findElement(this.cssPwd1);
    };
    getSecondPasswordInput = async (): Promise<WebElement> => {
        return this.findElement(this.cssPwd2);
    };
    getTermsCheckbox = async (): Promise<WebElement> => {
        return this.findElement(this.cssTerms);
    };
    getConditionsCheckbox = async (): Promise<WebElement> => {
        return this.findElement(this.cssConditions);
    };

    setPassword = async (value: string): Promise<void> => {
        const pwd2 = await this.getSecondPasswordInput();
        const pwd1 = await this.getFirstPasswordInput();

        await pwd1.sendKeys(value);
        await pwd2.sendKeys(value);
    };

    toggleTerms = async (): Promise<void> => {
        const terms = await this.getTermsCheckbox();
        await terms.click();
    };

    toggleConditions = async (): Promise<void> => {
        const conditions = await this.getConditionsCheckbox();
        await conditions.click();
    };
}

export class NewAccountCreatePage extends SubmitPage {
    timeoutMsg = 'NewAccountCreatePage timeout';

    cssImport = By.css('.app button[type=transparent]');
    cssNetworkDiv = By.xpath("//div[span[contains(@class, 'network-networkBottom')]]");
    cssCustomNetwork = By.xpath("//div[contains(text(), 'Custom') and contains(@class, 'network-choose')]");

    cssModalSubmit = By.css('#app-modal button[type=submit]');
    cssModalNodeUrl = By.css('#app-modal input#node_address');

    getImportBtn = async (): Promise<WebElement> => {
        return this.findElement(this.cssImport);
    };

    getNetworkIcon = async (): Promise<WebElement> => {
        return this.findElement(this.cssNetworkDiv);
    };

    getCustomNetwork = async (): Promise<WebElement> => {
        return this.findElement(this.cssCustomNetwork);
    };

    getModalSubmit = async (): Promise<WebElement> => {
        return this.findElement(this.cssModalSubmit);
    };

    getModalNodeUrlInput = async (): Promise<WebElement> => {
        return this.findElement(this.cssModalNodeUrl);
    };

    setCustomNetwork = async (nodeUrl: string): Promise<void> => {
        const icon = await this.getNetworkIcon();
        await this.clickElement(icon);
        const customNetwork = await this.getCustomNetwork();
        await this.clickElement(customNetwork);

        if (await this.isReady()) {
            const input = await this.getModalNodeUrlInput();
            await input.sendKeys(nodeUrl);
            const submit = await this.getModalSubmit();
            await submit.click();
        }
    };

    goToImport = async (): Promise<void> => {
        const btnImport = await this.getImportBtn();
        await btnImport.click();
    };

    importAccount = async (name: string, seed: string): Promise<void> => {
        if (await this.isReady()) {
            await this.goToImport();
        }

        const seedPage = new ImportSeedPage(this.driver);
        if (await seedPage.isReady()) {
            await seedPage.setSeed(seed);
            await seedPage.submit();
        }

        const accountName = new NewAccountNamePage(this.driver);
        if (await accountName.isReady()) {
            await accountName.setName(name);
            await accountName.submit();
        }
    };
}

export class ImportSeedPage extends SubmitPage {
    timeoutMsg = 'ImportSeedPage timeout';

    cssSeed = By.css('.app form textarea');

    getSeedTextarea = async (): Promise<WebElement> => {
        return this.findElement(this.cssSeed);
    };

    setSeed = async (value: string): Promise<void> => {
        const textarea = await this.getSeedTextarea();
        await textarea.sendKeys(value);
    };
}

export class NewAccountNamePage extends SubmitPage {
    timeoutMsg = 'NewAccountNamePage timeout';

    cssName = By.css('.app form input');

    getNameInput = async (): Promise<WebElement> => {
        return this.findElement(this.cssName);
    };

    setName = async (value: string): Promise<void> => {
        const input = await this.getNameInput();
        await input.sendKeys(value);
    };
}

export class HomePage extends BasePage {
    timeoutMsg = 'HomePage timeout';

    cssAddAccount = By.css('.app .wallets-list div.border-dashed');

    isReady = async (): Promise<boolean> => {
        let div = await this.waitElement(this.cssAddAccount);

        return Promise.resolve(await div.isDisplayed());
    };

    getAddAccountDiv = async (): Promise<WebElement> => {
        return this.findElement(this.cssAddAccount);
    };

    goToAddAccount = async (): Promise<void> => {
        const div = await this.getAddAccountDiv();
        await div.click();
    };
}
