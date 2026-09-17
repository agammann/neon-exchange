// Compiled only by build:lab. Never included in the hosted wallet bundle.
import {Interface,formatEther,formatUnits} from 'ethers';
import {ROUTER_ABI,TOKEN_ABI} from './settlement.js';
if(location.origin!=='http://127.0.0.1:4319')throw Error('The test wallet runs only on the local lab origin.');
const session=await(await fetch('/lab/session')).json();
let selected=0,pending=false;const listeners=new Map();
async function rpc(method,params=[]){const r=await fetch('/lab/rpc',{method:'POST',headers:{'content-type':'application/json','x-neon-lab':session.capability},body:JSON.stringify({method,params})});const j=await r.json();if(j.error){const e=Error(j.error.message);e.code=j.error.code;throw e;}return j.result;}
const bar=document.createElement('section');bar.className='lab-banner';bar.innerHTML='<strong>LOCAL TESTNET · NO REAL FUNDS</strong><span>Actual USDT and Uniswap code copied into a disposable Ethereum network.</span><label>Test participant <select id="lab-account"><option value="0">Alice</option><option value="1">Bob</option></select></label>';
document.querySelector('main').prepend(bar);
const modal=document.createElement('dialog');modal.id='lab-review';modal.innerHTML='<h2>Test wallet review</h2><p>Local testnet only. No real funds or external wallet.</p><pre id="lab-transaction"></pre><div><button id="lab-reject">Reject test transaction</button><button id="lab-confirm" class="primary">Confirm test transaction</button></div>';
document.body.append(modal);
function review(tx){return new Promise((resolve,reject)=>{let method='Unknown',details='';try{const abi=new Interface(ROUTER_ABI),parsed=abi.parseTransaction(tx);method=parsed?.name||method;if(method==='multicall'){const swap=abi.decodeFunctionData('exactInputSingle',parsed.args[0][0])[0];details=`\nInput units: ${swap.amountIn}\nMinimum output units: ${swap.amountOutMinimum}\nPool recipient: ${swap.recipient}\nDeadline: ${swap.deadline}`;}}catch{}try{const parsed=new Interface(TOKEN_ABI).parseTransaction(tx);method=parsed?.name||method;if(method==='approve')details=`\nSpender: ${parsed.args[0]}\nAllowance: ${formatUnits(parsed.args[1],6)} test USDT`;}catch{}document.getElementById('lab-transaction').textContent=`Participant: ${selected===0?'Alice':'Bob'}\nNetwork: 31337\nAction: ${method}\nTo: ${tx.to}\nValue: ${formatEther(tx.value||0)} test ETH\nFrom: ${tx.from}${details}`;modal.showModal();const done=accept=>{modal.close();if(accept)resolve();else{const e=Error('Test transaction rejected');e.code=4001;reject(e);}};document.getElementById('lab-confirm').onclick=()=>done(true);document.getElementById('lab-reject').onclick=()=>done(false);modal.oncancel=e=>{e.preventDefault();done(false);};});}
const testWallet={
 async request({method,params=[]}){if(method==='eth_requestAccounts'||method==='eth_accounts')return [session.accounts[selected]];if(method==='eth_sendTransaction'){if(pending)throw Error('A test transaction is already awaiting review.');pending=true;document.getElementById('lab-account').disabled=true;try{await review(params[0]);return await rpc(method,params);}finally{pending=false;document.getElementById('lab-account').disabled=false;}}return rpc(method,params);},
 on(event,fn){if(!listeners.has(event))listeners.set(event,new Set());listeners.get(event).add(fn);},
 removeListener(event,fn){listeners.get(event)?.delete(fn);}
};
document.getElementById('lab-account').onchange=e=>{selected=Number(e.target.value);for(const fn of listeners.get('accountsChanged')||[])fn([session.accounts[selected]]);};
const announce=()=>window.dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail:{info:{uuid:'neon-local-testnet',name:'Neon disposable test wallet'},provider:testWallet}}));
window.addEventListener('eip6963:requestProvider',announce);
document.querySelectorAll('.live-badge').forEach(e=>e.textContent='LOCAL TEST FUNDS · NO MONETARY VALUE');
document.querySelector('#wallet-surface .eyebrow').textContent='LOCAL TESTNET / CHAIN 31337';
document.querySelector('#wallet-history .empty').textContent='Transactions will link to receipts in this local test network.';

document.body.dataset.networkName='LOCAL TESTNET';
