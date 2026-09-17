# Neon Exchange validation

Status: deployed successfully at https://neon-exchange.alx21.chatgpt.site with public access. All five application assets returned HTTP 200 without credentials. The two app modules, stylesheet, and wallet bundle matched local SHA256 hashes. Sites transforms the HTML response; the rendered application was verified separately.

## Observed results

12 tests passed, 0 failed on September 17, 2026 UTC (September 16 Pacific). This includes five matching engine tests, six transaction construction and validation tests, and one Ethereum fork integration test.

The Ethereum fork at block 25,993,956 executed the real deployed Uniswap router and Tether bytecode locally. Selling 0.01 test ETH received 24.353445 USDT in that fork. The reverse trade returned native ETH to the same test account, and the exact USDT allowance became zero. Bob, the other ephemeral test account, received no funds from Alice’s trade. These are fork results, not a live quote, and no real funds were spent.

Browser checks covered the actual Bob and Alice partial fill, updated balances, transaction history, synthetic chart, visible Neon Exchange branding, wallet mode, disabled disconnected actions, and the no wallet error. Both modes fit a 390 pixel mobile viewport without horizontal page overflow. Browser console showed no errors during those checks.

WebMCP read and simulated placement tools registered. A valid placement updated visible balances and state. A self trade attempt returned an intentional error and did not change balances. These tools cannot connect a wallet, approve tokens, or execute real transactions.

## Limits

No real wallet transaction has been signed or submitted. Actual browser extension signature prompts, hardware wallets, replacement transactions, hosted browser wallet behavior, and mobile wallet compatibility are not fully verified. There is no independent security audit. Fork testing is strong integration evidence, not proof of production safety or universal compatibility. The simulator is tab local, not a persistent multiplayer matching service. Wallet mode swaps against Uniswap pools, not against Bob and Alice’s simulated book.

The source and deployed static output are intended to match. Build with the lockfile and inspect the recipient, router, token, value, minimum output, and deadline before signing any real transaction. Do not treat a successful website deployment as verification of real money trading.

Production dependency audit: no known vulnerabilities found. Actual user wallet signing remains unverified.



Read only mainnet verification: chain ID 1 and official contract references passed against Ethereum Mainnet at block 25,993,985. Both sell and buy quotes returned from mainnet pools. Zero transactions were submitted. GitHub Actions run 35171272352 completed successfully for the first published source revision.
