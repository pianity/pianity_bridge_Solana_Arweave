import {
    Connection,
    Keypair,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    Transaction,
    TransactionInstruction,
} from "@solana/web3.js";
import { AccountLayout, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import BN = require("bn.js");

import {
  getKeypair,
  getProgramId,
  ESCROW_ACCOUNT_DATA_LAYOUT,
  getPublicKey,
} from "./utils";

const connection = new Connection("http://localhost:8899", "confirmed");
const watchman_keypair = getKeypair("watchman");
const program_id = getProgramId();

async function send_transaction(target: string) {
  // need to rename it after custom token
  const XTokenMintPubkey = getPublicKey("mint_x");

  const target_pubkey = getPublicKey(target);
  const tempXTokenAccountKeypair = new Keypair();

  // create account owned by TOKEN PROGRAM
  const createTempTokenAccountIx = SystemProgram.createAccount({
    programId: TOKEN_PROGRAM_ID,
    space: AccountLayout.span,
    lamports: await connection.getMinimumBalanceForRentExemption(
      AccountLayout.span
    ),
    fromPubkey: watchman_keypair.publicKey,
    newAccountPubkey: tempXTokenAccountKeypair.publicKey,
  });
  // instruction to init account with 
  const initTempAccountIx = Token.createInitAccountInstruction(
      TOKEN_PROGRAM_ID,
      XTokenMintPubkey,
      tempXTokenAccountKeypair.publicKey,
      watchman_keypair.publicKey
  );
  // instruction to transfer token from watchman to new account
  const transferXTokensToTempAccIx = Token.createTransferInstruction(
      TOKEN_PROGRAM_ID,
      watchman_keypair.publicKey,
      tempXTokenAccountKeypair.publicKey,
      watchman_keypair.publicKey,
      [],
      1 // data here (see ESCROW_ACCOUNT_DATA_LAYOUT.decode)
  );

  // init escrow
  const escrowKeypair = new Keypair();
  const createEscrowAccountIx = SystemProgram.createAccount({
    space: ESCROW_ACCOUNT_DATA_LAYOUT.span,
    lamports: await connection.getMinimumBalanceForRentExemption(
      ESCROW_ACCOUNT_DATA_LAYOUT.span
    ),
    fromPubkey: watchman_keypair.publicKey,
    newAccountPubkey: escrowKeypair.publicKey,
    programId: program_id,
  });
  // instruction for the entrypoint of the programId
  const initEscrowIx = new TransactionInstruction({
    programId: program_id,
    keys: [
      { pubkey: watchman_keypair.publicKey, isSigner: true, isWritable: false },
      {
        pubkey: tempXTokenAccountKeypair.publicKey,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: aliceYTokenAccountPubkey,
        isSigner: false,
        isWritable: false,
      },
      { pubkey: escrowKeypair.publicKey, isSigner: false, isWritable: true },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(
      Uint8Array.of(0, ...new BN(2).toArray("le", 8))
    ), // start first byte by 0 for instruction and finish with little endian as expected amount
  });

  const tx = new Transaction().add(
      createTempTokenAccountIx,
      initTempAccountIx,
      transferXTokensToTempAccIx,
      createEscrowAccountIx,
      initEscrowIx
  );
  await connection.sendTransaction(
    tx,
    [watchman_keypair, tempXTokenAccountKeypair, escrowKeypair],
    { skipPreflight: false, preflightCommitment: "confirmed" }
  );

  // sleep to allow time to update
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

const watchman = async () => {
  send_transaction();
};

watchman();