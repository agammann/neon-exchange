import {Contract,Interface,Signature,TypedDataEncoder,verifyTypedData,getAddress,parseUnits,formatUnits,ZeroAddress,ZeroHash} from 'ethers';
import {ADDRESSES,TOKEN_ABI,assertNetwork} from './settlement.js';
import {CHAIN_ID} from './network.js';
export const EXCHANGE='0xDef1C0ded9bec7F1a1670819833240f027b25EfF';
// The fork retains the deployed protocol's immutable mainnet signing domain.
// Execution still requires the separately compiled chain ID; lab keys are disposable.
export const ORDER_DOMAIN=Object.freeze({name:'ZeroEx',version:'1.0.0',chainId:1,verifyingContract:EXCHANGE});
export const ORDER_TYPES={LimitOrder:[{name:'makerToken',type:'address'},{name:'takerToken',type:'address'},{name:'makerAmount',type:'uint128'},{name:'takerAmount',type:'uint128'},{name:'takerTokenFeeAmount',type:'uint128'},{name:'maker',type:'address'},{name:'taker',type:'address'},{name:'sender',type:'address'},{name:'feeRecipient',type:'address'},{name:'pool',type:'bytes32'},{name:'expiry',type:'uint64'},{name:'salt',type:'uint256'}]};
const tuple='(address makerToken,address takerToken,uint128 makerAmount,uint128 takerAmount,uint128 takerTokenFeeAmount,address maker,address taker,address sender,address feeRecipient,bytes32 pool,uint64 expiry,uint256 salt)';
const sigTuple='(uint8 signatureType,uint8 v,bytes32 r,bytes32 s)';
export const EXCHANGE_ABI=[`function getLimitOrderHash(${tuple} order) view returns(bytes32)`,`function getLimitOrderRelevantState(${tuple} order,${sigTuple} signature) view returns((bytes32 orderHash,uint8 status,uint128 takerTokenFilledAmount) orderInfo,uint128 actualFillableTakerTokenAmount,bool isSignatureValid)`,`function fillOrKillLimitOrder(${tuple} order,${sigTuple} signature,uint128 takerTokenFillAmount) payable returns(uint128 makerTokenFilledAmount)`,`function cancelLimitOrder(${tuple} order)`,`function getProtocolFeeMultiplier() view returns(uint32)`,`function owner() view returns(address)`,`event LimitOrderFilled(bytes32 orderHash,address maker,address taker,address feeRecipient,address makerToken,address takerToken,uint128 takerTokenFilledAmount,uint128 makerTokenFilledAmount,uint128 takerTokenFeeFilledAmount,uint256 protocolFeePaid,bytes32 pool)`];
export const WETH_ABI=[...TOKEN_ABI,'function deposit() payable','function withdraw(uint256)'];
export const exchangeInterface=new Interface(EXCHANGE_ABI);
export const orderHash=order=>TypedDataEncoder.hash(ORDER_DOMAIN,ORDER_TYPES,order);
export function orderSignature(signature){const s=Signature.from(signature);return {signatureType:2,v:s.v,r:s.r,s:s.s};}
const unit=(s,decimals,label)=>{if(typeof s!=='string'||s.length>40||!/^\d+(\.\d+)?$/.test(s))throw Error(`Enter a valid ${label}.`);try{return parseUnits(s,decimals);}catch{throw Error(`${label} supports at most ${decimals} decimal places.`);}};
export function createOrder({side,maker,quantity,price,minutes,salt,now=Math.floor(Date.now()/1000)}){
 if(!['buy','sell'].includes(side)||![15,60,1440,10080].includes(minutes))throw Error('Choose a supported side and expiry.');
 const eth=unit(quantity,3,'ETH quantity'),rate=unit(price,2,'USDT price');
 if(eth<1n||eth>100000n||rate<1n||rate>100000000n)throw Error('Order amount or price is outside supported limits.');
 const weth=eth*10n**15n,usdt=eth*rate*10n;
 if(usdt<1000000n||usdt>1000000000000n)throw Error('Order value must be between 1 and 1,000,000 USDT.');
 const order={makerToken:side==='sell'?ADDRESSES.WETH:ADDRESSES.USDT,takerToken:side==='sell'?ADDRESSES.USDT:ADDRESSES.WETH,makerAmount:String(side==='sell'?weth:usdt),takerAmount:String(side==='sell'?usdt:weth),takerTokenFeeAmount:'0',maker:getAddress(maker),taker:ZeroAddress,sender:ZeroAddress,feeRecipient:ZeroAddress,pool:ZeroHash,expiry:String(now+minutes*60),salt:String(salt)};
 validateOrder(order,{now});return order;
}
export function validateOrder(order,{now=Math.floor(Date.now()/1000),allowExpired=false}={}){
 if(!order||typeof order!=='object'||Object.keys(order).sort().join(',')!==ORDER_TYPES.LimitOrder.map(x=>x.name).sort().join(','))throw Error('Invalid order fields.');
 const isSell=getAddress(order.makerToken)===ADDRESSES.WETH&&getAddress(order.takerToken)===ADDRESSES.USDT,isBuy=getAddress(order.makerToken)===ADDRESSES.USDT&&getAddress(order.takerToken)===ADDRESSES.WETH;
 if(!isSell&&!isBuy)throw Error('Only WETH / USDT orders are supported.');
 for(const key of ['makerAmount','takerAmount','takerTokenFeeAmount','expiry','salt'])if(typeof order[key]!=='string'||!/^\d{1,78}$/.test(order[key]))throw Error('Invalid order units.');
 for(const key of ['makerAmount','takerAmount'])if(BigInt(order[key])<=0n||BigInt(order[key])>=2n**128n)throw Error('Invalid order size.');
 if(BigInt(order.salt)>=2n**256n||BigInt(order.expiry)>=2n**64n)throw Error('Invalid salt or expiry.');
 if(getAddress(order.maker)===ZeroAddress||['taker','sender','feeRecipient'].some(k=>order[k]!==ZeroAddress)||order.pool!==ZeroHash||order.takerTokenFeeAmount!=='0')throw Error('Restricted counterparties or extra fees are not supported.');
 const expiry=Number(order.expiry);if(!allowExpired&&(expiry<=now+15||expiry>now+604800))throw Error('Order expiry must be more than 15 seconds and at most 7 days away.');
 const weth=BigInt(isSell?order.makerAmount:order.takerAmount),usdt=BigInt(isSell?order.takerAmount:order.makerAmount);
 if(weth<10n**15n||weth>100n*10n**18n||usdt<10n**6n||usdt>10n**12n)throw Error('Unsupported order size.');
 return {side:isSell?'sell':'buy',weth,usdt,price:formatUnits(usdt*10n**18n/weth,6)};
}
export function validateSignedOrder(payload,options){if(!payload||payload.chainId!==CHAIN_ID||typeof payload.signature!=='string'||!/^0x[0-9a-fA-F]{130}$/.test(payload.signature))throw Error('Invalid signed order or execution network.');const info=validateOrder(payload.order,options);if(getAddress(verifyTypedData(ORDER_DOMAIN,ORDER_TYPES,payload.order,payload.signature))!==getAddress(payload.order.maker))throw Error('Order signature does not belong to its maker.');return {...info,hash:orderHash(payload.order)};}
export async function readOrderState(provider,payload){await assertNetwork(provider);validateSignedOrder(payload,{allowExpired:true});const c=new Contract(EXCHANGE,EXCHANGE_ABI,provider);const r=await c.getLimitOrderRelevantState(payload.order,orderSignature(payload.signature));if(r.orderInfo.orderHash!==orderHash(payload.order))throw Error('Settlement domain does not match the signed order.');return {status:Number(r.orderInfo.status),filled:r.orderInfo.takerTokenFilledAmount,fillable:r.actualFillableTakerTokenAmount,signatureValid:r.isSignatureValid};}
export async function verifyExchange(provider){await assertNetwork(provider);const c=new Contract(EXCHANGE,EXCHANGE_ABI,provider);const [code,multiplier]=await Promise.all([provider.getCode(EXCHANGE),c.getProtocolFeeMultiplier()]);if(code==='0x'||multiplier!==0n)throw Error('Limit order settlement is unavailable or its protocol fee changed.');return c;}
export function fillRequest(payload,account,takerAmount){validateSignedOrder(payload,{allowExpired:true});if(getAddress(account)===getAddress(payload.order.maker))throw Error('You cannot fill your own order.');if(typeof takerAmount!=='bigint'||takerAmount<=0n||takerAmount>BigInt(payload.order.takerAmount))throw Error('Invalid fill amount.');return {to:EXCHANGE,chainId:CHAIN_ID,value:0n,data:exchangeInterface.encodeFunctionData('fillOrKillLimitOrder',[payload.order,orderSignature(payload.signature),takerAmount])};}
export function cancelRequest(order,account){validateOrder(order,{allowExpired:true});if(getAddress(account)!==getAddress(order.maker))throw Error('Only the maker can cancel this order.');return {to:EXCHANGE,chainId:CHAIN_ID,value:0n,data:exchangeInterface.encodeFunctionData('cancelLimitOrder',[order])};}
