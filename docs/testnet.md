# Local testnet walkthrough

[Back to Neon](../README.md) · [Troubleshooting](troubleshooting.md)

This example uses disposable funds on **chain 31337**. Its fixed price is a test fixture, not a suggested market price. Perform it only on the page marked **LOCAL TESTNET · NO REAL FUNDS**.

## Start the lab

Complete the [installation steps](../README.md#interactive-local-testnet), then run `pnpm testnet` from the repository root.

Wait for `Test lab ready: http://127.0.0.1:4319`. Open `http://127.0.0.1:4319/` in two tabs on the same computer. Keep the server terminal open.

In the first tab, select **Alice** under **Test participant** and click **Connect wallet**. In the second tab, select **Bob** and connect. Each tab has its own participant selection. Both wallets start with test ETH and USDT obtained through swaps inside the fork; the USDT amount varies with the copied market state.

## Alice posts an order

1. In Alice's tab, enter `0.002` in **ETH amount** and click **Wrap ETH to WETH**. Choose **Confirm test transaction** in the local dialog. Wait for a confirmed receipt and `0.002 WETH` in the wallet display.
2. Under **Place a limit order**, choose **Sell WETH**, quantity `0.002`, price `2000`, and expiry **1 hour**. The total is **4 test USDT**.
3. Click **Prepare exact allowance**. Confirm the approval for **0.002 WETH** to the 0x spender and wait for confirmation.
4. Click **Review and sign order** and confirm the local signature. Signing publishes an order; it is not an onchain transaction.
5. Click **Refresh book** in Bob's tab. Expect a sell order at **2000 USDT per WETH** with **0.002 WETH** available.

To check rejection handling, choose **Reject test transaction** on the first signing attempt. No order should appear. Repeat **Review and sign order** and confirm when ready.

## Bob fills half

1. In Bob's tab, click **Select** on Alice's order.
2. Set **Fill quantity WETH** to `0.001`. The preview should say Bob pays **2 USDT** and receives **0.001 WETH**, plus gas.
3. Click **Prepare fill allowance**, confirm **2 USDT**, and wait for confirmation.
4. Click **Review and fill order**, confirm the local transaction, and wait for its successful receipt.
5. Refresh Alice's book. **0.001 WETH** should remain available. Alice has received **2 USDT**, Bob holds **0.001 WETH**, and Bob's exact USDT allowance has been consumed.

## Cancel and clean up

1. Alice clicks **Cancel order** under **Your orders**, confirms, and waits for **Cancelled**.
2. Bob's previously selected order may still be in the fill panel. Attempting **Review and fill order** should now report that the order changed or lacks sufficient funds before submitting any transaction.
3. Alice clicks **Revoke 0x WETH**, confirms, and waits for a zero WETH allowance.
4. Bob enters `0.001` in **ETH amount**, clicks **Unwrap WETH to ETH**, confirms, and waits. His WETH balance returns to zero.

## Expected results

| Check | Expected result for this fresh lab session |
| --- | --- |
| Submitted transactions | 7 successful receipts: wrap, two approvals, fill, cancellation, revocation, unwrap |
| Alice's USDT change | +2 USDT |
| Bob's USDT change | −2 USDT |
| Alice's final WETH | 0.001 WETH |
| Bob's final WETH | 0 WETH |
| Both users' 0x allowances | 0 USDT and 0 WETH |
| Alice's order | Cancelled after a partial fill |
| Shared fill history | One indexed fill, with finality explicitly not checked |

ETH balances also include gas paid inside the fork. **Transactions in this tab** links to local receipts. These hashes have no mainnet monetary significance. [Recorded evidence](../validation/release-testnet.json) shows this workflow from release verification.

## Also try instant swaps

In **Instant ETH / USDT swaps**, choose **Sell ETH for USDT**, enter a small test amount, and click **Get quote**. Review the minimum received, choose **Review swap in wallet**, and confirm the disposable transaction.

For the reverse direction, choose **Buy ETH with USDT**, obtain a quote, approve the exact USDT when needed, and get a fresh quote before confirming the swap. Additional swaps change the seven transaction count above.

## Reset and network isolation

Press **Ctrl+C** to stop the lab. Run `pnpm testnet` again and reload both tabs for fresh wallets and an empty book. The database is in memory. Generated files under `.lab/` are ignored by Git, not a durable wallet backup.

The fork uses deployed contracts' addresses and copied state. The copied 0x contract retains its immutable mainnet signing domain, while local wallet execution requires chain 31337. Disposable keys are held only in process memory. The production bundle excludes the test signer, and the public server requires chain 1. Never use these disposable accounts for real funds.
