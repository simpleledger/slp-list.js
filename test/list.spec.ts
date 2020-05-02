import assert from "assert";
import { List } from "../src/list";

describe("list.ts", () => {

    it("GetAddressListFor", async () => {
        const atOrBeforeBlock = 620971;
        const list = await List.GetAddressListFor(
            "c4b0d62156b3fa5c8f3436079b5394f7edc1bef5dc1cd2f9d0c4d46f82cca479",
            atOrBeforeBlock,
        );
        assert.equal(list.size === 367, true);
    });
    it("GetAddressListFor", async () => {
        const atOrBeforeBlock = 620971;
        const list = await List.GetAddressListFor(
            "c4b0d62156b3fa5c8f3436079b5394f7edc1bef5dc1cd2f9d0c4d46f82cca479",
            atOrBeforeBlock,
            true,
        ) as Map<string, string>;
        assert.equal(list.size === 367, true);
        //assert.equal(list.values());
    });
    it("SearchForTokensReferencing", async () => {
        const list = await List.SearchForTokenIdInDocHash(
            "94dbe7179abd236cfb0fc5aaef86aad92214053f6de2885872dd85235cfa9f67"
        );
        let set = new Set<string>(list.map(i => i.token.tokenIdHex));
        assert.equal(set.has("4b7d2757d155520e0c6a9653a9750d9b574bd9779e9cb106b9d7c1ac22226260"), true);
    });
    it("SearchForTokensReferencing w/ options", async () => {
        const list = await List.SearchForTokenIdInDocHash(
            "94dbe7179abd236cfb0fc5aaef86aad92214053f6de2885872dd85235cfa9f67",
            { blockHeight: 0, ticker: "slp.network" }
        );
        assert.equal(list.length === 0, true);
    });
    it("GetCoinListFor throws", () => {
        assert.rejects(async () => await List.GetCoinListFor(
            "94dbe7179abd236cfb0fc5aaef86aad92214053f6de2885872dd85235cfa9f67",
            0,
            1,
        ));
    });
    it("GetCoinListFor large coin age cutoff", async () => {
        const a = await List.GetCoinListFor(
            "c4b0d62156b3fa5c8f3436079b5394f7edc1bef5dc1cd2f9d0c4d46f82cca479",
            620971,
            620960,
        );
        assert.equal(a.length > 0, true);
    });
});
