# Neon

[Open Neon](https://neon.alx21.chatgpt.site) · [Public source](https://github.com/agammann/neon) · [Validation](VALIDATION.md)

Neon is a noncustodial Ethereum trading interface with a shared WETH / USDT limit order book, native ETH / USDT instant swaps, and a separate educational Bob and Alice simulator. Source is public for inspection; no open source license is granted.

## Trading

Connect an Ethereum Mainnet wallet through its browser extension or wallet browser. Neon never asks for keys, seed phrases, or an exchange deposit. The Codex in app browser may not provide an Ethereum wallet.

**Limit orders:** Wrap native ETH to WETH if needed. WETH is ETH wrapped 1:1 in the canonical token contract and stays in your wallet. Choose buy or sell, quantity, price, and expiry. Prepare the exact token allowance, then review and sign the order in your wallet. The server verifies the signature, chain, funds, and allowance before publishing it to persistent shared storage. Orders contain no Neon fee or fee recipient.

Another trader selects an order, enters a fill quantity, prepares their allowance, and confirms an onchain fill. Partial fills are supported. Prices and amounts are enforced by the existing 0x settlement contract. Purchased WETH can be unwrapped to native ETH. The UI rechecks onchain state and simulates transactions before signature. Confirmed fills are indexed from actual receipts.

Orders expire after 15 minutes, 1 hour, 1 day, or 7 days. Cancel your order onchain to invalidate the remaining amount. Cancellation takes effect when confirmed; a fill can arrive first. Separate controls revoke USDT and WETH permissions to 0x. Open orders share wallet balances, so multiple orders do not reserve separate funds. Changing balances or allowances can make an order unfillable. Posting a crossing order does not automatically match another order: users actively fill selected orders. Each book page shows up to 20 bids and 20 asks in price and arrival order. Availability is checked on refresh and again before settlement. Unfunded entries can occupy page slots; navigate pages when needed. Maker history shows the latest 40 orders.

**Instant swaps:** Sell native ETH for USDT or buy native ETH with USDT through Uniswap v3. The app compares three direct WETH / USDT fee tiers, sets minimum output, expires quotes after 30 seconds, and rejects estimated impact above 2%. It does not guarantee the best route across all exchanges. USDT approvals use exact amounts and reset an insufficient nonzero allowance before increasing it. Buying ETH unwraps WETH atomically.

**Bob + Alice demo:** A separate browser local simulator demonstrates price and time priority, partial fills, reservations, cancellations, and self trade rejection. Its balances and reference price are synthetic. Its WebMCP tools cannot perform wallet actions.

The shared mainnet book starts without seeded real orders. Users supply orders and counterparties; instant swaps use existing Uniswap liquidity. A public deployment does not create market makers or guarantee fills.

## Custody and remaining trust

Neon has no vault, withdrawal queue, custodial user balance, operator settlement key, custom settlement contract, or token. Transfers are enforced by existing contracts and go to the signed counterparties or connected swap wallet. The server stores public signed orders and receipt data, not funds or private keys. Disconnecting does not revoke approvals or cancel signed orders.

Limit order spender: `0xDef1C0ded9bec7F1a1670819833240f027b25EfF` (0x Exchange Proxy). This protocol has its own upgrade governance; Neon does not control it. Its protocol fee multiplier is checked and must remain zero for this integration.

Instant swap spender: `0xE592427A0AEce92De3Edee1F18E0157C05861564` (Uniswap v3 SwapRouter). USDT: `0xdAC17F958D2ee523a2206206994597C13D831ec7`. WETH: `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`.

Website compromise, malicious updates, dependency or wallet compromise, protocol bugs and governance changes, RPC failures, Tether issuer controls, MEV, and reorgs remain risks. This release has no independent security audit and no completed external wallet mainnet signing test. One confirmation is not finality. Never describe Neon as impossible to rug or guaranteed safe.

## Interactive local testnet

Requires Node.js 22.13 or newer and pnpm.

```sh
pnpm install --frozen-lockfile
pnpm testnet
```

Open http://127.0.0.1:4319 when the lab reports ready. Connect the built in disposable wallet. Select Alice or Bob; separate tabs can use separate participants. Both start with test ETH and fork USDT. You can wrap, post signed orders, partially fill, cancel, revoke, unwrap, and swap through the same interface. A test wallet dialog requires explicit confirmation for each signature or transaction. Local receipts have no monetary value.

This is a local Ethereum fork on chain ID 31337, using copied Tether, WETH, Uniswap, and 0x contract code and state. It is not Sepolia, official test USDT issuance, or a mainnet transaction. The copied 0x implementation retains its immutable mainnet EIP712 signing domain; execution and the local API remain on chain 31337, using fresh disposable keys with no mainnet funding. The public server rejects lab execution profiles and requires mainnet funds and approvals before accepting orders.

The test signer is excluded from the public bundle. The lab binds only to 127.0.0.1, requires the local origin and a session capability, and restricts signing to disposable accounts and canonical orders. It restricts transactions to fixed token and settlement addresses on chain 31337. Keys remain in process memory. Restarting resets the lab and its order book. Stop with Ctrl+C. Startup needs internet for blockchain reads and can take a minute. An optional private `ETHEREUM_RPC_URL` selects another Ethereum RPC. No faucet, extension, seed phrase, or real funds are needed.

## Development and deployment

```sh
pnpm test
pnpm test:fork
pnpm test:orders
pnpm build
pnpm start
```

`pnpm start` runs the mainnet interface on http://127.0.0.1:4318 with persistent local SQLite order storage. It requires a real wallet for mainnet actions. The two fork suites execute locally and never submit upstream transactions. CI runs the offline tests, reproduces the browser build, and audits production dependencies.

The Sites deployment uses a Cloudflare compatible Worker and a logical D1 binding named `DB`. `drizzle/` contains the schema migration. Sites provisions and applies the deployment resources. The Worker serves bundled assets, validates signed orders, reads onchain state, and indexes submitted receipt hashes. Shared fill history contains receipts indexed by this app; it is not a complete chain indexer. Order data and wallet addresses are public. Request budgets, body limits, per maker order limits, and storage bounds constrain abuse. Read RPC availability remains a service dependency.

Authored UI assets live in `dist/`. Wallet and protocol source lives in `src/`. `build.mjs` and `scripts/build-worker.mjs` produce the browser bundle, Worker, and migration artifacts. `scripts/build-lab.mjs` produces the isolated test profile. Generated state is ignored by Git. Never commit RPC credentials, cookies, session capabilities, or private keys.

## References

Protocol fields and functions: [0x orders](https://docs.0xprotocol.org/en/latest/basics/orders.html), [0x settlement functions](https://docs.0xprotocol.org/en/latest/basics/functions.html), [0x deployments](https://github.com/0xProject/protocol/blob/development/packages/contract-addresses/addresses.json), and [0x proxy governance](https://docs.0xprotocol.org/en/latest/architecture/proxy.html).

Swap contracts and token behavior: [Uniswap Ethereum deployments](https://developers.uniswap.org/docs/protocols/v3/deployments/v3-ethereum-deployments), [SwapRouter interface](https://github.com/Uniswap/v3-periphery/blob/main/contracts/interfaces/ISwapRouter.sol), and [Tether integration guidance](https://tether.to/en/supported-protocols/).

The educational simulator was inspired by [Brian Nigito’s How to Build an Exchange](https://www.janestreet.com/tech-talks/building-an-exchange/). Neon has no affiliation with Jane Street and does not claim its distributed architecture or performance.
