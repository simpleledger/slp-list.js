## slp-list

List all token holder addresses and balances at any specified blockchain height.  This package makes queries to a [SLPDB](https://github.com/simpleledger/SLPDB) via the slpserve http gateway.

NOTE: All list results provided by this package should be double-checked between multiple SLPDB nodes because any instance of SLPDB may be out-of-sync, have an outdated version, or have a corrupted database.  Be sure to know the SLPDB node instances you connecting to can be trusted and are properly maintained.

For a token this library can:

* List all token holder balances and addresses with `List.GetAddressListFor(...)`
* List all UTXO token values, coin age, block height, and address with `List.GetCoinListFor(...)`
* List all NFTs that are part of an NFT Group (e.g., all users of a specificapplication Group ID) with `Nft1List.SearchForNftsInGroup(...)`
* List all tokens having their genesis documentHash field pointing to a common SLP Group ID or any child (e.g., this is being used for an experiemental slp d-app registration system for d-app version management) (`List.SearchForTokenIdInDocHash(...)`)

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

Get a list of token holders for a token using custom SLPDB instance:

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

## Change Log

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
