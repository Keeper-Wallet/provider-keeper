/**
 * Basic actions for tests.
 *
 * NOTE: Each of them needs to bind `this` from test.
 */
import * as mocha from 'mocha';
import { By, until } from 'selenium-webdriver';
import { DEFAULT_PASSWORD } from './constants';

export const App = {
  initVault: async function (
    this: mocha.Context,
    password: string = DEFAULT_PASSWORD
  ) {
    await App.open.call(this);

    const tabKeeper = await this.driver.getWindowHandle();
    await this.driver.wait(
      async () => (await this.driver.getAllWindowHandles()).length === 2,
      this.wait
    );
    for (const handle of await this.driver.getAllWindowHandles()) {
      if (handle !== tabKeeper) {
        await this.driver.switchTo().window(handle);
        await this.driver.navigate().refresh();
        break;
      }
    }
    await this.driver
      .wait(
        until.elementIsVisible(
          await this.driver.wait(
            until.elementLocated(By.css('[data-testid="getStartedBtn"]')),
            this.wait
          )
        ),
        this.wait
      )
      .click();

    await this.driver.wait(
      until.elementLocated(By.css('[data-testid="newAccountForm"]')),
      this.wait
    );
    await this.driver
      .wait(
        until.elementLocated(By.css('.app input#first[type=password]')),
        this.wait
      )
      .sendKeys(password);
    await this.driver
      .findElement(By.css('.app input#second[type=password]'))
      .sendKeys(password);
    await this.driver
      .findElement(By.css('.app input#termsAccepted[type=checkbox]'))
      .click();
    await this.driver
      .findElement(By.css('.app input#conditionsAccepted[type=checkbox]'))
      .click();
    await this.driver
      .wait(
        until.elementIsEnabled(
          this.driver.findElement(By.css('.app button[type=submit]'))
        ),
        this.wait
      )
      .click();

    await this.driver.wait(
      until.elementLocated(By.css('[data-testid="importForm"]')),
      this.wait
    );

    await this.driver.close();
    await this.driver.switchTo().window(tabKeeper);
  },

  resetVault: async function (this: mocha.Context) {
    await App.open.call(this);

    await this.driver
      .wait(
        until.elementLocated(
          By.xpath("//div[contains(@class, 'menu-settingsIcon')]")
        ),
        this.wait
      )
      .click();

    await this.driver
      .wait(
        until.elementLocated(
          By.xpath("//div[contains(@class, 'settings-deleteAccounts')]")
        ),
        this.wait
      )
      .click();

    await this.driver
      .wait(until.elementLocated(By.css('button#deleteAccount')), this.wait)
      .click();
  },

  open: async function (this: mocha.Context) {
    await this.driver.get(this.extensionUrl);
    await this.driver.wait(
      until.elementIsVisible(
        this.driver.wait(until.elementLocated(By.css('.app')), this.wait)
      ),
      this.wait
    );
  },
};

export const CreateNewAccount = {
  importAccount: async function (
    this: mocha.Context,
    name: string,
    seed: string
  ) {
    await this.driver
      .wait(
        until.elementIsVisible(
          await this.driver.wait(
            until.elementLocated(By.css('[data-testid="importSeed"]')),
            this.wait
          )
        ),
        this.wait
      )
      .click();

    await this.driver
      .wait(
        until.elementLocated(By.css('[data-testid="seedInput"]')),
        this.wait
      )
      .sendKeys(seed);
    await this.driver
      .wait(
        until.elementIsEnabled(
          this.driver.findElement(By.css('[data-testid="continueBtn"]'))
        ),
        this.wait
      )
      .click();

    await this.driver
      .wait(
        until.elementLocated(By.css('[data-testid="newAccountNameInput"]')),
        this.wait
      )
      .sendKeys(name);
    await this.driver
      .wait(
        until.elementIsEnabled(
          this.driver.findElement(By.css('[data-testid="continueBtn"]'))
        ),
        this.wait
      )
      .click();

    await this.driver
      .wait(
        until.elementLocated(By.css('[data-testid="importSuccessForm"]')),
        this.wait
      )
      .findElement(By.css('[data-testid="addAnotherAccountBtn"]'))
      .click();

    await this.driver.wait(
      until.elementLocated(By.css('[data-testid="importForm"]')),
      this.wait
    );
  },
};

export const Settings = {
  rootSettings: async function (this: mocha.Context) {
    await this.driver
      .wait(
        until.elementLocated(
          By.xpath("//div[contains(@class, 'menu-settingsIcon')]")
        ),
        this.wait
      )
      .click();
  },
  generalSettings: async function (this: mocha.Context) {
    await Settings.rootSettings.call(this);
    await this.driver
      .wait(until.elementLocated(By.css('button#settingsGeneral')), this.wait)
      .click();
  },

  setSessionTimeout: async function (this: mocha.Context, index: number) {
    // refresh timeout by focus window
    await this.driver.executeScript(() => {
      window.focus();
    });

    await Settings.generalSettings.call(this);

    await this.driver
      .wait(
        until.elementLocated(
          By.xpath("//div[contains(@class, 'Select-module-trigger')]")
        ),
        this.wait
      )
      .click();
    const position = index === -1 ? 'last()' : `position()=${index}`;

    await this.driver
      .wait(
        until.elementLocated(
          By.xpath(`//div[contains(@class, 'Select-module-item')][${position}]`)
        ),
        this.wait
      )
      .click();
  },

  setMaxSessionTimeout: async function (this: mocha.Context) {
    const LAST = -1;
    await Settings.setSessionTimeout.call(this, LAST);
  },
};

export const Network = {
  switchTo: async function (
    this: mocha.Context,
    network: 'Mainnet' | 'Stagenet' | 'Testnet' | 'Custom',
    nodeUrl?: string
  ) {
    await this.driver
      .wait(
        until.elementIsVisible(
          this.driver.wait(
            until.elementLocated(
              By.xpath("//i[contains(@class, 'network-networkIcon')]")
            ),
            this.wait
          )
        ),
        this.wait
      )
      .click();

    await this.driver
      .wait(
        until.elementIsVisible(
          this.driver.wait(
            until.elementLocated(
              By.xpath(
                `//div[contains(@class, 'network-chooseNetwork')][text()='${network}']` +
                  "//i[contains(@class, 'network-networkIcon')]"
              )
            ),
            this.wait
          )
        )
      )
      .click();

    if (network === 'Custom') {
      const customNetworkSettings = this.driver.wait(
        until.elementIsVisible(
          this.driver.wait(
            until.elementLocated(By.css('div#customNetwork')),
            this.wait
          )
        ),
        this.wait
      );

      if (nodeUrl) {
        customNetworkSettings
          .findElement(By.css('input#node_address'))
          .sendKeys(nodeUrl);
      }

      await customNetworkSettings
        .findElement(By.css('button#networkSettingsSave'))
        .click();
    }

    await this.driver.wait(
      until.elementLocated(By.xpath("//div[contains(@class, 'intro-intro')]")),
      this.wait
    );

    await this.driver.wait(
      until.elementLocated(
        By.xpath(
          `//span[contains(@class, 'network-networkBottom')][text()='${network}']`
        )
      ),
      this.wait
    );
  },
};
