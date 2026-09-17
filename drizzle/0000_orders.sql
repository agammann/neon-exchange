CREATE TABLE orders (hash TEXT PRIMARY KEY NOT NULL, maker TEXT NOT NULL, side TEXT NOT NULL, payload TEXT NOT NULL, expiry INTEGER NOT NULL, created_at INTEGER NOT NULL, price_micros INTEGER NOT NULL, status INTEGER NOT NULL DEFAULT 1);
--> statement-breakpoint
CREATE INDEX orders_live ON orders(status,side,price_micros,created_at);
--> statement-breakpoint
CREATE INDEX orders_maker ON orders(maker,created_at);
--> statement-breakpoint
CREATE TABLE trades (tx_hash TEXT NOT NULL, log_index INTEGER NOT NULL, order_hash TEXT NOT NULL, maker TEXT NOT NULL, taker TEXT NOT NULL, maker_token TEXT NOT NULL, taker_token TEXT NOT NULL, maker_amount TEXT NOT NULL, taker_amount TEXT NOT NULL, block_number INTEGER NOT NULL, PRIMARY KEY(tx_hash,log_index));
--> statement-breakpoint
CREATE TABLE rate_limits (key TEXT PRIMARY KEY NOT NULL, minute INTEGER NOT NULL, hits INTEGER NOT NULL);
