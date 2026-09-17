# Trading with Neon

[Back to Neon](../README.md) · [Practice with disposable funds](testnet.md) · [Troubleshooting](troubleshooting.md)

## Connect a wallet

Open [Neon](https://neon.alx21.chatgpt.site) in a browser with an Ethereum wallet extension or an injected wallet browser. Select **Ethereum Mainnet** in the wallet, choose the wallet in Neon, and click **Connect wallet**. This release uses injected wallet providers; it does not include a WalletConnect QR connection.

Check the displayed account and balances. ETH pays gas, including when the trade input is USDT or WETH. Neon never asks for a private key or seed phrase. Changing the wallet account or network disconnects the page and requires reconnecting.

## Instant ETH / USDT swaps

1. Find **Instant ETH / USDT swaps**. Choose **Sell ETH for USDT** or **Buy ETH with USDT**.
2. Enter the input amount and select **0.1%**, **0.5%**, or **1.0%** slippage.
3. Click **Get quote**. Review the expected output, minimum received, pool fee, price impact, and recipient.
4. For a USDT input, click **Approve exact USDT** if needed and confirm in your wallet. If an insufficient nonzero allowance exists, the first transaction resets it to zero. Obtain another quote and approve the required amount afterward.
5. Get a fresh quote after approval. Quotes expire after 30 seconds.
6. Click **Review swap in wallet**. Inspect the request and sign only if it matches your intent. Wait for its receipt under **Transactions in this tab**.

The app compares three direct Uniswap v3 pools and rejects estimated price impact above 2%. It does not search every exchange or guarantee the best market route. Buying ETH unwraps WETH atomically. Selling ETH returns USDT to the connected account.

## Publish a limit order

Limit orders trade **WETH / USDT**. Use **Wrap ETH to WETH** to obtain WETH for a sell order. The wrapped token stays in your wallet.

1. Choose **Sell WETH** or **Buy WETH**. Enter the WETH quantity and your limit price in USDT per WETH.
2. Choose **15 minutes**, **1 hour**, **1 day**, or **7 days** for expiry.
3. Click **Prepare exact allowance**. A sell approves WETH; a buy approves USDT. If an insufficient nonzero allowance must be reset, confirm the reset and click the button again to approve the desired amount.
4. Click **Review and sign order**. Review the typed order in your wallet. This signature authorizes later settlement at the specified quantities until expiry or confirmed cancellation.
5. Confirm that the order appears in **Your orders** and the shared book.

The form accepts WETH quantities to three decimal places and prices to two. Orders support 0.001 to 100 WETH and a total value of 1 to 1,000,000 USDT. Publishing requires sufficient balance and allowance. Open orders share those funds; they do not reserve separate balances.

The signature becomes public when published. Neon sets no order fee or fee recipient. Another trader must actively fill the order. Posting a crossing order does not trigger automatic matching.

## Fill someone else's order

1. Click **Refresh book**, then **Select** beside the desired order. You cannot fill your own order through this interface.
2. Enter **Fill quantity WETH** and review exactly what you pay and receive.
3. Click **Prepare fill allowance** and wait for the approval or reset to confirm.
4. Click **Review and fill order**, inspect the wallet request, and confirm it if correct.

Availability is rechecked before submission. Changed funds, allowances, expiry, cancellation, or a competing fill can make a transaction fail. Partial fills are supported, but each requested fill must execute in full or revert. A transaction that reaches the chain and reverts can still cost gas.

Use **Unwrap WETH to ETH** to convert purchased WETH to native ETH.

## Cancel orders and revoke permissions

**Cancel order** invalidates that order's remainder. **Revoke 0x USDT** and **Revoke 0x WETH** clear the corresponding limit order spender allowances. **Revoke USDT approval** in the swap panel clears the separate Uniswap allowance.

These transactions need gas and take effect only after confirmation. A fill can arrive before a pending cancellation. Revocation does not erase a signature: an unexpired, uncancelled order may become fillable again if funds and allowance return. Disconnecting or closing a tab does neither cancellation nor revocation.

## History and book behavior

Each page checks up to 20 bids and 20 asks. Unfunded or terminal entries can occupy slots until expiry, so use **Next page** where available. **Your orders** shows the latest 40 posted orders for the wallet.

**Confirmed fills** contains up to 30 recent receipt candidates indexed by this app, not every Ethereum trade. Receipts are rechecked and orphaned fills are suppressed. Finality is not checked. A confirmed wallet receipt remains authoritative if indexing is delayed. The current tab's transaction list clears on reload; blockchain records do not.

## Contracts and references

| Role | Fixed Ethereum Mainnet address |
| --- | --- |
| USDT | `0xdAC17F958D2ee523a2206206994597C13D831ec7` |
| WETH | `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` |
| Uniswap v3 SwapRouter | `0xE592427A0AEce92De3Edee1F18E0157C05861564` |
| 0x Exchange Proxy | `0xDef1C0ded9bec7F1a1670819833240f027b25EfF` |

The 0x protocol has its own upgrade governance. This integration requires its protocol fee multiplier to remain zero. Tether has issuer controls. Neon has no custody vault or operator withdrawal key, but website, wallet, protocol, and network risks remain. The release has no independent security audit; real money mainnet validation was intentionally skipped. See [Validation](../VALIDATION.md).

Primary references: [0x orders](https://docs.0xprotocol.org/en/latest/basics/orders.html), [0x settlement functions](https://docs.0xprotocol.org/en/latest/basics/functions.html), [0x deployments](https://github.com/0xProject/protocol/blob/development/packages/contract-addresses/addresses.json), [0x proxy governance](https://docs.0xprotocol.org/en/latest/architecture/proxy.html), [Uniswap Ethereum deployments](https://developers.uniswap.org/docs/protocols/v3/deployments/v3-ethereum-deployments), [SwapRouter interface](https://github.com/Uniswap/v3-periphery/blob/main/contracts/interfaces/ISwapRouter.sol), and [Tether integration guidance](https://tether.to/en/supported-protocols/).
