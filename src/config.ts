export class Config {
    public static get url(): string {
        return Config._url;
    }
    public static SetUrl(url: string) {
        if (url.startsWith("http")) {
            Config._url = url;
        } else {
            throw Error("Url string must start with 'https://'.");
        }
        return Config._url;
    }
    private static _url = "https://nyc1.slpdb.io";
}
