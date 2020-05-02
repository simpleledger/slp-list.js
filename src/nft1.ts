import axios, { AxiosRequestConfig } from "axios";
import { Big } from "big.js";
import { TxoResponse, GenesisInfo, Config } from ".";

const Buffer = require("buffer").Buffer;
//const base64 = require("Base64");

const MAX_QUERY_LIMIT = 10 ** 9;

export class Nft1List {

    // This method is used to get individual NFTs associated with a GroupId
    // Examples:
    //          1) NFTs represent the users of a chat group, or
    //          2) NFT chilren may represent app versioning
    public static async SearchForNftsInGroup(
        groupIdHex: string,
        options: { blockHeight?: number }|undefined = { blockHeight: 0 },
    ): Promise<GenesisInfo[]> {
        let q = {
            v: 3,
            q: {
                db: ["t"],
                aggregate: [
                    { $match: {
                        nftParentId: groupIdHex,
                        "tokenStats.block_created": { $gte: options.blockHeight },
                    }},
                    { $project: {
                        _id: 0,
                        stats: "$tokenStats",
                        token: "$tokenDetails",
                    }},
                    // TODO: do a lookup to UNSPENT NFTs ONLY!
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
        const list: GenesisInfo[] = response.t;

        return list;
    }
}