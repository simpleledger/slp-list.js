import { prompt } from "inquirer";
var Spinner = require('cli-spinner').Spinner;
import { SlpdbQueries } from "./query";
import BigNumber from "bignumber.js";
let Bchaddr = require('bchaddrjs-slp');

(async function() {
    const mode: string = (await prompt([
        {
            type: 'list',
            name: 'mode',
            message: 'What would you like to do?',
            choices: [
                {
                    value: 'slp_shareholder_list',
                    name: 'Get list of SLP token holders and balances.'
                },
                {
                    value: 'bch_dividend_list',
                    name: 'Get list of SLP token holders and calculated BCH pro-rata dividend.'
                },
                {
                    value: 'slp_airdrop_list',
                    name: 'Get list of SLP token holders and calculated SLP airdrop pro-rata.'
                }
            ]
        }
    ])).mode;

    const bch_network: string = (await prompt([
        {
            type: 'list', 
            name: 'bch_network', 
            message: 'Choose BCH network:',
            choices: ['Mainnet', 'Testnet'], 
            filter: function(net:string) { return net.toLowerCase(); }
        }
    ])).bch_network;

    const slpdb_hosts: {[key:string]: string[]} = {
        'mainnet': ['https://slpdb.bitcoin.com', 'https://slpdb.fountainhead.cash', 'https://slpserve.imaginary.cash', 'http://localhost:3000'], 
        'testnet': ['https://tslpdb.bitcoin.com', 'http://localhost:3000']
    };

    // TODO: check to get latest block height for default selection

    const answers = await prompt([
        {
            type: 'input',
            name: 'bch_height',
            message: 'Enter desired block height:',
            choices: [], 
            validate: function(height) { 
                return /^\d+$/.test(height);
            } // TODO: Must also be less than or equal to the actual network height
        },
        {
            type: 'list',
            name: 'slpdb_host',
            message: 'Choose SLPDB host:',
            choices: slpdb_hosts[bch_network]
        },
        {
            type: 'input', 
            name: 'slp_tokenid', 
            message: 'Enter token ID:',
            validate: function(id) { return /^([A-Fa-f0-9]{2}){32,32}$/.test(id); }
        }
    ]);
 
    var spinner = new Spinner('processing.. %s');
    spinner.setSpinnerString('|/-\\');
    spinner.start();
    const bals = <Map<string, BigNumber>>await SlpdbQueries.GetAddressListFor(parseInt(answers.bch_height), answers.slp_tokenid, answers.slpdb_host);
    spinner.stop(true);

    const slp_total = Array.from(bals.values()).reduce((a, c) => a.plus(c), new BigNumber(0));

    if(mode === 'slp_shareholder_list') {
        bals.forEach((v, k) => {
            if(v.isGreaterThan(0))
                console.log(k + ",", v.toFixed());
        })
        console.log("------------------------------------------------------")
        console.log("Number of Addresses (includes 0 balances):", bals.size);
        console.log("Number of Addresses (not including 0 balances):", Array.from(bals.values()).filter(v => v.isGreaterThan(0)).length);
        console.log("Tokens Circulating:", slp_total.toFixed());
    }
    else if(mode === 'bch_dividend_list') {
        let bch_amount = (await prompt([{
            type: 'input', 
            name: 'bch_amount', 
            message: 'Enter BCH amount to distribute:',
            validate: function(id) { return /^\d+(\.\d{0,8})?$/.test(id); } // only 8 decimal places
        }])).bch_amount;        

        bals.forEach((v, k) => {
            let d = v.dividedBy(slp_total).multipliedBy(bch_amount);
            if(d.isGreaterThan(0.00000000))
                console.log(Bchaddr.toCashAddress(k) + ",", d.toFormat(8, BigNumber.ROUND_DOWN));
        });

        console.log("-----------------COPY/PASTE TO ELECTRON CASH-------------------\n")
        console.log("Number of Addresses (includes 0 balances):", bals.size);
        console.log("Number of Addresses (not including 0 balances):", Array.from(bals.values()).filter(v => v.isGreaterThan(0)).length);
        console.log("Number of List Receivers (not including 0 outputs):", Array.from(bals.values()).filter(v => v.decimalPlaces(8).isGreaterThanOrEqualTo(0.00000001)).length);
        console.log("Tokens Circulating:", slp_total.toFixed());
    }
    else if(mode === 'slp_airdrop_list') {
        let slp_divisibility = parseInt((await prompt([
            {
                type: 'input', 
                name: 'slp_divisibility',
                message: 'Airdrop token divisibility (must be between 0-9):',
                validate: function(id) { return /^(?:[0-9])$/.test(id); }
            }
        ])).slp_divisibility); 
        let regex = "^\\d+(\\.\\d{0," + slp_divisibility + "})?$";
        let re = new RegExp(regex);
        let slp_amount = (await prompt([
            {
                type: 'input', 
                name: 'slp_amount', 
                message: 'Enter airdrop amount:',
                validate: function(id) { return re.test(id); } // only 8 decimal places
            }
        ])).slp_amount;
        let counter = 0;
        let thresh = new BigNumber(1).dividedBy(slp_divisibility);
        bals.forEach((v, k) => {
            let d = v.dividedBy(slp_total).multipliedBy(slp_amount);
            if(d.decimalPlaces(slp_divisibility, BigNumber.ROUND_HALF_DOWN).isGreaterThanOrEqualTo(thresh)) {
                console.log(k + ",", d.toFormat(slp_divisibility, BigNumber.ROUND_DOWN));
                counter+=1;
                if(counter % 19 === 0) {
                    console.log("------------------- SLP TXN OUTPUT LIMIT ---------------------");
                }
            }
        });

        console.log("---------- COPY/PASTE TO ELECTRON CASH SLP v3.4.15+ ----------\n")
        console.log("Number of Addresses (includes 0 balance):", bals.size);
        console.log("Number of Addresses (not including 0 balances):", Array.from(bals.values()).filter(v => v.isGreaterThan(0)).length);
        console.log("Number of List Receivers (not including 0 outputs):", counter);
        console.log("Tokens Circulating:", slp_total.toFixed());
    }
    
    process.exit();
})();
