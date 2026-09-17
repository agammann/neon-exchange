export const IS_LAB=typeof __NEON_LAB__!=='undefined'&&__NEON_LAB__;
export const CHAIN_ID=IS_LAB?31337:1;
export const NETWORK_NAME=IS_LAB?'Neon local testnet':'Ethereum Mainnet';
export const TX_EXPLORER=IS_LAB?'/lab/tx/':'https://etherscan.io/tx/';
