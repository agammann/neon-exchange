import {build} from 'esbuild';
await build({entryPoints:['src/wallet.js'],bundle:true,minify:true,format:'esm',target:'es2022',outfile:'dist/wallet.bundle.js',legalComments:'eof'});
console.log('Wallet bundle built. Static terminal assets are authored in dist.');
