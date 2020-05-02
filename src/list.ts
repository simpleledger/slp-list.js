import axios, { AxiosRequestConfig } from "axios";
import { Big } from "big.js";
import { GenesisInfo, TxoResponse } from ".";
import { Config } from "./config";

const MAX_QUERY_LIMIT = 10 ** 9;

export class List {

    public static async GetAddressListFor(tokenId: string, blockCutoff: number, displayValueAsString = false) {
        const coins = await this.GetCoinListFor(tokenId, blockCutoff);
        return await this.GetAddressList(coins, displayValueAsString);
    }

    public static async GetCoinListFor(tokenId: string, blockCutoff: number, coinAgeStartBlock = 0) {
        if (blockCutoff < coinAgeStartBlock) {
            throw Error("Value for 'blockCutoff' must be greater than coinAgeStartBlock.");
        }
        let txos: TxoResponse[] = [];
        const txos1 = await this.GetUnspentTxosCreatedBefore(blockCutoff, tokenId);
        const txos2 = await this.GetConfirmedTxosCreatedBeforeButSpentLaterThan(blockCutoff, tokenId);
        const txos3 = await this.GetMempoolTxosCreatedAtOrBefore(blockCutoff, tokenId);
        txos = txos.concat(...txos1).concat(...txos2).concat(...txos3);
        // const bestBlock = await this._getBestBlockHeight(Config.url);
        for (const txo of txos) {
            if (coinAgeStartBlock && txo.blk < coinAgeStartBlock) {
                txo.coinAge = blockCutoff - coinAgeStartBlock;
            } else {
                txo.coinAge = blockCutoff - txo.blk;
            }
        }
        return txos;
    }

    public static async GetAddressList(txos: TxoResponse[], displayValueAsString = false) {
        const balsMap = new Map<string, Big>();
        txos.forEach((txo: TxoResponse) => {
            if (balsMap.has(txo.address)) {
                balsMap.set(txo.address, balsMap.get(txo.address)!.plus(txo.slpAmount));
            } else {
                balsMap.set(txo.address, new Big(txo.slpAmount));
            }
        });
        if (displayValueAsString) {
            const balsStrMap = new Map<string, string>();
            balsMap.forEach((bal, key) => balsStrMap.set(key, bal.toFixed()));
            return balsStrMap;
        }
        return balsMap;
    }

    public static async GetUnspentTxosCreatedBefore(blockHeight: number, forTokenId: string) {
        const q = {
            v: 3,
            q: {
                db: ["c"],
                aggregate: [
                    { $match: { "$or": [{"out.h4": forTokenId}, {"tx.h": forTokenId}], "blk.i": {$lte: blockHeight } }},
                    { $lookup: { from: "graphs", localField: "tx.h", foreignField: "graphTxn.txid", as: "gtxn" }},
                    { $project: { _id: 0, txid: "$tx.h", txo: "$gtxn.graphTxn.outputs", blk: "$blk.i" }},
                    { $unwind: "$txo" },
                    { $unwind: "$txo" },
                    { $match: { "txo.status": "UNSPENT" }},
                    { $project: {
                        slpAmount: "$txo.slpAmount", address: "$txo.address", vout: "$txo.vout", txid: 1, blk: 1,
                    }},
                ],
                limit: MAX_QUERY_LIMIT,
            },
        };

        const data = Buffer.from(JSON.stringify(q)).toString("base64");

        const config: AxiosRequestConfig = {
            method: "GET",
            url: Config.url + "/q/" + data,
        };

        const response = (await axios(config)).data;
        const list: TxoResponse[] = response.c;

        return list;
    }

    public static async GetConfirmedTxosCreatedBeforeButSpentLaterThan(blockHeight: number, forTokenId: string) {
        const q = {
            v: 3,
            q: {
                db: ["c"],
                aggregate: [
                    { $match: { "$or": [{"out.h4": forTokenId}, {"tx.h": forTokenId}], "blk.i": {$lte: blockHeight } }},
                    { $lookup: { from: "graphs", localField: "tx.h", foreignField: "graphTxn.txid", as: "gtxn" }},
                    { $project: { _id: 0, txid: "$tx.h", txo: "$gtxn.graphTxn.outputs", blk: "$blk.i" }},
                    { $unwind: "$txo" },
                    { $unwind: "$txo" },
                    { $lookup: {from: "confirmed", localField: "txo.spendTxid", foreignField: "tx.h", as: "c"}},
                    { $unwind: "$c" },
                    { $project: {
                        spendTxid: "$txo.spendTxid", status: "$txo.status", slpAmount: "$txo.slpAmount",
                        address: "$txo.address", spentAtBlock: "$c.blk.i", txid: 1, blk: 1,
                    }},
                    { $match: { spentAtBlock: {$gt: blockHeight}}},
                ],
                limit: MAX_QUERY_LIMIT,
            },
        };

        const data = Buffer.from(JSON.stringify(q)).toString("base64");

        const config: AxiosRequestConfig = {
            method: "GET",
            url: Config.url + "/q/" + data,
        };

        const response = (await axios(config)).data;
        const list: TxoResponse[] = response.c;

        return list;
    }

