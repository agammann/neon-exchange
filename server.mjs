import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const files={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/engine.js':'engine.js','/style.css':'style.css','/wallet.bundle.js':'wallet.bundle.js'};
createServer(async(req,res)=>{const file=files[new URL(req.url,'http://localhost').pathname];if(!file){res.writeHead(404);res.end('Not found');return;}try{const data=await readFile(new URL('./dist/'+file,import.meta.url));res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css':'text/javascript','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(500);res.end('Unable to serve app');}}).listen(4318,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4318'));
