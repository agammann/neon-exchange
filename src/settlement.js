import {Interface,Contract,getAddress,parseUnits,formatUnits} from 'ethers';
import {CHAIN_ID,NETWORK_NAME} from './network.js';
// Reviewed against official Tether and Uniswap deployment references. No remote configuration.
export const ADDRESSES=Object.freeze({USDT:'0xdAC17F958D2ee523a2206206994597C13D831ec7',WETH:'0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',ROUTER:'0xE592427A0AEce92De3Edee1F18E0157C05861564',QUOTER:'0x61fFE014bA17989E743c5F6cB21bF9697530B21e',FACTORY:'0x1F98431c8aD98523631AE4a59f267346ea31F984'});
export const TOKEN_ABI=['function balanceOf(address) view returns(uint256)','function allowance(address,address) view returns(uint256)','function approve(address,uint256)','function decimals() view returns(uint8)'];
export const ROUTER_ABI=['function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns(uint256)','function multicall(bytes[]) payable returns(bytes[])','function unwrapWETH9(uint256,address) payable','function refundETH() payable','function WETH9() view returns(address)','function factory() view returns(address)'];
export const QUOTER_ABI=['function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96)) returns(uint256 amountOut,uint160 sqrtPriceX96After,uint32 initializedTicksCrossed,uint256 gasEstimate)'];
export const FEES=Object.freeze([500,3000,10000]);
const routerInterface=new Interface(ROUTER_ABI);
export function parseAmount(value,direction){if(!['buy','sell'].includes(direction))throw Error('Choose buy or sell.');const decimals=direction==='sell'?18:6;if(typeof value!=='string'||value.length>80||!/^\d+(\.\d+)?$/.test(value))throw Error('Enter a positive decimal amount.');let amount;try{amount=parseUnits(value,decimals);}catch{throw Error(`Use at most ${decimals} decimal places.`);}if(amount<=0n||amount>parseUnits(direction==='sell'?'1000':'1000000',decimals))throw Error('Amount is outside the supported range.');return amount;}
export function minimumOutput(amount,slippageBps){if(typeof amount!=='bigint'||amount<=0n||![10,50,100].includes(slippageBps))throw Error('Invalid quote or slippage.');const minimum=amount*BigInt(10000-slippageBps)/10000n;if(minimum===0n)throw Error('Trade amount is too small.');return minimum;}
export function buildSwap({direction,account,amountIn,amountOut,fee,slippageBps,quotedAt,now=Date.now(),deadline=Math.floor(now/1000)+180}){
  if(!['buy','sell'].includes(direction)||!FEES.includes(fee))throw Error('Unsupported trade route.');
  if(!Number.isSafeInteger(quotedAt)||quotedAt>now||now-quotedAt>30000)throw Error('Quote expired. Get a new quote.');
  if(!Number.isSafeInteger(deadline)||deadline<=Math.floor(now/1000)||deadline>Math.floor(now/1000)+300)throw Error('Invalid deadline.');
  if(typeof amountIn!=='bigint'||amountIn<=0n)throw Error('Invalid input amount.');
  const recipient=getAddress(account);if(recipient==='0x0000000000000000000000000000000000000000')throw Error('Invalid wallet.');
  const minimum=minimumOutput(amountOut,slippageBps);const selling=direction==='sell';
  const params={tokenIn:selling?ADDRESSES.WETH:ADDRESSES.USDT,tokenOut:selling?ADDRESSES.USDT:ADDRESSES.WETH,fee,recipient:selling?recipient:ADDRESSES.ROUTER,deadline,amountIn,amountOutMinimum:minimum,sqrtPriceLimitX96:0n};
  const calls=[routerInterface.encodeFunctionData('exactInputSingle',[params])];
  if(!selling)calls.push(routerInterface.encodeFunctionData('unwrapWETH9',[minimum,recipient]));
  if(selling)calls.push(routerInterface.encodeFunctionData('refundETH'));
  return {to:ADDRESSES.ROUTER,from:recipient,data:routerInterface.encodeFunctionData('multicall',[calls]),value:selling?amountIn:0n,chainId:CHAIN_ID,minimum,deadline};
}
export async function assertMainnet(provider){const network=await provider.getNetwork();if(network.chainId!==1n)throw Error('Select Ethereum Mainnet in your wallet. Other networks are not supported.');}
export async function assertNetwork(provider){const network=await provider.getNetwork();if(network.chainId!==BigInt(CHAIN_ID))throw Error(`Select ${NETWORK_NAME} in your wallet. Other networks are not supported.`);}
export async function verifyContracts(provider){await assertNetwork(provider);const router=new Contract(ADDRESSES.ROUTER,ROUTER_ABI,provider);const usdt=new Contract(ADDRESSES.USDT,TOKEN_ABI,provider);const [weth,factory,decimals,...code]=await Promise.all([router.WETH9(),router.factory(),usdt.decimals(),...Object.values(ADDRESSES).map(a=>provider.getCode(a))]);if(getAddress(weth)!==ADDRESSES.WETH||getAddress(factory)!==ADDRESSES.FACTORY||decimals!==6n||code.some(c=>c==='0x'))throw Error('Contract identity check failed. Trading is unavailable.');}
export function priceImpactBps({direction,amountIn,amountOut,sqrtPrice,fee}){const square=sqrtPrice*sqrtPrice,Q=2n**192n;const afterFee=amountIn*BigInt(1000000-fee)/1000000n;const expected=direction==='sell'?afterFee*square/Q:afterFee*Q/square;if(expected<=0n)throw Error('Amount too small to quote.');return amountOut>=expected?0:Number((expected-amountOut)*10000n/expected);}
export async function quoteSwap(provider,{direction,amountIn}){
 await assertNetwork(provider);if(!['buy','sell'].includes(direction)||typeof amountIn!=='bigint'||amountIn<=0n)throw Error('Invalid quote request.');
 const q=new Contract(ADDRESSES.QUOTER,QUOTER_ABI,provider),factory=new Contract(ADDRESSES.FACTORY,['function getPool(address,address,uint24) view returns(address)'],provider);
 const block=await provider.getBlock('latest');if(!block||Math.abs(Date.now()/1000-block.timestamp)>180)throw Error('Ethereum data is stale. Try another wallet RPC.');
 const results=await Promise.allSettled(FEES.map(async fee=>{
  const args={tokenIn:direction==='sell'?ADDRESSES.WETH:ADDRESSES.USDT,tokenOut:direction==='sell'?ADDRESSES.USDT:ADDRESSES.WETH,amountIn,fee,sqrtPriceLimitX96:0n};
  const [r,pool]=await Promise.all([q.quoteExactInputSingle.staticCall(args,{blockTag:block.number}),factory.getPool(ADDRESSES.WETH,ADDRESSES.USDT,fee,{blockTag:block.number})]);
  const c=new Contract(pool,['function slot0() view returns(uint160 sqrtPriceX96,int24 tick,uint16 observationIndex,uint16 observationCardinality,uint16 observationCardinalityNext,uint8 feeProtocol,bool unlocked)'],provider);
  const slot=await c.slot0({blockTag:block.number});const impactBps=priceImpactBps({direction,amountIn,amountOut:r.amountOut,sqrtPrice:slot.sqrtPriceX96,fee});
  return {fee,amountOut:r.amountOut,impactBps};
 }));
 const choices=results.filter(r=>r.status==='fulfilled'&&r.value.amountOut>0n).map(r=>r.value).sort((a,b)=>a.amountOut>b.amountOut?-1:a.amountOut<b.amountOut?1:0);
 if(!choices.length)throw Error('No direct ETH / USDT quote is available. Your wallet RPC may not support quoting.');if(choices[0].impactBps>200)throw Error('Price impact exceeds 2%. Reduce the trade amount.');
 return {...choices[0],amountIn,direction,quotedAt:Date.now(),block:block.number};
}
export function formatAmount(value,decimals){return formatUnits(value,decimals);}
