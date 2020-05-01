import axios, { AxiosRequestConfig } from "axios";
import { Big } from "big.js";
import { TxoResponse } from ".";

const MAX_QUERY_LIMIT = 10 ** 9;

export class SlpdbQueries {

    public static async GetAddressListFor(blockHeight: number, forTokenId: string, slpdbUrl = "https://slpdb.fountainhead.cash", displayValueAsString = false) {
        const coins = await this.GetCoinListFor(blockHeight, forTokenId, slpdbUrl);
        return await this.GetAddressList(coins, displayValueAsString);
    }

    public static async GetCoinListFor(blockHeight: number, forTokenId: string, slpdbUrl = "https://slpdb.fountainhead.cash", coinAgeStartBlock = 0) {
        if (blockHeight < coinAgeStartBlock) {
            throw Error("Value for 'blockHeight' must be greater than coinAgeStartBlock.");
        }
        let txos: TxoResponse[] = [];
        if (blockHeight < 0) {
            throw Error("Value for 'blockHeight' must be greater than 0.");
        }
        const txos1 = await this.GetUnspentTxosCreatedBefore(blockHeight, forTokenId, slpdbUrl);
        const txos2 = await this.GetTxosCreatedBeforeButSpentLaterThan(blockHeight, forTokenId, slpdbUrl);
        const txos3 = await this.GetTxosCreatedBeforeButSpentInMempool(blockHeight, forTokenId, slpdbUrl);
        txos = txos.concat(...txos1).concat(...txos2).concat(...txos3);
        //const bestBlock = await this._getBestBlockHeight(slpdbUrl);
        for (const txo of txos) {
            if (coinAgeStartBlock && txo.blk < coinAgeStartBlock) {
                txo.coinAge = blockHeight - coinAgeStartBlock;
            } else {
                txo.coinAge = blockHeight - txo.blk;
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

    public static async GetUnspentTxosCreatedBefore(blockHeight: number, forTokenId: string, slpdbUrl = "https://slpdb.fountainhead.cash") {
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
            url: slpdbUrl + "/q/" + data,
        };

        const response = (await axios(config)).data;
        const list: TxoResponse[] = response.c;

        return list;
    }

    public static async GetTxosCreatedBeforeButSpentLaterThan(blockHeight: number, forTokenId: string, slpdbUrl="https://slpdb.fountainhead.cash") {
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
            url: slpdbUrl + "/q/" + data,
        };

        const response = (await axios(config)).data;
        const list: TxoResponse[] = response.c;

        return list;
    }

    public static async GetTxosCreatedBeforeButSpentInMempool(blockHeight: number, forTokenId: string, slpdbUrl="https://slpdb.fountainhead.cash") {
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
            url: slpdbUrl + "/q/" + data,
        };

        const response = (await axios(config)).data;
        const list: TxoResponse[] = response.c;

        return list;
    }

    public static async getBestBlockHeight(slpdbUrl="https://slpdb.fountainhead.cash") {
        const q = {
            v: 3,
            q: {
                db: ["s"],
                aggregate: [
                    { $match: {}},
                    { $project: { _id: 0, blk: "$bchBlockHeight" }}
                ],
                limit: 1,
            }
        };
        const data = Buffer.from(JSON.stringify(q)).toString("base64");
        const config: AxiosRequestConfig = {
            method: "GET",
            url: slpdbUrl + "/q/" + data,
        };
        const response = (await axios(config)).data.s[0];
        return response.blk as number;
    }
}
