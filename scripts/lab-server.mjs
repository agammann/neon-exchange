import {Readable} from 'node:stream';import {localDB} from './local-db.mjs';import {handleOrderApi} from '../.lab/order-api.mjs';import {EXCHANGE,ORDER_DOMAIN,ORDER_TYPES,validateOrder,orderHash} from '../.lab/orders.mjs';import {Wallet,TypedDataEncoder} from 'ethers';
import {createServer} from 'node:http';import {readFile,writeFile} from 'node:fs/promises';import {randomBytes} from 'node:crypto';import ganache from 'ganache';import {BrowserProvider,Contract,parseEther} from 'ethers';
import {ADDRESSES,TOKEN_ABI,verifyContracts,quoteSwap,buildSwap} from '../.lab/settlement.mjs';
const origin='http://127.0.0.1:4319',capability=randomBytes(32).toString('hex');
const rpcURL=process.env.ETHEREUM_RPC_URL||'https://ethereum-rpc.publicnode.com';
const fork=ganache.provider({fork:{url:rpcURL},chain:{chainId:31337},miner:{blockTime:1},wallet:{totalAccounts:2,defaultBalance:100},logging:{quiet:true}});
const provider=new BrowserProvider(fork);provider.pollingInterval=250;
const accounts=(await provider.send('eth_accounts',[])).map(a=>a.toLowerCase());await verifyContracts(provider);
const db=localDB(':memory:');const transactions=[];await writeFile('.lab/transactions.json','[]');const token=new Contract(ADDRESSES.USDT,TOKEN_ABI,provider);
// Fund both disposable accounts using swaps in the fork, never mainnet submissions.
for(let i=0;i<2;i++){const signer=await provider.getSigner(i),q=await quoteSwap(provider,{direction:'sell',amountIn:parseEther('0.1')});const tx=buildSwap({...q,account:accounts[i],slippageBps:100});const receipt=await(await signer.sendTransaction({to:tx.to,data:tx.data,value:tx.value,chainId:31337,gasLimit:500000n})).wait();if(receipt.status!==1)throw Error('Unable to seed the test wallet.');}
const initialBalances=await Promise.all(accounts.map(async(account,i)=>({participant:i?'Bob':'Alice',account,ethWei:String(await provider.getBalance(account,'latest')),usdtUnits:String(await token.balanceOf(account))})));
const forkBlock=await provider.getBlockNumber();await writeFile('.lab/session-evidence.json',JSON.stringify({chainId:31337,forkBlock,initialBalances,realFundsSpent:false},null,2));
const allowed=new Set(['eth_signTypedData_v4','eth_chainId','net_version','eth_accounts','eth_blockNumber','eth_getBlockByNumber','eth_getBlockByHash','eth_getBalance','eth_call','eth_estimateGas','eth_gasPrice','eth_maxPriorityFeePerGas','eth_getTransactionCount','eth_getTransactionReceipt','eth_getTransactionByHash','eth_getCode','eth_getLogs','eth_sendTransaction','eth_feeHistory']);
const assets={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/engine.js':'engine.js','/style.css':'style.css','/wallet.bundle.js':'wallet.bundle.js'};
const json=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(data,(_,v)=>typeof v==='bigint'?String(v):v));};
const server=createServer(async(req,res)=>{try{
 if(req.headers.host!=='127.0.0.1:4319'){json(res,403,{error:{message:'Local lab origin required'}});return;}
 const pathname=new URL(req.url,origin).pathname;
 if(pathname.startsWith('/api/')){const request=new Request(origin+req.url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Readable.toWeb(req),duplex:'half'}:{})});const response=await handleOrderApi(request,{DB:db},provider);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;}
 if(pathname==='/lab/session'&&req.method==='GET'){json(res,200,{accounts,capability,chainId:31337,forkBlock});return;}
 if(/^\/lab\/tx\/0x[a-fA-F0-9]{64}$/.test(pathname)){json(res,200,await fork.request({method:'eth_getTransactionReceipt',params:[pathname.split('/').at(-1)]}));return;}
 if(pathname==='/lab/rpc'){
  if(req.method!=='POST'||req.headers.origin!==origin||req.headers['x-neon-lab']!==capability){json(res,403,{error:{message:'Local test wallet request required'}});return;}
  let body='';for await(const part of req){body+=part;if(body.length>65536){json(res,413,{error:{message:'Request too large'}});return;}}
  const {method,params=[]}=JSON.parse(body);if(!allowed.has(method))throw Error('Unsupported test RPC method');
  if(method==='eth_sendTransaction'){const tx=params[0];if(!accounts.includes(tx.from.toLowerCase())||![ADDRESSES.ROUTER.toLowerCase(),ADDRESSES.USDT.toLowerCase(),ADDRESSES.WETH.toLowerCase(),EXCHANGE.toLowerCase()].includes(tx.to?.toLowerCase())||Number(tx.chainId)!==31337)throw Error('Only local test account swaps and token approvals are allowed');}
  let result;if(method==='eth_signTypedData_v4'){const address=params[0]?.toLowerCase();if(!accounts.includes(address))throw Error('Disposable test account required');const data=typeof params[1]==='string'?JSON.parse(params[1]):params[1];validateOrder(data.message);const {EIP712Domain,...types}=data.types;if(TypedDataEncoder.hash(data.domain,types,data.message)!==orderHash(data.message))throw Error('Only canonical Neon test orders can be signed');result=await new Wallet(fork.getInitialAccounts()[address].secretKey).signTypedData(ORDER_DOMAIN,ORDER_TYPES,data.message);}else result=await fork.request({method,params});
  if(method==='eth_sendTransaction'){transactions.push({hash:result,request:params[0],receipt:await fork.request({method:'eth_getTransactionReceipt',params:[result]})});await writeFile('.lab/transactions.json',JSON.stringify(transactions,null,2));}
  if(method==='eth_getTransactionReceipt'&&result){const entry=transactions.find(t=>t.hash===params[0]);if(entry&&!entry.receipt){entry.receipt=result;await writeFile('.lab/transactions.json',JSON.stringify(transactions,null,2));}}
  json(res,200,{result});return;
 }
 if(req.method!=='GET'||!assets[pathname]){res.writeHead(404);res.end('Not found');return;}
 const file=assets[pathname],data=await readFile('.lab/dist/'+file);res.writeHead(200,{'content-type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css':'text/javascript','cache-control':'no-store'});res.end(data);
 }catch(e){json(res,400,{error:{message:e.shortMessage||e.message,code:e.code||-32000}});}});
server.listen(4319,'127.0.0.1',()=>console.log('Test lab ready: '+origin+' · chain 31337 · disposable Alice and Bob wallets'));
process.on('SIGINT',async()=>{server.close();await fork.disconnect();process.exit(0);});
