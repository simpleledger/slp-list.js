export * from './query';

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
