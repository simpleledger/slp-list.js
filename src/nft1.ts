import axios, { AxiosRequestConfig } from "axios";
import { GenesisInfo, Config } from ".";

const Buffer = require("buffer").Buffer;

const MAX_QUERY_LIMIT = 10 ** 9;

export class Nft1List {

    // This method is used to get individual NFTs associated with a GroupId
    // Examples:
    //          1) NFTs represent the users of a chat group, or
    //          2) NFTs may represent app versioning, where the group Id is the app's Id.
    public static async SearchForNftsInGroup(
        groupIdHex: string,
        options: { createdAfterHeight: number, createdBeforeHeight: number } = { createdAfterHeight: 0, createdBeforeHeight: 0 },
    ): Promise<GenesisInfo[]> {
        const match = { nftParentId: groupIdHex };
        if (options.createdAfterHeight > 0) {
            // @ts-ignore
            match["tokenStats.createdAfterHeight"] = { $gt: options.createdAfterHeight };
        }
        if (options.createdBeforeHeight > 0) {
            // @ts-ignore
            match["tokenStats.createdBeforeHeight"] = { $lt: options.createdBeforeHeight };
        }
        const q = {
            v: 3,
            q: {
                db: ["t"],
                aggregate: [
                    { $match: match },
                    { $project: {
                        _id: 0,
                        stats: "$tokenStats",
                        token: "$tokenDetails",
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
        const list: GenesisInfo[] = response.t;

        return list;
    }

    public static async GetConfirmedNftTokenHolders(
        groupIdHex: string
    ): Promise<Map<string, string>> {

        const q = {
            v: 3,
            q: {
                db: ["g"],
                aggregate: [
                    { $match: {
                        "tokenDetails.nftGroupIdHex": groupIdHex,
                        "graphTxn.outputs": { $elemMatch: { status: "UNSPENT" }},
                    }},
                    {
                      $unwind: "$graphTxn.outputs",
                    },
                    {
                      $match: {
                        "graphTxn.outputs.status": "UNSPENT",
                      },
                    },
                    {
                      $project: {
                        _id: 0, tokenId: "$tokenDetails.tokenIdHex", address: "$graphTxn.outputs.address",
                      },
                    },
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
        const list: { tokenId: string; address: string }[] = response.g;
        let map = new Map<string, string>();
        list.forEach(nft => {
            if (map.has(nft.tokenId)) {
                throw Error("Db error: Cannot have multiple holders of the same NFT.");
            }
            map.set(nft.tokenId, nft.address);
        });

        return map;
    }
}
