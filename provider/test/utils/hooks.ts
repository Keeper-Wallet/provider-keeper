import { Builder, By, until, WebDriver } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import * as net from 'net';
import * as mocha from 'mocha';
import * as path from 'path';
import { resolve } from 'path';
import {
  GenericContainer,
  Network,
  StartedNetwork,
  StartedTestContainer,
} from 'testcontainers';
import * as fs from 'fs';

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
  testApp: StartedTestContainer;
}

export async function mochaGlobalSetup(this: GlobalFixturesContext) {
  const rootDir = path.resolve(__dirname, '..', '..', '..');
  const wavesKeeperDir = path.resolve(rootDir, 'ext');
  if (
    !fs.existsSync(wavesKeeperDir) ||
    fs.readdirSync(wavesKeeperDir).length === 0
  ) {
    throw new Error(
      `
      You should build or download latest Waves Keeper for e2e tests.
      See more at .github/workflows/tests.yml
      `
    );
  }

  const local: StartedNetwork = await new Network().start();

  const exposedPorts = [4444, 5900];

  this.testApp = await (
    await GenericContainer.fromDockerfile(resolve(rootDir)).build()
  )
    .withNetworkMode(local.getName())
    .withNetworkAliases('test-app')
    .start();

  this.selenium = await new GenericContainer('selenium/standalone-chrome')
    .withBindMount(path.resolve(wavesKeeperDir), '/app/waves_keeper', 'ro')
    .withNetworkMode(local.getName())
    .withExposedPorts(...exposedPorts)
    .start();

  await Promise.all(
    exposedPorts.map(
      (port: number) =>
        new Promise((resolve, reject) => {
          net
            .createServer(from => {
              const to = net.createConnection({
                port: this.selenium.getMappedPort(port),
              });

              from.pipe(to);
              to.pipe(from);

              to.once('error', () => {
                from.destroy();
              });
            })
            .once('listening', resolve)
            .once('error', reject)
            .listen(port)
            .unref();
        })
    )
  );
}

export async function mochaGlobalTeardown(this: GlobalFixturesContext) {
  await this.selenium.stop();
  await this.testApp.stop();
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
          `--load-extension=/app/waves_keeper`,
          '--disable-dev-shm-usage'
        )
      )
      .build();

    // detect Waves Keeper extension URL
    await this.driver.get('chrome://system');
    for (const ext of (
      await this.driver
        .wait(until.elementLocated(By.css('div#extensions-value')))
        .getText()
    ).split('\n')) {
      const [id, name] = ext.split(' : ');
      if (name.toLowerCase() === 'Waves Keeper'.toLowerCase()) {
        this.extensionUrl = `chrome-extension://${id}/popup.html`;
        break;
      }
    }

    this.testAppUrl = 'http://test-app:8081';
  },

  afterAll(this: mocha.Context, done: mocha.Done) {
    this.driver && this.driver.quit();
    done();
  },
});
