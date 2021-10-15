# Solana Ignition Hackathon Repo

# Proposing Solana-Arweave PoS Brigde

## Architecture
This cross-chain bridge uses a wraparound token to transfer assets between the two smart-contracts on each blockchain using proof-of-stake to validate transactions. 
The Solana on-chain program and the Arweave smart contract use the same voting and validator system tailored to their specific technology.
The Proof of Stake protocol adds weight to the validator's vote through their safe deposit box.
Their balance is locked and only the smart contract can change the value for a reward or penalty.
Once a transaction is signed, the smart contract adds it to the list of pending transactions, which is used to record the validator's vote and to save the transaction data.
Validators will validate the transaction and be rewarded with the wrap token.
Validators will vote to approve the transaction by verifying all caller and target information allowing for a secure transfer.
Once the vote is validated, the pending transaction is executed across the bridge and then removed from the queue. 
Penalties are applied to validators who tried to vote against the consensus. 
Security is based on the validators and their vote is based on their stake.
Following the consensus and rejecting malicious transactions allows them to receive rewards, which motivates validators to validate good transactions. 
When a validator wants to stop voting, he has to wait until all his transactions are closed and a block security time allows his vault to be unlocked.
His vault will be destroyed and his vault balance will be credited to his actual balance.


Translated with www.DeepL.com/Translator (free version)


see [here](https://devpost.com/software/pianity) for more details in the projet
