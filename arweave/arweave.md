# Arweave SmartContract

## Transfer
Smartcontrat defining token and including method to allow transfer between users.
    - Transfer on chain
    - Transfer outside the chain through SOL-AR bridge. A PoS voting system is then create.

## PoS
Transaction between AR and SOL are secured by PoS.
Stake of validators define the importance of their vote for the future transaction.
Validators locked an amount of token to vote in their vault. This vault is locked while there is an active transaction where valdator's vote is at stake.
The more the amount of token is locked, the more the validator vote will be.
Validators are rewarded for their votes. If a vote is outside the consensus, validators will have a penalty.
Validator that propose a bad transaction receives a slashing penalty else the selected validator receive a reward.

## WIP

- NFT transfer
- PST transfer