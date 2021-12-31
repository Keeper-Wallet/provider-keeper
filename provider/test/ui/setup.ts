import { By, until, WebDriver } from 'selenium-webdriver';
import { get } from 'https';

export async function fetchExtension(id: string): Promise<string> {
  const url =
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
    id +
    '%26uc';

  return new Promise<string>((resolve, reject) => {
    let body = '';

    get(url, response => {
      if (response.statusCode === 302) {
        get(response.headers.location!, response => {
          response.setEncoding('base64');
          response
            .on('data', chunk => {
              body += chunk;
            })
            .on('end', () => {
              resolve(body);
            })
            .on('error', err => {
              reject(err);
            });
        });
      }
    });
  });
}

type Accounts = { default: string; smart: string; rich: string };

export async function setupWavesKeeperAccounts(
  extension: string,
  driver: WebDriver,
  accounts: Accounts
) {
  const jsClick = el => {
    el.click();
  };
  const timeout = 10 * 1000;
  await driver.get(`chrome-extension://${extension}/popup.html`);
  // get started page
  let submitBtn = await driver.wait(
    until.elementLocated(By.css('.app button[type=submit]')),
    timeout
  );
  await submitBtn.click();
  // new account page
  const password = 'very-strong-password';
  const firstPasswordInput = await driver.wait(
    until.elementLocated(By.css('.app input#first[type=password]')),
    timeout
  );
  await firstPasswordInput.sendKeys(password);
  const secondPasswordInput = await driver.findElement(
    By.css('.app input#second[type=password]')
  );
  await secondPasswordInput.sendKeys(password);
  const termsCheckbox = await driver.findElement(
    By.css('.app input#termsAccepted[type=checkbox]')
  );
  await termsCheckbox.click();
  const conditionsCheckbox = await driver.findElement(
    By.css('.app input#conditionsAccepted[type=checkbox]')
  );
  await conditionsCheckbox.click();
  submitBtn = await driver.findElement(By.css('.app button[type=submit]'));
  await submitBtn.click();
  // new account create page
  // - change network to testnet
  const networkMenu = await driver.wait(
    until.elementLocated(
      By.xpath("//div[span[contains(@class, 'network-networkBottom')]]")
    ),
    timeout
  );
  await driver.executeScript(jsClick, networkMenu);
  const networkItemTestnet = await driver.wait(
    until.elementLocated(
      By.xpath(
        "//div[contains(text(), 'Testnet') and contains(@class, 'network-choose')]"
      )
    ),
    timeout
  );
  await driver.executeScript(jsClick, networkItemTestnet);
  // - import account page
  let importAccountBtn = await driver.wait(
    until.elementLocated(By.css('.app button[type=transparent]')),
    timeout
  );
  await importAccountBtn.click();
  // -- set seed page
  let seedTextarea = await driver.wait(
    until.elementLocated(By.css('.app form textarea')),
    timeout
  );
  await seedTextarea.sendKeys(accounts.default);
  submitBtn = await driver.findElement(By.css('.app button[type=submit]'));
  await submitBtn.click();
  // -- set name page
  let accountNameInput = await driver.wait(
    until.elementLocated(By.css('.app form input')),
    timeout
  );
  await accountNameInput.sendKeys('default');
  submitBtn = await driver.findElement(By.css('.app button[type=submit]'));
  await submitBtn.click();
  // home page
  // - import another account
  const addAccountBtn = await driver.wait(
    until.elementLocated(By.css('.app .wallets-list div.border-dashed')),
    timeout
  );
  await driver.executeScript(jsClick, addAccountBtn);
  importAccountBtn = await driver.wait(
    until.elementLocated(By.css('.app button[type=transparent]')),
    timeout
  );
  await importAccountBtn.click();
  // -- set seed page
  seedTextarea = await driver.wait(
    until.elementLocated(By.css('.app form textarea')),
    timeout
  );
  await seedTextarea.sendKeys(accounts.smart);
  submitBtn = await driver.findElement(By.css('.app button[type=submit]'));
  await submitBtn.click();
  // -- set name page
  accountNameInput = await driver.wait(
    until.elementLocated(By.css('.app form input')),
    timeout
  );
  await accountNameInput.sendKeys('smart');
  submitBtn = await driver.findElement(By.css('.app button[type=submit]'));
  await submitBtn.click();
}
