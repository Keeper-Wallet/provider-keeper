# ProviderKeeper

* [Overview](#overview)
* [Getting Started](#getting-started)

<a id="overview"></a>
## Overview

ProviderKeeper implements a Signature Provider for [Signer](https://github.com/wavesplatform/signer) protocol library. ProviderKeeper creates user account from SEED.

<a id="getting-started"></a>
## Getting Started

### 1. Library installation

To install Signer and ProviderKeeper libraries use

```bash
npm i @waves/signer @waves/provider-keeper
```

### 2. Library initialization

Add library initialization to your app.

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
   const provider = new ProviderKeeper(authData);
   signer.setProvider(provider);
   ```

* For Mainnet:

   ```js
   import { Signer } from '@waves/signer';
   import { ProviderKeeper } from '@waves/provider-keeper';

   const signer = new Signer();
   const authData = {
       data: 'server generated string',
   }
   const provider = new ProviderKeeper(authData);
   signer.setProvider(provider);
   ```

### 3. Basic example

Now your application is ready to work with Waves Platform. Let's test it by implementing basic functionality. For example, we could try to authenticate user and transfer funds.

```js
const user = await signer.login();
const [transfer] = await signer
  .transfer({
    amount: 1,
    recipient: 'alias:T:merry',
  })
  .sign();
```

For more information see [Signer documentation](https://github.com/wavesplatform/signer/blob/master/README.md).
