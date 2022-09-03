import { Builder, By, until, WebDriver } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import * as mocha from 'mocha';
import * as path from 'path';
import * as httpServer from 'http-server';
import {
  GenericContainer,
  StartedTestContainer,
  TestContainers,
} from 'testcontainers';
import * as fs from 'fs';
import * as packageJson from '../../package.json';

declare module 'mocha' {
  interface Context {
    driver: WebDriver;
    extensionUrl: string;
    testAppUrl: string;
    wait: number;
  }
}

interface GlobalFixturesContext {
  selenium: StartedTestContainer;
  testApp: httpServer.HttpServer;
}

export async function mochaGlobalSetup(this: GlobalFixturesContext) {
  const rootDir = path.resolve(__dirname, '..', '..');
  const keeperWalletDir = path.resolve(rootDir, 'keeper-wallet');

  if (!fs.existsSync(path.resolve(keeperWalletDir, 'manifest.json'))) {
    throw new Error(
      `
      You should build or download latest Keeper Wallet for e2e tests.
      See more at .github/workflows/tests.yml
      `
    );
  }

  if (!fs.existsSync(path.resolve(rootDir, packageJson.unpkg))) {
    throw new Error(
      `
      You should build provider first.
      See more at .github/workflows/tests.yml
      `
    );
  }

  this.testApp = httpServer.createServer({ root: rootDir });
  this.testApp.listen(8081);

  await TestContainers.exposeHostPorts(8081);

  this.selenium = await new GenericContainer('selenium/standalone-chrome')
    .withBindMount(path.resolve(keeperWalletDir), '/app/keeper-wallet', 'ro')
    .withExposedPorts(
      {
        container: 4444,
        host: 4444,
      },
      {
        container: 5900,
        host: 5900,
      }
    )
    .start();
}

export async function mochaGlobalTeardown(this: GlobalFixturesContext) {
  await this.selenium.stop();
  this.testApp.close();
}

export const mochaHooks = () => ({
  async beforeAll(this: mocha.Context) {
    this.timeout(15 * 60 * 1000);
    this.wait = 10 * 1000;

    this.driver = new Builder()
      .forBrowser('chrome')
      .usingServer(`http://localhost:4444/wd/hub`)
      .setChromeOptions(
        new chrome.Options().addArguments(
          `--load-extension=/app/keeper-wallet`,
          '--disable-dev-shm-usage'
        )
      )
      .build();

    // detect Keeper Wallet extension URL
    await this.driver.get('chrome://system');
    for (const ext of (
      await this.driver
        .wait(until.elementLocated(By.css('div#extensions-value')))
        .getText()
    ).split('\n')) {
      const [id, name] = ext.split(' : ');
      if (name.toLowerCase() === 'Keeper Wallet'.toLowerCase()) {
        this.extensionUrl = `chrome-extension://${id}/popup.html`;
        break;
      }
    }

    this.testAppUrl = 'http://host.testcontainers.internal:8081';
  },

  afterAll(this: mocha.Context, done: mocha.Done) {
    this.driver && this.driver.quit();
    done();
  },
});
