## slp-list

List all token holder addresses and balances at any specified blockchain height.  This package makes queries to a [SLPDB](https://github.com/simpleledger/SLPDB) via the slpserve http gateway.

NOTE: All list results provided by this package should be double-checked between multiple SLPDB nodes because any instance of SLPDB may be out-of-sync, have an outdated version, or have a corrupted database.  Be sure to know the SLPDB node instances you connecting to can be trusted and are properly maintained.

For a token this library can:

* [List all token holder balances and addresses](#list-of-token-holders)
* [List all token UTXO values](#list-of-coins)
* [List all NFT token holders](#list-all-holders-of-an-nft-in-an-nft1-group)
* [List tokens linked to a specific Token Document Hash](#list-linked-tokens)
* [List all NFTs that were ever part of an NFT Group](#list-all-nfts-in-an-nft1-group-not-only-the-current-holders)

Applications can use this information to:

* Distribute Bitcoin Cash rewards to token holders, pro rata
* Airdrop existing token holders with new SLP tokens, pro rata
* Build a token staking rewards systems using coin age
* Public key and user coordination in decentralized applications

By default this package connects to a public SLPDB node, but this can be overridden using `Config.SetUrl("__")`.



### Demo App

This demo app allows the user to print SLP lists to the console. User can then copy/paste list result into Electron Cash to distribute BCH rewards.

![demo image](./demo.png)


#### Run the demo CLI application
```
$ git clone https://github.com/simpleledger/slp-list.git
$ cd slp-list
$ npm i
$ npm start
```



## Install 

#### node.js

`npm i slp-list`

#### browser

```<script src='https://unpkg.com/slp-list'></script>```



## Example Usage

### List of token holders

Get a list of token holder addresses and balances for a token using custom SLPDB instance:

```ts
let slplist = require("slp-list");
slplist.Config.SetUrl("https://slpdb.fountainhead.cash");
const blockCutoff = 620971;
let list;

(async () => {
    list = await slplist.List.GetAddressListFor(
        "c4b0d62156b3fa5c8f3436079b5394f7edc1bef5dc1cd2f9d0c4d46f82cca479",
        blockCutoff,
        true
    );
    console.log(list);
})();

//  result:
// 
//  'simpleledger:qqwap3lfel8wevd4rk5w2hkjs35kxc82fyvalykv09' => '7',
//   'simpleledger:qpcgmrsal20mf8hvdqhja0w2m9s3q026l5gjqxd8v5' => '1',
//   'simpleledger:qz5wajf8f0mkpl4n5mmsfv3am3qfq6wdxu504vaajf' => '2',
//   'simpleledger:qrmvmvqqll53v8k4x5e64t0wdnwf4asp6uxx35vhag' => '1',
//   'simpleledger:qpuh688c60gfqe5agwrfztyaype4h69lnqu86n6c72' => '1',
//   'simpleledger:qqlrnm8pcc9jqkkq2glhp22tnjzzxpkv3cqvdts0tf' => '1',
//   'simpleledger:qzn02dvpz6js49ykrtjr6jeyvlyk0j4s0gl08f2prd' => '9',
//   'simpleledger:qrwnnkfc0z7er0vjw6wnf4m56agewjlj05s4wqzrqj' => '0.8'
//   ...
```

### List of coins

List the individual UTXOs, coin age, etc for a specified token ID:

```ts
let slplist = require("slp-list");
slplist.Config.SetUrl("https://slpdb.fountainhead.cash");
const blockCutoff = 620971;
let list;

(async () => {
    list = await slplist.List.GetCoinListFor(
        "c4b0d62156b3fa5c8f3436079b5394f7edc1bef5dc1cd2f9d0c4d46f82cca479",
        blockCutoff
    );
    console.log(list);
})();

//  result:
// [
//   {
//     txid: 'bc866db744b680c359b7a54b873473e8905805cb65838c616f963455d2de9288',
//     blk: 596025,
//     slpAmount: '10',
//     address: 'simpleledger:qrgnm2varn9ccvsswmk860u85qpz8m9lgukgmqzd0r',
//     vout: 1,
//     coinAge: 24946
//   },
//   {
//     txid: 'bc866db744b680c359b7a54b873473e8905805cb65838c616f963455d2de9288',
//     blk: 596025,
//     slpAmount: '10',
//     address: 'simpleledger:qpruj6ylx84k56xqfu4vtsrkrx09n5v4vgtah0aqgz',
//     vout: 2,
//     coinAge: 24946
//   },
//   ... more items not shown
// ]
```

### List all holders of an NFT in an NFT1 Group

List the NFT holders for a specific NFT1 Group:

```ts
let slplist = require("slp-list");
slplist.Config.SetUrl("https://nyc1.slpdb.io");
let list;

(async () => {
    list = await slplist.Nft1List.GetConfirmedNftTokenHolders(
        "33e02bc67d71dab03d10a0f46050f7bfb8d8c3363a5b5bca622bcd837ca3feb8"
    );
    console.log(list);
})();

//  result:
//  Map {
//   '44f339784c8afc2d26ac821ab68394dfceed803a3b987df6abe5de5a81664b33' => 'simpleledger:qqzjzzlmx8h3hum3drsuk894jnf8r909ku4lankkg5'
// }
//  
//   ...
```

### List linked tokens

List all tokens with a Genesis pointing to a specific Document Hash:

```ts
let slplist = require("slp-list");
slplist.Config.SetUrl("https://slpdb.fountainhead.cash");
let list;

(async () => {
    list = await slplist.List.SearchForTokenIdInDocHash(
        "94dbe7179abd236cfb0fc5aaef86aad92214053f6de2885872dd85235cfa9f67",
    );
    console.log(list);
})();

//  result:
// [ 
//   {
//     stats: { block_created: 633158, approx_txns_since_genesis: 1 },
//     token: {
//       decimals: 0,
//       tokenIdHex: '4b7d2757d155520e0c6a9653a9750d9b574bd9779e9cb106b9d7c1ac22226260',
//       timestamp: '2020-05-01 03:41:12',
//       timestamp_unix: 1588304472,
//       transactionType: 'GENESIS',
//       versionType: 129,
//       documentUri: 'http://ipfs.pics/ipfs/Qmep61aZqJhhmSkhQHUSUme5RFbi8ZfccxXC1TyjKHcEig',
//       documentSha256Hex: '94dbe7179abd236cfb0fc5aaef86aad92214053f6de2885872dd85235cfa9f67',
//       symbol: 'slp.network',
//       name: 'SLP Sage Chat Group',
//       batonVout: 2,
//       containsBaton: true,
//       genesisOrMintQuantity: '100',
//       sendOutputs: null
//     }
//   }
// ]
```

### List all NFTs in an NFT1 Group (not only the current holders)

List all NFTs created for this specific NFT1 Group:

```ts
let slplist = require("slp-list");
slplist.Config.SetUrl("https://slpdb.fountainhead.cash");
let list;

(async () => {
    list = await slplist.Nft1List.SearchForNftsInGroup(
        "9ce9ebb34a1efcbe1649dc6cc9e62a2b2c2c4fb0947d7ea6412adefbc725829c"
    );
    console.log(list);
})();

//  result:
//  [
//   {
//     stats: { block_created: 626896, approx_txns_since_genesis: 1 },
//     token: {
//       decimals: 0,
//       tokenIdHex: 'c67c6423767a86e27c56ad9c04581f4500d88baff12b865611a39602f449b465',
//       timestamp: '2020-03-18 01:51:35',
//       timestamp_unix: 1584496295,
//       transactionType: 'GENESIS',
//       versionType: 65,
//       documentUri: '',
//       documentSha256Hex: null,
//       symbol: '',
//       name: '',
//       batonVout: null,
//       containsBaton: false,
//       genesisOrMintQuantity: '1',
//       sendOutputs: null
//     }
//   },
//
//  ]
//
```



## Change Log

### 1.1.0
- Added nft method "GetConfirmedNftTokenHolders"
- Slightly modified options for "SearchForNftsInGroup"

### 1.0.0
- (breaking change) Complete refactoring of all methods
- (breaking change) Added static Config class for setting SLPDB URL
- Complete unit test coverage

### 0.1.0
- Removed support for unconfirmed transactions
- Don't publish .ts files to npm

### 0.0.8
- Allow mempool slp list queries, use block height = -1

### 0.0.7
- Include Genesis balance in query.ts
- Removed BigNumber.js dependency from demo.ts in favor of Big.js 
- NOTE: All number rounding in demo uses default of ROUND_HALF_UP

### 0.0.6
- Updated gRPC deps and utilized the new getMedianTime() method

### 0.0.5
- Switched to big.js from bignumber.js in deps (demo.ts still uses BigNumber.js)
- Added MTP block selection option in demo.ts
- Other minor updates
