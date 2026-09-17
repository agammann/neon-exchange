# Neon Exchange

An ETH / USDT trading terminal with user controlled Ethereum wallet settlement and a separate Bob and Alice limit order simulator. The source is published for inspection. No open source license is granted.

[Open Neon Exchange](https://neon-exchange.alx21.chatgpt.site) · [GitHub repository](https://github.com/agammann/neon-exchange)

## Two distinct modes

**Bob + Alice demo** is a working, browser local matching engine with synthetic prices and simulated funds. Price priority, arrival priority, partial fills, reservations, cancellations, self trade rejection, and sequenced events are implemented. Clicking Run Bob + Alice demo starts a fresh session: Bob buys 0.050 ETH from Alice at 3,250.00 USDT per ETH for 162.50 USDT. Each starts with 10,000 USDT and 2 ETH. The chart is derived from executions; there is no fabricated live market feed. Reloading resets the simulation.

**Wallet trading** constructs real Ethereum Mainnet transactions through the existing Uniswap v3 SwapRouter. It supports selling native ETH for USDT and buying native ETH with USDT. It compares the direct WETH / USDT pools at 0.05%, 0.3%, and 1% fees. It does not provide real limit orders, match real users in the demo book, operate a broker, or guarantee the best available route. Wallet signatures and Ethereum gas are required. The app never requests a private key, seed phrase, or exchange deposit.

## Custody and operator powers

There is no Neon smart contract, token, vault, admin withdrawal key, fee recipient, hosted order API, user database, or custodial balance. The router and token addresses are fixed in this release. The connected account is the only settlement recipient. ETH purchases unwrap WETH and deliver native ETH atomically in the same transaction.

USDT approvals are for the input amount, never an unlimited amount. Existing nonzero insufficient allowances are reset to zero in a separate user signed transaction before a new exact approval. A revoke control sets the router allowance to zero. Disconnecting does not revoke approvals. If sufficient allowance already exists, the app does not increase it.

This removes Neon operator custody, not all risks. A compromised website can present malicious new code or misleading transaction requests. Users still trust their wallet, RPC, deployment, dependencies, Uniswap, and Tether. Tether retains issuer controls. MEV, price movement, reorgs, protocol failure, and compromised devices remain possible. This release has not received an independent security audit. Never describe it as impossible to rug or guaranteed safe.

## Transaction checks

Ethereum chain ID 1 is required. The wallet account and chain are rechecked before requests. On connection the app checks deployed bytecode presence, router factory and WETH references, and USDT decimals. Quotes expire after 30 seconds. Transactions have a three minute deadline, a nonzero minimum output, and 0.1%, 0.5%, or 1% slippage tolerance. Quotes with over 2% estimated price impact are refused. The spot comparison is not an independent price oracle. Before signature, the app simulates the call, estimates gas, and checks ETH coverage. The wallet remains the final review surface. Transaction links and one confirmation are shown; one confirmation does not guarantee finality.

## Run locally

Requires Node.js 22 or newer and pnpm. No API key is needed.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm start
```

Open the local address printed by the server. For wallet mode, use a desktop browser with an Ethereum wallet extension or a compatible wallet browser. The Codex in app browser may not have an injected wallet. Never paste keys into this application.

```sh
pnpm test:fork
```

The fork integration test runs transactions only in an in process local Ethereum fork, using ephemeral test accounts. It reads public Ethereum data from PublicNode. Set `ETHEREUM_RPC_URL` privately to use another read RPC. It does not submit real transactions or spend real money. The test depends on RPC availability and is deliberately separate from the offline CI suite.

## Source map

* `dist/index.html`, `dist/style.css`, and `dist/app.js`: authored terminal and simulator interface.
* `dist/engine.js`: deterministic simulation engine. Integer units: cash in microUSDT, quantities in milliETH, prices in USDT cents per ETH.
* `src/settlement.js`: fixed contract references, quote logic, integer token math, and transaction construction.
* `src/wallet.js`: wallet discovery, balance reads, review, approvals, swaps, revocation, and receipts.
* `build.mjs`: bundles the wallet code and pinned ethers dependency into `dist/wallet.bundle.js`.
* `tests/`: deterministic tests and an actual Ethereum fork settlement test.
* `VALIDATION.md`: observed evidence and unverified boundaries.

The hosted application is static. No credentials, cookies, user records, or private keys belong in its files. The Sites demo is publicly accessible. Google Fonts supplies visual fonts; scripts are bundled locally. The simulation exposes two optional browser WebMCP tools. Wallet actions are deliberately absent from that tool surface.

## References

The educational order book is inspired by [Brian Nigito’s How to Build an Exchange](https://www.janestreet.com/tech-talks/building-an-exchange/). This independent project does not reproduce Jane Street’s distributed infrastructure or performance and has no affiliation with Jane Street.

Contract addresses and integration behavior come from [Uniswap’s Ethereum deployments](https://developers.uniswap.org/docs/protocols/v3/deployments/v3-ethereum-deployments), [Uniswap’s swap interface](https://github.com/Uniswap/v3-periphery/blob/main/contracts/interfaces/ISwapRouter.sol), and [Tether’s integration guidelines](https://tether.to/en/supported-protocols/). The original v3 router is used here for its narrow direct approval and native asset workflow. Uniswap now recommends its Universal Router for new general integrations; this release deliberately does not request Permit2 permissions.

UI layout draws from common advanced trading terminal patterns described in [Coinbase’s dashboard overview](https://help.coinbase.com/coinbase/trading-and-funding/advanced-trade/dashboard-overview). No third party branding or interface assets are copied.

