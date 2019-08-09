import axios, { AxiosRequestConfig } from 'axios';
import { BigNumber } from 'bignumber.js';

export class SlpdbQueries {

    static async GetAddressListFor(blockHeight: number, forTokenId: string, slpdb_url='https://slpdb.fountainhead.cash', displayValueAsString=false) {
        let txos1 = await this.GetUnspentTxosCreatedBefore(blockHeight, forTokenId, slpdb_url);
        let txos2 = await this.GetTxosCreatedBeforeButSpentLaterThan(blockHeight, forTokenId, slpdb_url);
        let txos = txos1.concat(...txos2);

        let bals = new Map<string, BigNumber>();
        txos.forEach((txo: TxoResponse) => {
            if(bals.has(txo.address)){
                bals.set(txo.address, bals.get(txo.address)!.plus(txo.slpAmount));
            }
            else
                bals.set(txo.address, new BigNumber(txo.slpAmount));
        })

        if(displayValueAsString) {
            let bals_str = new Map<string, string>();
            bals.forEach((bal, key) => bals_str.set(key, bal.toFixed()));
            return bals_str;
        }

        return bals;
    }

    static async GetUnspentTxosCreatedBefore(blockHeight: number, forTokenId: string, slpdb_url='https://slpdb.fountainhead.cash') {
        let q = {
            "v": 3,
            "q": {
                "db": ["c"],
                "aggregate": [
                    { "$match": { "out.h4":forTokenId, "blk.i": {"$lte": blockHeight } }},
                    { "$lookup": { "from": "graphs", "localField": "tx.h", "foreignField": "graphTxn.txid", "as": "gtxn" }},
                    { "$project": { "_id": 0, "txid": "$tx.h", "txo": "$gtxn.graphTxn.outputs" }},
                    { "$unwind": "$txo" },
                    { "$unwind": "$txo" }, 
                    { "$match": { "txo.status":"UNSPENT" }},
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

    static async GetTxosCreatedBeforeButSpentLaterThan(blockHeight:number, forTokenId: string, slpdb_url='https://slpdb.fountainhead.cash') {
        let q = {
            "v": 3,
            "q": {
                "db": ["c"],
                "aggregate": [
                    { "$match": { "out.h4":forTokenId, "blk.i": {"$lte": blockHeight } }},
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

    // static async getMempoolList(forTokenId: string, slpdb_url='https://slpdb.fountainhead.cash') {
    //     let q = {
    //         "v": 3,
    //         "q": {
    //             "db": ["c"],
    //             "aggregate": [
    //                 { "$match": { "out.h4":forTokenId, "blk.i": {"$lte": blockHeight } }},
    //                 { "$lookup": { "from": "graphs", "localField": "tx.h", "foreignField": "graphTxn.txid", "as": "gtxn" }},
    //                 { "$project": { "_id": 0, "txid": "$tx.h", "txo": "$gtxn.graphTxn.outputs" }},
    //                 { "$unwind": "$txo" },
    //                 { "$unwind": "$txo" }, 
    //                 { "$lookup": {"from": "confirmed", "localField": "txo.spendTxid", "foreignField": "tx.h", "as": "c"}}, 
    //                 { "$unwind": "$c" },
    //                 { "$project":{ "spendTxid":"$txo.spendTxid", "slpAmount":"$txo.slpAmount", "address":"$txo.address", "spentAtBlock":"$c.blk.i", "txid": 1 }},
    //                 { "$match": { "spentAtBlock":{"$gt": blockHeight}}}
    //             ],
    //             "limit": 100000
    //         }
    //     }

    //     let data = Buffer.from(JSON.stringify(q)).toString('base64');

    //     let config: AxiosRequestConfig = {
    //         method: 'GET',
    //         url: slpdb_url + "/q/" + data
    //     };

    //     let response = (await axios(config)).data;
    //     const list: TxoResponse[] = response.c;

    //     return list;
    // }
}

interface TxoResponse {
    txid: string;
    slpAmount: string;
    address: string;
    spendTxid?: string;
    spentAtBlock?: number;
}