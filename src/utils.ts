import axios, { AxiosRequestConfig } from "axios";
import { Config } from "./config";

export class Utils {
    public static async GetBestBlockHeight() {
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
            url: Config.url + "/q/" + data,
        };
        const response = (await axios(config)).data.s[0];
        return response.blk as number;
    }
}
