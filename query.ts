import axios, { AxiosRequestConfig } from 'axios';
import { Big } from 'big.js';

export class SlpdbQueries {

    static async GetAddressListFor(blockHeight: number, forTokenId: string, slpdb_url='https://slpdb.fountainhead.cash', displayValueAsString=false) {
        let txos: TxoResponse[] = [];
        if(blockHeight > -1) {
            let txos1 = await this.GetUnspentTxosCreatedBefore(blockHeight, forTokenId, slpdb_url);
            let txos2 = await this.GetTxosCreatedBeforeButSpentLaterThan(blockHeight, forTokenId, slpdb_url);
            let txos3 = await this.GetTxosCreatedBeforeButSpentInMempool(blockHeight, forTokenId, slpdb_url);
            txos = txos.concat(...txos1).concat(...txos2).concat(...txos3);
        } else {
            let txos_mempool = await this.GetUnconfirmedBalances(forTokenId, slpdb_url);
            txos = txos.concat(...txos_mempool);
        }

        let bals = new Map<string, Big>();
        txos.forEach((txo: TxoResponse) => {
            if(bals.has(txo.address)){
                bals.set(txo.address, bals.get(txo.address)!.plus(txo.slpAmount));
            }
            else
                bals.set(txo.address, new Big(txo.slpAmount));
        })

        if(displayValueAsString) {
            let bals_str = new Map<string, string>();
            bals.forEach((bal, key) => bals_str.set(key, bal.toFixed()));
            return bals_str;
        }

        return bals;
    }

    static async GetUnconfirmedBalances(forTokenId: string, slpdb_url='https://slpdb.fountainhead.cash') {
        let q = {
            "v": 3,
            "q": {
                "db": ["a"],
                "find": {
                    "tokenDetails.tokenIdHex": forTokenId //,
                    //"token_balance": { "$gte": minSlpBalanceForDividend }
                },
                "limit": 100000,
                "project": {"address": 1, "token_balance": 1, "_id": 0 }
            }
        }

        let data = Buffer.from(JSON.stringify(q)).toString('base64');

        let config: AxiosRequestConfig = {
            method: 'GET',
            url: slpdb_url + "/q/" + data
        };

        let response = (await axios(config)).data;
        const list: TxoResponse[] = response.a.map((i: any) => { i.slpAmount = i.token_balance; return i; });

        return list;
    }

    static async GetUnspentTxosCreatedBefore(blockHeight: number, forTokenId: string, slpdb_url='https://slpdb.fountainhead.cash') {
        let q = {
            "v": 3,
            "q": {
                "db": ["c"],
                "aggregate": [
                    { "$match": { "$or":[{"out.h4":forTokenId},{"tx.h":forTokenId}], "blk.i": {"$lte": blockHeight } }},
                    { "$lookup": { "from": "graphs", "localField": "tx.h", "foreignField": "graphTxn.txid", "as": "gtxn" }},
                    { "$project": { "_id": 0, "txid": "$tx.h", "txo": "$gtxn.graphTxn.outputs" }},
                    { "$unwind": "$txo" },
                    { "$unwind": "$txo" }, 
                    { "$match": { "txo.status":"UNSPENT" }}, // or "SPENT_UNCONFIRMED"  <-- this would be an alternative to the unconfirmed collection query
                    { "$project":{ "slpAmount":"$txo.slpAmount", "address":"$txo.address", "txid": 1 }}
                ],
                "limit": 100000
            }
        }

        let data = Buffer.from(JSON.stringify(q)).toString('base64');

        let config: AxiosRequestConfig = {
            method: 'GET',
            url: slpdb_url + "/q/" + data
        };

        let response = (await axios(config)).data;
        const list: TxoResponse[] = response.c;

        return list;
    }

    static async GetTxosCreatedBeforeButSpentLaterThan(blockHeight: number, forTokenId: string, slpdb_url='https://slpdb.fountainhead.cash') {
        let q = {
            "v": 3,
            "q": {
                "db": ["c"],
                "aggregate": [
                    { "$match": { "$or":[{"out.h4":forTokenId},{"tx.h":forTokenId}], "blk.i": {"$lte": blockHeight } }},
                    { "$lookup": { "from": "graphs", "localField": "tx.h", "foreignField": "graphTxn.txid", "as": "gtxn" }},
                    { "$project": { "_id": 0, "txid": "$tx.h", "txo": "$gtxn.graphTxn.outputs", "blk0": "$blk.i" }},
                    { "$unwind": "$txo" },
                    { "$unwind": "$txo" }, 
                    { "$lookup": {"from": "confirmed", "localField": "txo.spendTxid", "foreignField": "tx.h", "as": "c"}}, 
                    { "$unwind": "$c" },
                    { "$project":{ "spendTxid":"$txo.spendTxid", "status": "$txo.status", "slpAmount":"$txo.slpAmount", "address":"$txo.address", "spentAtBlock":"$c.blk.i", "txid": 1, "blk0":1 }},
                    { "$match": { "spentAtBlock":{"$gt": blockHeight}}}
                ],
                "limit": 100000
            }
        }

        let data = Buffer.from(JSON.stringify(q)).toString('base64');

        let config: AxiosRequestConfig = {
            method: 'GET',
            url: slpdb_url + "/q/" + data
        };

        let response = (await axios(config)).data;
        const list: TxoResponse[] = response.c;

        return list;
    }

    static async GetTxosCreatedBeforeButSpentInMempool(blockHeight: number, forTokenId: string, slpdb_url='https://slpdb.fountainhead.cash') {
        let q = {
            "v": 3,
            "q": {
                "db": ["c"],
                "aggregate": [
                    { "$match": { "$or":[{"out.h4":forTokenId},{"tx.h":forTokenId}], "blk.i": {"$lte": blockHeight } }},
                    { "$lookup": { "from": "graphs", "localField": "tx.h", "foreignField": "graphTxn.txid", "as": "gtxn" }},
                    { "$project": { "_id": 0, "txid": "$tx.h", "txo": "$gtxn.graphTxn.outputs" }},
                    { "$unwind": "$txo" },
                    { "$unwind": "$txo" }, 
                    { "$lookup": {"from": "unconfirmed", "localField": "txo.spendTxid", "foreignField": "tx.h", "as": "u"}}, 
                    { "$unwind": "$u" },
                    { "$project":{ "spendTxid":"$txo.spendTxid", "status": "$txo.status", "slpAmount":"$txo.slpAmount", "address":"$txo.address", "txid": 1}}
                ],
                "limit": 100000
            }
        }

        let data = Buffer.from(JSON.stringify(q)).toString('base64');

        let config: AxiosRequestConfig = {
            method: 'GET',
            url: slpdb_url + "/q/" + data
        };

        let response = (await axios(config)).data;
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