import {checkReadiness} from '../src/readiness.js';
import {handleOrderApi} from '../src/order-api.js';import {localDB} from '../scripts/local-db.mjs';
import {test} from 'node:test';import assert from 'node:assert/strict';import ganache from 'ganache';import {BrowserProvider,Wallet,Contract,parseEther,parseUnits} from 'ethers';
import {ADDRESSES,TOKEN_ABI,quoteSwap,buildSwap} from '../src/settlement.js';
import {EXCHANGE,WETH_ABI,ORDER_DOMAIN,ORDER_TYPES,createOrder,orderHash,readOrderState,verifyExchange,fillRequest,cancelRequest,validateSignedOrder} from '../src/orders.js';
test('real 0x fork: Alice and Bob partially fill, complete, reject replay, and cancel signed limit orders',async()=>{
 const fork=ganache.provider({fork:{url:process.env.ETHEREUM_RPC_URL||'https://ethereum-rpc.publicnode.com'},chain:{chainId:1},wallet:{totalAccounts:2,defaultBalance:100},logging:{quiet:true}}),p=new BrowserProvider(fork);p.pollingInterval=100;
 try{const accounts=await p.send('eth_accounts',[]),alice=await p.getSigner(0),bob=await p.getSigner(1),signer=new Wallet(fork.getInitialAccounts()[accounts[0]].secretKey);const c=await verifyExchange(p),weth=new Contract(ADDRESSES.WETH,WETH_ABI,alice),usdt=new Contract(ADDRESSES.USDT,TOKEN_ABI,p);
 await(await weth.deposit({value:parseEther('0.03')})).wait();await(await weth.approve(EXCHANGE,parseEther('0.03'))).wait();
 const q=await quoteSwap(p,{direction:'sell',amountIn:parseEther('0.1')}),swap=buildSwap({...q,account:accounts[1],slippageBps:100});await(await bob.sendTransaction({to:swap.to,data:swap.data,value:swap.value,gasLimit:500000n})).wait();await(await usdt.connect(bob).approve(EXCHANGE,parseUnits('100',6))).wait();
 const order=createOrder({side:'sell',maker:accounts[0],quantity:'0.010',price:'2000.00',minutes:60,salt:123n});assert.equal(await c.getLimitOrderHash(order),orderHash(order));
 const payload={chainId:1,order,signature:await signer.signTypedData(ORDER_DOMAIN,ORDER_TYPES,order)};validateSignedOrder(payload);const db=localDB(':memory:');const api=(path,body)=>handleOrderApi(new Request('http://localhost'+path,body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{}),{DB:db},p);assert.equal((await api('/api/orders',{...payload,signature:'0x'+'00'.repeat(65)})).status,400);assert.equal((await api('/api/orders',payload)).status,201);assert.equal((await(await api('/api/orders')).json()).orders.length,1);assert.equal((await readOrderState(p,payload)).fillable,20000000n);
 const initialA=await usdt.balanceOf(accounts[0]);const receipt=await(await bob.sendTransaction({...fillRequest(payload,accounts[1],10000000n),gasLimit:500000n})).wait();assert.equal(receipt.status,1);assert.equal((await(await api('/api/receipts',{hash:receipt.hash})).json()).recorded,1);assert.equal((await(await api('/api/orders')).json()).trades.length,1);assert.equal(await usdt.balanceOf(accounts[0]),initialA+10000000n);assert.equal(await weth.balanceOf(accounts[1]),parseEther('0.005'));
 assert.equal((await(await api('/api/receipts',{hash:receipt.hash})).json()).recorded,0);
 assert.equal((await(await api('/api/receipts',{hash:receipt.hash.toUpperCase()})).json()).recorded,0);
 let state=await readOrderState(p,payload);assert.equal(state.status,1);assert.equal(state.filled,10000000n);assert.equal(state.fillable,10000000n);
 await(await bob.sendTransaction({...fillRequest(payload,accounts[1],10000000n),gasLimit:500000n})).wait();assert.equal((await readOrderState(p,payload)).status,2);assert.equal((await(await api('/api/orders')).json()).orders.length,0);
 await assert.rejects(p.call({...fillRequest(payload,accounts[1],1000000n),from:accounts[1]}));
 assert.equal((await checkReadiness(p)).chainId,1);
 // Neither an allowance nor a signature alone can move the maker's funds.
 const guarded={chainId:1,order:{...order,salt:'125'}};
 guarded.signature=await signer.signTypedData(ORDER_DOMAIN,ORDER_TYPES,guarded.order);
 await(await weth.approve(EXCHANGE,0n)).wait();
 assert.equal((await readOrderState(p,guarded)).fillable,0n);
 assert.equal((await api('/api/orders',guarded)).status,400);
 await assert.rejects(p.call({...fillRequest(guarded,accounts[1],1000000n),from:accounts[1]}));
 await(await weth.approve(EXCHANGE,parseEther('0.01'))).wait();
 assert.equal((await api('/api/orders',guarded)).status,201);
 const snapshot=await fork.request({method:'evm_snapshot',params:[]});
 await(await bob.sendTransaction({...fillRequest(guarded,accounts[1],20000000n),gasLimit:500000n})).wait().then(async r=>{assert.equal((await api('/api/receipts',{hash:r.hash})).status,200);});
 assert.equal((await(await api('/api/orders')).json()).orders.length,0);
 await fork.request({method:'evm_revert',params:[snapshot]});
 // Avoid the provider's 250 ms request cache when verifying changed chain state.
 await new Promise(resolve=>setTimeout(resolve,300));
 const recovered=await(await api('/api/orders')).json();
 assert.ok(recovered.orders.some(o=>o.hash===orderHash(guarded.order)));
 assert.equal(recovered.trades.length,1);
 const cancelSnapshot=await fork.request({method:'evm_snapshot',params:[]});
 await(await alice.sendTransaction({...cancelRequest(guarded.order,accounts[0]),gasLimit:200000n})).wait();
 assert.ok(!(await(await api('/api/orders')).json()).orders.some(o=>o.hash===orderHash(guarded.order)));
 await fork.request({method:'evm_revert',params:[cancelSnapshot]});
 await new Promise(resolve=>setTimeout(resolve,300));
 assert.ok((await(await api('/api/orders')).json()).orders.some(o=>o.hash===orderHash(guarded.order)));
 // Expiry is enforced by the actual contract, independently of the database.
 const expiring={chainId:1,order:{...order,salt:'126',expiry:String(Math.floor(Date.now()/1000)+30)}};
 expiring.signature=await signer.signTypedData(ORDER_DOMAIN,ORDER_TYPES,expiring.order);
 await fork.request({method:'evm_increaseTime',params:[60]});await fork.request({method:'evm_mine',params:[]});
 assert.equal((await readOrderState(p,expiring)).status,4);
 await assert.rejects(p.call({...fillRequest(expiring,accounts[1],1000000n),from:accounts[1]}));
 db.close();
 const second={chainId:1,order:{...order,salt:'124'}};second.signature=await signer.signTypedData(ORDER_DOMAIN,ORDER_TYPES,second.order);await(await alice.sendTransaction({...cancelRequest(second.order,accounts[0]),gasLimit:200000n})).wait();assert.equal((await readOrderState(p,second)).status,3);await assert.rejects(p.call({...fillRequest(second,accounts[1],1000000n),from:accounts[1]}));assert.throws(()=>validateSignedOrder({...payload,order:{...order,takerAmount:'1'}}));
 console.log(JSON.stringify({chain:'local mainnet fork',orderHash:orderHash(order),aliceReceivedUSDT:String((await usdt.balanceOf(accounts[0]))-initialA),bobReceivedWETH:String(await weth.balanceOf(accounts[1])),partialFill:true,replayRejected:true,cancellationVerified:true,revocationVerified:true,expiryVerified:true,reorgRecoveryVerified:true,receiptDeduplicationVerified:true,realFundsSpent:false}));
 }finally{p.destroy();await fork.disconnect();}
});
