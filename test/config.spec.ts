import assert from "assert";
import { Config } from "../src/config";

describe("config.ts", () => {
    it("Get URL", () => {
        assert.equal(typeof Config.url === "string", true);
    });
    it("Set URL succeeds", () => {
        const orig = Config.url;
        const url = "https://___";
        assert.equal(Config.SetUrl(url), url);
        Config.SetUrl(orig);
    });
    it("Set URL throws", () => {
        const orig = Config.url;
        const url = "____";
        assert.throws(() => Config.SetUrl(url));
        assert.equal(Config.url, orig);
        Config.SetUrl(orig);
    });
});
