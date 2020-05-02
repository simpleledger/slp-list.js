import assert from "assert";
import { Nft1List } from "../src/nft1";

describe("Nft1List", () => {
    it("SearchForNftsIn", async () => {
        const list = await Nft1List.SearchForNftsInGroup("9ce9ebb34a1efcbe1649dc6cc9e62a2b2c2c4fb0947d7ea6412adefbc725829c");
        const set = new Set<string>(list.map(i => i.token.tokenIdHex));
        assert.equal(set.has("c67c6423767a86e27c56ad9c04581f4500d88baff12b865611a39602f449b465"), true);
        assert.equal(list.length > 0, true);
    });

    it("SearchForNftsIn", async () => {
        const list = await Nft1List.SearchForNftsInGroup(
            "9ce9ebb34a1efcbe1649dc6cc9e62a2b2c2c4fb0947d7ea6412adefbc725829c",
            { blockHeight: 626897 });
        assert.equal(list.length === 0, true);
    });
});
