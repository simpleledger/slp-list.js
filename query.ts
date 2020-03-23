import axios, { AxiosRequestConfig } from "axios";
import { Big } from "big.js";

export class SlpdbQueries {

    public static async GetAddressListFor(blockHeight: number, forTokenId: string, slpdbUrl = "https://slpdb.fountainhead.cash", displayValueAsString= false) {
        let txos: TxoResponse[] = [];
        if (blockHeight < 0) {
            throw Error("Value for 'blockHeight' must be greater than 0.");
        }
        const txos1 = await this.GetUnspentTxosCreatedBefore(blockHeight, forTokenId, slpdbUrl);
        const txos2 = await this.GetTxosCreatedBeforeButSpentLaterThan(blockHeight, forTokenId, slpdbUrl);
        const txos3 = await this.GetTxosCreatedBeforeButSpentInMempool(blockHeight, forTokenId, slpdbUrl);
        txos = txos.concat(...txos1).concat(...txos2).concat(...txos3);

        const bals = new Map<string, Big>();
        txos.forEach((txo: TxoResponse) => {
            if (bals.has(txo.address)) {
                bals.set(txo.address, bals.get(txo.address)!.plus(txo.slpAmount));
            } else {
                bals.set(txo.address, new Big(txo.slpAmount));
            }
        });

        if (displayValueAsString) {
            let bals_str = new Map<string, string>();
            bals.forEach((bal, key) => bals_str.set(key, bal.toFixed()));
            return bals_str;
        }

        return bals;
    }

    public static async GetUnspentTxosCreatedBefore(blockHeight: number, forTokenId: string, slpdb_url="https://slpdb.fountainhead.cash") {
        const q = {
            v: 3,
            q: {
                db: ["c"],
                aggregate: [
                    { $match: { "$or": [{"out.h4": forTokenId}, {"tx.h": forTokenId}], "blk.i": {$lte: blockHeight } }},
                    { $lookup: { from: "graphs", localField: "tx.h", foreignField: "graphTxn.txid", as: "gtxn" }},
                    { $project: { _id: 0, txid: "$tx.h", txo: "$gtxn.graphTxn.outputs" }},
                    { $unwind: "$txo" },
                    { $unwind: "$txo" },
                    { $match: { "txo.status": "UNSPENT" }}, // or "SPENT_UNCONFIRMED"  <-- this would be an alternative to the unconfirmed collection query
                    { $project: { slpAmount: "$txo.slpAmount", address: "$txo.address", txid: 1 }},
                ],
                limit: 100000,
            },
        };

        const data = Buffer.from(JSON.stringify(q)).toString("base64");

        const config: AxiosRequestConfig = {
            method: "GET",
            url: slpdb_url + "/q/" + data,
        };

        const response = (await axios(config)).data;
        const list: TxoResponse[] = response.c;

        return list;
    }

    public static async GetTxosCreatedBeforeButSpentLaterThan(blockHeight: number, forTokenId: string, slpdb_url="https://slpdb.fountainhead.cash") {
        const q = {
            v: 3,
            q: {
                db: ["c"],
                aggregate: [
                    { $match: { "$or": [{"out.h4": forTokenId}, {"tx.h": forTokenId}], "blk.i": {$lte: blockHeight } }},
                    { $lookup: { from: "graphs", localField: "tx.h", foreignField: "graphTxn.txid", as: "gtxn" }},
                    { $project: { _id: 0, txid: "$tx.h", txo: "$gtxn.graphTxn.outputs", blk0: "$blk.i" }},
                    { $unwind: "$txo" },
                    { $unwind: "$txo" },
                    { $lookup: {from: "confirmed", localField: "txo.spendTxid", foreignField: "tx.h", as: "c"}},
                    { $unwind: "$c" },
                    { $project: { spendTxid: "$txo.spendTxid", status: "$txo.status", slpAmount: "$txo.slpAmount", address: "$txo.address", spentAtBlock: "$c.blk.i", txid: 1, blk0: 1 }},
                    { $match: { spentAtBlock: {$gt: blockHeight}}},
                ],
                limit: 100000,
            },
        };

        const data = Buffer.from(JSON.stringify(q)).toString("base64");

        const config: AxiosRequestConfig = {
            method: "GET",
            url: slpdb_url + "/q/" + data,
        };

        const response = (await axios(config)).data;
        const list: TxoResponse[] = response.c;

        return list;
    }

    public static async GetTxosCreatedBeforeButSpentInMempool(blockHeight: number, forTokenId: string, slpdb_url="https://slpdb.fountainhead.cash") {
        const q = {
            v: 3,
            q: {
                db: ["c"],
                aggregate: [
                    { $match: { "$or": [{"out.h4": forTokenId}, {"tx.h": forTokenId}], "blk.i": {$lte: blockHeight } }},
                    { $lookup: { from: "graphs", localField: "tx.h", foreignField: "graphTxn.txid", as: "gtxn" }},
                    { $project: { _id: 0, txid: "$tx.h", txo: "$gtxn.graphTxn.outputs" }},
                    { $unwind: "$txo" },
                    { $unwind: "$txo" },
                    { $lookup: {from: "unconfirmed", localField: "txo.spendTxid", foreignField: "tx.h", as: "u"}},
                    { $unwind: "$u" },
                    { $project: { spendTxid: "$txo.spendTxid", status: "$txo.status", slpAmount: "$txo.slpAmount", address: "$txo.address", txid: 1}},
                ],
                limit: 100000,
            },
        };

        const data = Buffer.from(JSON.stringify(q)).toString("base64");

        const config: AxiosRequestConfig = {
            method: "GET",
            url: slpdb_url + "/q/" + data,
        };

        const response = (await axios(config)).data;
        const list: TxoResponse[] = response.c;

        return list;
    }
}

interface TxoResponse {
    txid: string;
    slpAmount: string;
    address: string;
    spendTxid?: string;
    spentAtBlock?: number;
}
