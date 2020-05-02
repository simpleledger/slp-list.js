import assert from "assert";
import { Utils } from "../src/utils";

describe("utils.ts", () => {
    it("GetBestBlockHeight", async () => {
        const height = await Utils.GetBestBlockHeight();
        assert.equal(height > 0, true);
    });
});