    public static async GetMempoolTxosCreatedAtOrBefore(blockHeight: number, forTokenId: string) {
        const q = {
            v: 3,
            q: {
                db: ["c"],
                aggregate: [
                    { $match: { "$or": [{"out.h4": forTokenId}, {"tx.h": forTokenId}], "blk.i": {$lte: blockHeight } }},
                    { $lookup: { from: "graphs", localField: "tx.h", foreignField: "graphTxn.txid", as: "gtxn" }},
                    { $project: { _id: 0, txid: "$tx.h", txo: "$gtxn.graphTxn.outputs", blk: "$blk.i" }},
                    { $unwind: "$txo" },
                    { $unwind: "$txo" },
                    { $lookup: {from: "unconfirmed", localField: "txo.spendTxid", foreignField: "tx.h", as: "u"}},
                    { $unwind: "$u" },
                    { $project: {
                        spendTxid: "$txo.spendTxid", status: "$txo.status", slpAmount: "$txo.slpAmount",
                        address: "$txo.address", txid: 1, blk: 1,
                    }},
                ],
                limit: MAX_QUERY_LIMIT,
            },
        };

        const data = Buffer.from(JSON.stringify(q)).toString("base64");

        const config: AxiosRequestConfig = {
            method: "GET",
            url: Config.url + "/q/" + data,
        };

        const response = (await axios(config)).data;
        const list: TxoResponse[] = response.c;

        return list;
    }

        // This method is used to get all Tokens that are associated with a
    // given document hash value and optional namespace.  The current use for
    // this is to search for other tokens which are signaling to work with
    // a specific app.
    //
    // For example, anyone who wants to have a chat group automatically
    // discovered by the SLPChat d-app would need to create
    // a NFT1 Group token with the Document Hash set to the value:
    // 94dbe7179abd236cfb0fc5aaef86aad92214053f6de2885872dd85235cfa9f67
    // (this is the id for SlpChat d-app)
    //
    // The SLPChat d-app would then use the following method to look for
    // chat groups wishing to be discovered.
    //
    // Optionally, a ticker can be used a filter for namespacing by some d-app protocols,
    // and can be used to further refine the search.
    public static async SearchForTokenIdInDocHash(
        docHashHex: string,
        options: { blockHeight: number, ticker: string }|undefined =
        { blockHeight: 0, ticker: "" },
    ): Promise<GenesisInfo[]> {
        let elemMatch;
        if (options.ticker.length > 0) {
            elemMatch = { $elemMatch: {
                b7: Buffer.from(docHashHex, "hex").toString("base64"),
                b4: options.ticker,
            }};
        } else {
            elemMatch = { $elemMatch: {
                b7: Buffer.from(docHashHex, "hex").toString("base64"),
            }};
        }

        const q = {
            v: 3,
            q: {
                db: ["c", "u"],
                aggregate: [
                    { $match: {
                        "out": elemMatch,
                        "blk.i": { $gte: options.blockHeight },
                    }},
                    { $project: {
                        tokenId: "$slp.detail.tokenIdHex",
                    }},
                    { $lookup: {
                        from: "tokens",
                        localField: "tokenId",
                        foreignField: "tokenDetails.tokenIdHex",
                        as: "token",
                    }},
                    {$unwind: "$token"},
                    { $project: {
                        _id: 0,
                        stats: "$token.tokenStats",
                        token: "$token.tokenDetails",
                    }},
                ],
                limit: MAX_QUERY_LIMIT,
            },
        };

        const data = Buffer.from(JSON.stringify(q)).toString("base64");

        const config: AxiosRequestConfig = {
            method: "GET",
            url: Config.url + "/q/" + data,
        };

        const response = (await axios(config)).data;
        const list: GenesisInfo[] = response.c;
        list.concat(response.u);

        return list;
    }
}
