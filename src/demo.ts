import Big from "big.js";
import { GrpcClient } from "grpc-bchrpc-node";
import { prompt } from "inquirer";
import * as readline from "readline";
import { SlpdbQueries } from "./query";

const bchaddr = require("bchaddrjs-slp");
const Spinner = require("cli-spinner").Spinner;

const args = process.argv.slice(2);
let client: GrpcClient;
let customUrl, certPath: string;
if (args.includes("--bchd-rootcert") && args.includes("--bchd-url")) {
    certPath = args[args.indexOf("--bchd-rootcert") + 1];
    customUrl = args[args.indexOf("--bchd-url") + 1];
    client = new GrpcClient({ url: customUrl });
} else if (args.includes("--bchdurl")) {
    customUrl = args[args.indexOf("--bchd-url") + 1];
    client = new GrpcClient({ url: customUrl });
} else {
    client = new GrpcClient();
}

(async () => {
    const slpdbHosts: {[key: string]: string[]} = {
        mainnet: ["https://slpdb.bitcoin.com", "https://slpdb.fountainhead.cash", "https://slpserve.imaginary.cash", "http://localhost:3000"],
        testnet: ["https://tslpdb.bitcoin.com", "http://localhost:3000"],
    };

    const appMode: string = (await prompt([
        {
            type: "list",
            name: "mode",
            message: "What would you like to do?",
            choices: [
                {
                    value: "slp_shareholder_list",
                    name: "Token holders and balances.",
                },
                {
                    value: "bch_dividend_list_prorata",
                    name: "Token holders and pro-rata BCH dividend to distribute.",
                },
                {
                    value: "slp_coin_age_list",
                    name: "Token coin listing with addresses and coin age.",
                },
                {
                    value: "slp_airdrop_list_prorata",
                    name: "Token holders and SLP airdrop pro-rata.",
                },
            ],
        },
    ])).mode;

    const bch_network: string = (await prompt([
        {
            type: "list",
            name: "bch_network",
            message: "Choose BCH network:",
            choices: ["Mainnet", "Testnet"],
            filter(net: string) { return net.toLowerCase(); },
        },
    ])).bch_network;

    let minHeight = 543375;
    let minMtp = 1534250155;
    if (bch_network === "testnet") {
        if (!customUrl) {
            client = new GrpcClient({testnet: true});
        }
        minHeight = 1253801;
        minMtp = 1535262813;
    }

    let spinner = new Spinner("Getting Network Info.. %s");
    spinner.setSpinnerString("|/-\\");
    spinner.start();
    let bestHeight: number;
    let currentMtp: number;
    try {
        bestHeight = (await client.getBlockchainInfo()).getBestHeight();
        currentMtp = (await client.getBlockInfo({ index: bestHeight })).getInfo()!.getMedianTime();
    } catch (e) {
        spinner.stop(true);
        print("Network error:", e.message);
        process.exit();
    }

    spinner.stop(true);

    print("------------NETWORK INFO------------");
    print("Current Height:", bestHeight!);
    print("Current MTP-11:", currentMtp!);
    print("------------------------------------");

    const time_mode = (await prompt([
        {
            type: "list",
            name: "time_mode",
            message: "Time selection method:",
            choices: [
                {
                    name: "Use current best height",
                    value: "best_block",
                },
                {
                    name: "Enter block height (must be > " + minHeight + ")",
                    value: "height",
                },
                {
                    name: "Enter MTP-11 unix timestamp (must be > " + minMtp + ")",
                    value: "mtp",
                },
                {
                    name: "Use mempool state",
                    value: "mempool",
                },
            ],
        },
    ])).time_mode;

    let userHeight = -1;
    if (time_mode === "mtp") {
        const userMtp = (await prompt([
            {
                type: "input",
                name: "mtp",
                message: "Enter desired MTP-11:",
                validate(t) {
                    if (t < minMtp || t > currentMtp) { return false; }
                    return /^\d+$/.test(t);
                },
            },
        ])).mtp;

        const updateProgress = (h: number) => {
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0, 0);
            process.stdout.write("Searching for block with MTP.. " + h);
        };

        // download block info
        clearScreen();
        for (let i = bestHeight!; bestHeight! > 0; i--) {
            const info = (await client.getBlockInfo({ index: i })).getInfo()!;
            updateProgress(info!.getHeight());
            if (userMtp > info!.getMedianTime()) {
                userHeight = i + 1;
                break;
            }
        }
        clearScreen();
    } else if (time_mode === "height") {
        userHeight = parseInt((await prompt([{
                type: "input",
                name: "height",
                message: "Enter desired block height:",
                choices: [],
                validate(h) {
                    if (h < minHeight || h > bestHeight) { return false; }
                    return /^\d+$/.test(h);
                },
            },
        ])).height, 10);
    } else if (time_mode === "best_block") {
        userHeight = bestHeight!;
    }

    const answers = await prompt([
        {
            type: "list",
            name: "slpdbHost",
            message: "Choose SLPDB host:",
            choices: slpdbHosts[bch_network],
        },
        {
            type: "input",
            name: "slpTokenId",
            message: "Enter token ID:",
            validate(id) { return /^([A-Fa-f0-9]{2}){32,32}$/.test(id); },
        },
    ]);

    if (typeof userHeight !== "number") { throw Error("userHeight must be a number."); }
    print("------------------------------------------------------");

    if (appMode === "slp_shareholder_list") {
        spinner = new Spinner("processing.. %s");
        spinner.setSpinnerString("|/-\\");
        spinner.start();
        const bals =  await SlpdbQueries.GetAddressListFor(userHeight, answers.slpTokenId, answers.slpdbHost) as Map<string, Big>;
        spinner.stop(true);
        const slpTotal = Array.from(bals.values()).reduce((a, c) => a.plus(c), new Big(0));
        bals.forEach((v, k) => {
            if (v.gt(0)) {
                print(k + ",", v.toFixed());
            }
        });
        print("------------------------------------------------------");
        print(`Block Height: ${userHeight}`);
        print(`Address Count (includes 0 balances): ${bals.size}`);
        print(`Address Count (not including 0 balances): ${Array.from(bals.values()).filter((v) => v.gt(0)).length}`);
        print(`Tokens Circulating: ${slpTotal.toFixed()}`);
    } else if (appMode === "bch_dividend_list_prorata") {
        const bchAmount = (await prompt([{
            type: "input",
            name: "bch_amount",
            message: "Enter BCH amount to distribute:",
            validate(id) { return /^\d+(\.\d{0,8})?$/.test(id); }, // up to 8 decimal places
        }])).bch_amount;

        spinner = new Spinner("processing.. %s");
        spinner.setSpinnerString("|/-\\");
        spinner.start();
        const bals =  await SlpdbQueries.GetAddressListFor(userHeight, answers.slpTokenId, answers.slpdbHost) as Map<string, Big>;
        spinner.stop(true);
        const slpTotal = Array.from(bals.values()).reduce((a, c) => a.plus(c), new Big(0));

        bals.forEach((v, k) => {
            const d = v.div(slpTotal).mul(bchAmount);
            if (d.gt(0.00000000)) {
                print(`${bchaddr.toCashAddress(k)}, ${d.toFixed(8)}`);
            }
        });

        print("-----------------COPY/PASTE TO ELECTRON CASH-------------------\n");
        print(`Block Height: ${userHeight}`);
        print(`Address Count (includes 0 balances): ${bals.size}`);
        print(`Address Count (not including 0 balances): ${Array.from(bals.values()).filter((v) => v.gt(0)).length}`);
        print(`Receiver Count (not including 0 outputs): ${Array.from(bals.values()).filter((v) => v.round(8).gte(0.00000001)).length}`);
        print("Tokens Circulating:", slpTotal.toFixed());
    } else if (appMode === "slp_coin_age_list") {
        const coinAgeFrom = parseInt((await prompt([{
            type: "input",
            name: "coin_age_from",
            message: "Coin Age should be calculated from block:",
            default: 0,
            validate(id) { return /^[0-9]\d*$/.test(id); },
        }])).coin_age_from, 10);

        spinner = new Spinner("processing.. %s");
        spinner.setSpinnerString("|/-\\");
        spinner.start();
        const coins = await SlpdbQueries.GetCoinListFor(userHeight, answers.slpTokenId, answers.slpdbHost, coinAgeFrom);
        spinner.stop(true);
        coins.forEach((v, i) => {
            const a = v.slpAmount;
            const b = v.coinAge;
            print(`${v.address}, ${a} ${a !== "1" ? "tokens" : "token"}, ${b} ${b! > 1 ? "blocks" : "block"} old, ${v.txid}:${v.vout}`);
        });
    } else if (appMode === "slp_airdrop_list_prorata") {
        const slpDivisibility = parseInt((await prompt([{
            type: "input",
            name: "slp_divisibility",
            message: "Airdrop token divisibility (must be between 0-9):",
            validate(id) { return /^(?:[0-9])$/.test(id); },
        }])).slp_divisibility, 10);
        const regex = "^\\d+(\\.\\d{0," + slpDivisibility + "})?$";
        const re = new RegExp(regex);
        const slp_amount = (await prompt([
            {
                type: "input",
                name: "slp_amount",
                message: "Enter airdrop amount:",
                validate(id) { return re.test(id); }, // only 8 decimal places
            },
        ])).slp_amount;
        let counter = 0;
        const thresh = new Big(1).div(slpDivisibility);

        spinner = new Spinner("processing.. %s");
        spinner.setSpinnerString("|/-\\");
        spinner.start();
        const bals =  await SlpdbQueries.GetAddressListFor(userHeight, answers.slpTokenId, answers.slpdbHost) as Map<string, Big>;
        spinner.stop(true);
        const slpTotal = Array.from(bals.values()).reduce((a, c) => a.plus(c), new Big(0));

        bals.forEach((v, k) => {
            const d = v.div(slpTotal).mul(slp_amount);
            if (d.round(slpDivisibility).gte(thresh)) {
                print(k + ",", d.toFixed(slpDivisibility));
                counter += 1;
                if (counter % 19 === 0) {
                    print("------------------- SLP TXN OUTPUT LIMIT ---------------------");
                }
            }
        });

        print("---------- COPY/PASTE TO ELECTRON CASH SLP v3.4.15+ ----------\n");
        print(`Block Height: ${userHeight}`);
        print(`Address Count (includes 0 balance): ${bals.size}`);
        print(`Address Count (not including 0 balances): ${Array.from(bals.values()).filter((v) => v.gt(0)).length}`);
        print(`Receiver Count (not including 0 outputs): ${counter}`);
        print(`Tokens Circulating: ${slpTotal.toFixed()}`);
    }
})();

function clearScreen() {
    const blank = "\n".repeat(process.stdout.rows!);
    print(blank);
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
}

function print(s: any, ...optionalArgs: any[]) {
    console.log(s, ...optionalArgs);
}
