import assert from "assert";
import { Nft1List } from "../src/nft1";

describe("Nft1List", () => {
    it("SearchForNftsInGroup", async () => {
        const list = await Nft1List.SearchForNftsInGroup("9ce9ebb34a1efcbe1649dc6cc9e62a2b2c2c4fb0947d7ea6412adefbc725829c");
        const set = new Set<string>(list.map(i => i.token.tokenIdHex));
        assert.equal(set.has("c67c6423767a86e27c56ad9c04581f4500d88baff12b865611a39602f449b465"), true);
        assert.equal(list.length > 0, true);
    });

    it("SearchForNftsInGroup w/ with options", async () => {
        const list = await Nft1List.SearchForNftsInGroup(
            "9ce9ebb34a1efcbe1649dc6cc9e62a2b2c2c4fb0947d7ea6412adefbc725829c",
            { createdAfterHeight: 1, createdBeforeHeight: 626897 });
        assert.equal(list.length === 0, true);
    });

    it("GetConfirmedNftTokenHolders", async () => {
        const map = await Nft1List.GetConfirmedNftTokenHolders("9ce9ebb34a1efcbe1649dc6cc9e62a2b2c2c4fb0947d7ea6412adefbc725829c");
        assert.equal(map.size > 0, true);
    });

    it("GetConfirmedNftTokenHolders", async () => {
        const map = await Nft1List.GetConfirmedNftTokenHolders("8d18aa8ccf1a4839f3f074d6134153d0017249cf99f37e5c560de978acaa38c3");
        assert.equal(map.size === 0, true);
    });
});
