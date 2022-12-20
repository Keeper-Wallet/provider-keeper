# ProviderKeeper

[![npm](https://img.shields.io/npm/v/@waves/provider-keeper?color=blue&label=%40waves%2Fprovider-keeper&logo=npm)](https://www.npmjs.com/package/@waves/provider-keeper)
[![""](https://badgen.net/bundlephobia/min/@waves/provider-keeper)](https://bundlephobia.com/package/@waves/provider-keeper)
[![""](https://badgen.net/bundlephobia/minzip/@waves/provider-keeper)](https://bundlephobia.com/package/@waves/provider-keeper)
[![""](https://badgen.net/bundlephobia/dependency-count/@waves/provider-keeper)](https://bundlephobia.com/package/@waves/provider-keeper)
[![""](https://badgen.net/bundlephobia/tree-shaking/@waves/provider-keeper)](https://bundlephobia.com/package/@waves/provider-keeper)

- [Overview](#overview)
- [Getting Started](#getting-started)

## Overview

ProviderKeeper implements a Signature Provider for [Signer](https://github.com/wavesplatform/signer) protocol library.

## Getting Started

### Library installation

Install using npm:

```sh
npm install @waves/signer @waves/provider-keeper
```

or yarn

```sh
yarn add @waves/signer @waves/provider-keeper
```

### Library initialization

Add library initialization to your app.

- For Testnet:

  ```js
  import { Signer } from '@waves/signer';
  import { ProviderKeeper } from '@waves/provider-keeper';

  const signer = new Signer({
    // Specify URL of the node on Testnet
    NODE_URL: 'https://nodes-testnet.wavesnodes.com',
  });
  const keeper = new ProviderKeeper();
  signer.setProvider(keeper);
  ```

- For Mainnet:

  ```js
  import { Signer } from '@waves/signer';
  import { ProviderKeeper } from '@waves/provider-keeper';

  const signer = new Signer();
  const keeper = new ProviderKeeper();
  signer.setProvider(keeper);
  ```

You can also check if the Keeper Wallet is installed.

```js
import { isKeeperInstalled } from '@waves/provider-keeper';

const isInstalled = await isKeeperInstalled();

if (!isInstalled) {
  // Some logic in case KeeperWallet is not installed
}
```

### Basic example

Now your application is ready to work with Waves Platform. Let's test it by implementing basic functionality.

For example, we could try to authenticate user and transfer funds:

```js
const user = await signer.login();
const [transfer] = await signer
  .transfer({
    recipient: '3Myqjf1D44wR8Vko4Tr5CwSzRNo2Vg9S7u7',
    amount: 100000, // equals to 0.001 WAVES
    assetId: null, // equals to WAVES
  })
  .broadcast();
```

Or invoke some dApp:

```js
const [invoke] = await signer
  .invoke({
    dApp: '3Fb641A9hWy63K18KsBJwns64McmdEATgJd',
    fee: 1000000,
    payment: [
      {
        assetId: '73pu8pHFNpj9tmWuYjqnZ962tXzJvLGX86dxjZxGYhoK',
        amount: 7,
      },
    ],
    call: {
      function: 'foo',
      args: [
        { type: 'integer', value: 1 },
        { type: 'binary', value: 'base64:AAA=' },
        { type: 'string', value: 'foo' },
      ],
    },
  })
  .broadcast();
```

For more examples see [Signer documentation](https://github.com/wavesplatform/signer/blob/master/README.md).
