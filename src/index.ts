export * from "./list";
export * from "./nft1";
export * from "./config";

export interface TxoResponse {
    txid: string;
    slpAmount: string;
    address: string;
    vout: number;
    blk: number;
    coinAge?: number;
    spendTxid?: string;
    spentAtBlock?: number;
}

export interface GenesisInfo {
    token: {
        decimals: number;
        tokenIdHex: string;
        timestamp: string;
        timestamp_unix: number;
        transactionType: string;
        versionType: number;
        documentUri: string;
        documentSha256Hex: string|null;
        symbol: string;
        name: string;
        batonVout: number|null;
        containsBaton: boolean;
        genesisOrMintQuantity: string;
        //sendOutputs: null;
    },
    stats: {
        block_created: number;
        approx_txns_since_genesis: number;
    },
}