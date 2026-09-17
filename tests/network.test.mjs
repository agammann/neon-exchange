import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {assertNetwork,buildSwap} from '../src/settlement.js';
const fake=chainId=>({getNetwork:async()=>({chainId})});
test('production settlement refuses the lab network',async()=>{await assertNetwork(fake(1n));await assert.rejects(assertNetwork(fake(31337n)));});
test('lab compilation targets only chain 31337 and refuses mainnet',async()=>{const r=await build({entryPoints:['src/settlement.js'],bundle:true,platform:'node',format:'esm',write:false,define:{__NEON_LAB__:'true'}});const lab=await import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));await lab.assertNetwork(fake(31337n));await assert.rejects(lab.assertNetwork(fake(1n)));const args={direction:'sell',account:'0x1111111111111111111111111111111111111111',amountIn:1000n,amountOut:900n,fee:500,slippageBps:50,quotedAt:Date.now()};assert.equal(lab.buildSwap(args).chainId,31337);assert.equal(buildSwap(args).chainId,1);});
test('public wallet bundle contains no test wallet or local signing service',async()=>{const r=await build({entryPoints:['src/orders-ui.js'],bundle:true,minify:true,format:'esm',write:false,define:{__NEON_LAB__:'false'}});const code=r.outputFiles[0].text;for(const marker of ['Neon disposable test wallet','/lab/rpc','/lab/session','127.0.0.1:4319','LOCAL TESTNET'])assert.equal(code.includes(marker),false,marker);assert.ok(code.includes('Ethereum Mainnet'));});
