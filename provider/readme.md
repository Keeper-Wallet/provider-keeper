# ProviderKeeper

* [Overview](#overview)
* [Getting Started](#getting-started)

## Overview

ProviderKeeper implements a Signature Provider for [Signer](https://github.com/wavesplatform/signer) protocol library.

## Getting Started

### Library installation

To install Signer and ProviderKeeper libraries use

```bash
npm i @waves/signer @waves/provider-keeper
```

### Library initialization

Add library initialization to your app.

Please note, that the Keeper extension API may not be ready on the page yet, so you should execute the asynchronous `signer.setProvider(keeper)` using `await`.

* For Testnet:

   ```js
   import { Signer } from '@waves/signer';
   import { ProviderKeeper } from '@waves/provider-keeper';

   const signer = new Signer({
       // Specify URL of the node on Testnet
       NODE_URL: 'https://nodes-testnet.wavesnodes.com'
   });
   const authData = {
       data: 'server generated string',
   }
   const keeper = new ProviderKeeper(authData);
   await signer.setProvider(keeper);
   ```

* For Mainnet:

   ```js
   import { Signer } from '@waves/signer';
   import { ProviderKeeper } from '@waves/provider-keeper';

   const signer = new Signer();
   const authData = {
       data: 'server generated string',
   }
   const keeper = new ProviderKeeper(authData);
   await signer.setProvider(keeper);
   ```

### Basic example

Now your application is ready to work with Waves Platform. Let's test it by implementing basic functionality.

For example, we could try to authenticate user and transfer funds:
```js
const user = await signer.login();
const [transfer] = await signer
  .transfer({
      recipient: '3Myqjf1D44wR8Vko4Tr5CwSzRNo2Vg9S7u7',
      amount: 100000,  // equals to 0.001 WAVES
      assetId: null,   // equals to WAVES
  })
  .broadcast();
```

Or invoke some dApp:
```js
const [invoke] = await signer
  .invoke({
      dApp: '3Fb641A9hWy63K18KsBJwns64McmdEATgJd',
      fee: 1000000,
      payment: [{
          assetId: '73pu8pHFNpj9tmWuYjqnZ962tXzJvLGX86dxjZxGYhoK',
          amount: 7,
      }],
      call: {
          function: 'foo',
          args: [
              { type: 'integer', value: 1 },
              { type: 'binary', value: 'base64:AAA=' },
              { type: 'string', value: 'foo' }
          ],
      },
  })
  .broadcast();
```

For more examples see [Signer documentation](https://github.com/wavesplatform/signer/blob/master/README.md).

### How to build

```shell
npm ci
npm run build
```
