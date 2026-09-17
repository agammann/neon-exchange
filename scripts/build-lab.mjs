import {build} from 'esbuild';import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
await mkdir('.lab/dist',{recursive:true});
for(const f of ['style.css','app.js','engine.js'])await copyFile('dist/'+f,'.lab/dist/'+f);
let html=await readFile('dist/index.html','utf8');html=html.replace('<title>Neon Exchange | ETH / USDT</title>','<title>Neon Exchange | Local Testnet</title>').replace('ETHEREUM MAINNET / DIRECT SETTLEMENT','LOCAL TESTNET / DIRECT SETTLEMENT');
await writeFile('.lab/dist/index.html',html);
await build({entryPoints:['src/lab-entry.js'],bundle:true,format:'esm',target:'es2022',define:{__NEON_LAB__:'true'},outfile:'.lab/dist/wallet.bundle.js'});
await build({entryPoints:['src/settlement.js'],bundle:true,platform:'node',format:'esm',packages:'external',define:{__NEON_LAB__:'true'},outfile:'.lab/settlement.mjs'});
console.log('Local testnet bundle built separately from the public mainnet build.');
