## slp-list

This package includes simple queries to SLPDB to list token addresses and balances for any previous blockchain height.

This library can:

* List balances for all token holder addressees
* List individual UTXO coin values, coin age, block height, and address

Applications can use this information to:

* Distribute Bitcoin Cash rewards to token holders pro-rata
* Airdrop existing token holders with new SLP tokens pro-rata
* Build a token staking rewards systems using coin age

Users should double-check the results since SLPDB may be out of sync or corrupted.

### CLI Demo

This demo allows the user to print SLP lists to the console. User can then copy/paste list result into Electron Cash to distribute BCH rewards.

![demo image](./demo.png)


#### Get Started
```
$ git clone https://github.com/simpleledger/slp-list.git
$ cd slp-list
$ npm i
$ npm start
```

## Install using npm

`npm i slp-list`

## Install in browser

```<script src='https://unpkg.com/slp-list'></script>```

## Change Log

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
