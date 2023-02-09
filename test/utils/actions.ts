/**
 * Basic actions for tests.
 *
 * NOTE: Each of them needs to bind `this` from test.
 */
import { expect } from 'chai';
import type * as mocha from 'mocha';
import { By, until } from 'selenium-webdriver';

import { DEFAULT_PASSWORD } from './constants';

export const App = {
  async initVault(this: mocha.Context, password: string = DEFAULT_PASSWORD) {
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
      .wait(until.elementLocated(By.css('#first')), this.wait)
      .sendKeys(password);
    await this.driver.findElement(By.css('#second')).sendKeys(password);
    await this.driver.findElement(By.css('#termsAccepted')).click();
    await this.driver.findElement(By.css('#conditionsAccepted')).click();
    await this.driver
      .wait(
        until.elementIsEnabled(
          this.driver.findElement(By.css('button[type=submit]'))
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

  async resetVault(this: mocha.Context) {
    await App.open.call(this);

    await this.driver
      .wait(
        until.elementLocated(
          By.xpath("//div[contains(@class, 'settingsIcon@menu')]")
        ),
        this.wait
      )
      .click();

    await this.driver
      .wait(
        until.elementLocated(
          By.xpath("//div[contains(@class, 'deleteAccounts@settings')]")
        ),
        this.wait
      )
      .click();

    await this.driver
      .wait(until.elementLocated(By.css('button#deleteAccount')), this.wait)
      .click();
  },

  async open(this: mocha.Context) {
    await this.driver.get(this.extensionUrl);
  },
};

export const Accounts = {
  async importAccount(this: mocha.Context, name: string, seed: string) {
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

  async changeActiveAccount(this: mocha.Context, accountName: string) {
    await this.driver
      .wait(
        until.elementLocated(By.css('[data-testid="otherAccountsButton"]')),
        this.wait
      )
      .click();

    await this.driver
      .wait(
        until.elementIsVisible(
          this.driver.wait(
            until.elementLocated(By.css('[data-testid="accountsSearchInput"]')),
            this.wait
          )
        ),
        this.wait
      )
      .sendKeys(accountName);

    await this.driver
      .wait(
        until.elementLocated(By.css('[data-testid="accountCard"]')),
        this.wait
      )
      .click();

    expect(
      await this.driver
        .wait(
          until.elementLocated(
            By.css(
              '[data-testid="activeAccountCard"] [data-testid="accountName"]'
            )
          ),
          this.wait,
          'Could not get active account name'
        )
        .getText()
    ).to.equal(accountName);
  },
};

export const Settings = {
  async rootSettings(this: mocha.Context) {
    await this.driver
      .wait(
        until.elementLocated(
          By.xpath("//div[contains(@class, 'settingsIcon@menu')]")
        ),
        this.wait
      )
      .click();
  },
  async generalSettings(this: mocha.Context) {
    await Settings.rootSettings.call(this);
    await this.driver
      .wait(until.elementLocated(By.css('button#settingsGeneral')), this.wait)
      .click();
  },

  async setSessionTimeout(this: mocha.Context, index: number) {
    // refresh timeout by focus window
    await this.driver.executeScript(() => {
      window.focus();
    });

    await Settings.generalSettings.call(this);

    await this.driver
      .wait(
        until.elementLocated(
          By.xpath("//div[contains(@class, 'trigger@Select-module')]")
        ),
        this.wait
      )
      .click();
    const position = index === -1 ? 'last()' : `position()=${index}`;

    await this.driver
      .wait(
        until.elementLocated(
          By.xpath(`//div[contains(@class, 'item@Select-module')][${position}]`)
        ),
        this.wait
      )
      .click();
  },

  async setMaxSessionTimeout(this: mocha.Context) {
    const LAST = -1;
    await Settings.setSessionTimeout.call(this, LAST);
  },
};

export const Network = {
  async switchTo(
    this: mocha.Context,
    network: 'Mainnet' | 'Stagenet' | 'Testnet' | 'Custom',
    nodeUrl?: string
  ) {
    await this.driver
      .wait(
        until.elementIsVisible(
          this.driver.wait(
            until.elementLocated(
              By.xpath("//i[contains(@class, 'networkIcon@network')]")
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
                `//div[contains(@class, 'chooseNetwork@network')][text()='${network}']` +
                  "//i[contains(@class, 'networkIcon@network')]"
              )
            ),
            this.wait
          )
        )
      )
      .click();

    if (network === 'Custom') {
      await this.driver.wait(
        until.elementIsVisible(
          this.driver.wait(
            until.elementLocated(By.css('div#customNetwork')),
            this.wait
          )
        ),
        this.wait
      );

      if (nodeUrl) {
        await this.driver
          .findElement(By.css('input#node_address'))
          .sendKeys(this.nodeUrl);
      }

      await this.driver
        .findElement(By.css('button#networkSettingsSave'))
        .click();
    }

    await this.driver.wait(
      until.elementLocated(
        By.xpath("//div[contains(@class, 'root@loadingScreen-module')]")
      ),
      this.wait
    );

    await this.driver.wait(
      until.elementLocated(
        By.xpath(
          `//span[contains(@class, 'networkBottom@network')][text()='${network}']`
        )
      ),
      this.wait
    );
  },
};

export const Windows = {
  async captureNewWindows(this: mocha.Context) {
    const prevHandlesSet = new Set(await this.driver.getAllWindowHandles());

    return {
      waitForNewWindows: async (count: number) => {
        let newHandles: string[] = [];

        await this.driver.wait(
          async () => {
            const handles = await this.driver.getAllWindowHandles();

            newHandles = handles.filter(handle => !prevHandlesSet.has(handle));

            return newHandles.length >= count;
          },
          this.wait,
          'waiting for new windows to appear'
        );

        return newHandles;
      },
    };
  },
  async waitForWindowToClose(this: mocha.Context, windowHandle: string) {
    await this.driver.wait(
      async () => {
        const handles = await this.driver.getAllWindowHandles();

        return !handles.includes(windowHandle);
      },
      this.wait,
      'waiting for window to close'
    );
  },
};
