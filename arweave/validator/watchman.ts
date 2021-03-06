import fs = require('fs');
import Arweave = require('arweave');
import { JWKInterface } from 'arweave/node/lib/wallet';
import Smartweave = require('smartweave');
import util = require('util')

const arweave = Arweave.init({
    host: 'arweave.net',
    protocol: 'https',
    port: 443
});

interface WaitingTx {
    owner: string,
    target: string,
    qty: number,
    ticker: string,
    target_ticker: string
}

interface State {
    waiting_txs: WaitingTx[],
}

const contracts = {
    WPIA: "ncr5l0U17wzIrwohpLABOrjVs03Bi8oPw6VpY4P9Auo",
};

const validator_wallet_filepath: string = "/mnt/c/Users/hellx/Documents/arweave_wallet/arweave-key-2Jv_ujwc5SjwNYWS7kKOHQMa10Jr2XzN-68K1im8REE.json";

function get_jwk_wallet_from_file(wallet_filepath: string): JWKInterface {
    const file_wallet: string = fs.readFileSync(wallet_filepath, 'utf8');
    const wallet: JWKInterface = JSON.parse(file_wallet) as JWKInterface;
    return (wallet);
}

function get_jwk_wallet_from_key(pub_key: string): JWKInterface {
    console.log(pub_key + " | use arconnect when needed or wallet file")
    // for test purpose
    return get_jwk_wallet_from_file(validator_wallet_filepath);
    
    const wallet_filepath: string = "";
    const file_wallet: string = fs.readFileSync(wallet_filepath, 'utf8');
    
    return (JSON.parse(file_wallet) as JWKInterface);
}

async function get_status(tx_id: string): Promise<number> {
    if (tx_id == "") {
        return (404)
    }
    let ret = await arweave.transactions.getStatus(tx_id)
    .then(res => {
        console.log("[TRANS SEND]: " + JSON.stringify(res, null, 4) + " | tx id = " + tx_id);
        return (res.status);
    })
    .catch(error => { console.log("[ERROR]: " + error); return (404); });
    return (ret);
}

async function post_transaction(validator_wallet: JWKInterface, wtx_id: string, wtx: WaitingTx) {
    const owner_wallet: JWKInterface = get_jwk_wallet_from_key(wtx.owner);
    
    const block_valid = 1; // add function to check caller balance, caller addr, if transaction is validate

    const tx_input = {function: "vote", tx_target: wtx_id, voter: validator_wallet, qty: block_valid}
    const contract_id: string = (contracts as any)[wtx.target_ticker];
    
    console.log(util.inspect(await Smartweave.interactWriteDryRun(arweave, owner_wallet, contract_id, tx_input), {showHidden: false, depth: null, colors: true}));
    /*
    const tx_id = await Smartweave.interactWrite(arweave, owner_wallet, contract_id, tx_input);
    await new Promise(f => setTimeout(f, 10000));
    
    while (await get_status(tx_id) == 404) {
        await arweave.transactions.post(tx_id);
        await new Promise(f => setTimeout(f, 10000));
    }
    */
}

function process_waiting_transaction(validator_wallet: JWKInterface, contractState: State, last_state_file: string) {
    console.log("Loading " + last_state_file);
    let raw_state: string = fs.readFileSync(last_state_file, 'utf-8');
    let last_state_contrat : State = JSON.parse(raw_state);
    
    fs.writeFile(last_state_file, raw_state, function(err) { if (err) { return console.error(err); } });
    
    if (Object.keys(last_state_contrat.waiting_txs).length > 0) {
        const state_key = (Object.keys(Object.keys(contractState.waiting_txs)) as Array<string>);
        const last_state_key = (Object.keys(Object.keys(last_state_contrat.waiting_txs)) as Array<string>);
        const waiting_txs_key = state_key.filter(x => last_state_key.indexOf(x) === -1);

        for (let k in waiting_txs_key) {
            console.log(k)
            post_transaction(validator_wallet, k, contractState.waiting_txs[k]);
        }
    }
}

async function lock_validator_wallet(contract_id: string, validator_wallet: JWKInterface) {
    // locked validator_wallet for X block
    const address: string = await arweave.wallets.jwkToAddress(validator_wallet);
    const tx_input = {function: "lock_vault", target: address, voter: validator_wallet};
    const tx_id = await Smartweave.interactWrite(arweave, validator_wallet, contract_id, tx_input);

    let status: number = 202;
    while (status in [202, 404]) {
        status = await get_status(tx_id);
        if (status == 404) {
            await arweave.transactions.post(tx_id);
        }  
        await new Promise(f => setTimeout(f, 10000));
    }
}

async function unlock_validator_wallet(contract_id: string, validator_wallet: JWKInterface) {
    let block = await arweave.network.getInfo();
    const address: string = await arweave.wallets.jwkToAddress(validator_wallet);
    const vault_status_input = {function: "balance_vault", target: validator_wallet};
    let waiting_block = await Smartweave.interactRead(arweave, validator_wallet, contract_id, vault_status_input);

    while (block["blocks"] < waiting_block["vault"]["block"]) {
        await new Promise(f => setTimeout(f, 10000));
        block = await arweave.network.getInfo();
        waiting_block = await Smartweave.interactRead(arweave, validator_wallet, contract_id, vault_status_input);
    }

    let status: number = 202;
    const unlock_input = {function: "unlock_vault", target: address, voter: validator_wallet};
    const tx_id = await Smartweave.interactWrite(arweave, validator_wallet, contract_id, unlock_input);

    while (status in [202, 404]) {
        status = await get_status(tx_id);
        if (status == 404) {
            await arweave.transactions.post(tx_id);
        }  
        await new Promise(f => setTimeout(f, 10000));
    }
    console.log(`Wallet ${validator_wallet} successfully unlocked from contract: '${contract_id}'`);
}

function watch_contracts(validator_wallet: JWKInterface): void {
    Smartweave.readContract(arweave, contracts["WPIA"]).then(contractState => {
        lock_validator_wallet(contracts["WPIA"], validator_wallet);
        process_waiting_transaction(validator_wallet, contractState, 'states/WPIA_initial_state.json');
    });
}

(async () => {
    const reload_interval: number = 60 * 1000; // 60s
    const validator_wallet = get_jwk_wallet_from_file(validator_wallet_filepath);
    console.log("Start watchman")

    setInterval(()=> { watch_contracts(validator_wallet) }, reload_interval);
    unlock_validator_wallet(contracts["WPIA"], validator_wallet);
})()
