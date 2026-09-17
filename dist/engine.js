export class Exchange {
  constructor(){this.accounts={Bob:{cash:10000000000,asset:2000},Alice:{cash:10000000000,asset:2000}};this.orders=[];this.trades=[];this.events=[];this.sequence=0;this.orderId=0;}
  event(type,detail){this.events.push({sequence:++this.sequence,type,detail});}
  available(owner){const a=this.accounts[owner];if(!a)throw Error('Choose Bob or Alice.');let cash=a.cash,asset=a.asset;for(const o of this.orders.filter(o=>o.owner===owner&&o.remaining>0&&o.status==='open')){if(o.side==='buy')cash-=o.price*o.remaining*10;else asset-=o.remaining;}return {cash,asset};}
  place({owner,side,price,quantity}){
    if(!Object.hasOwn(this.accounts,owner)||!['buy','sell'].includes(side))throw Error('Choose a valid participant and side.');
    if(!Number.isSafeInteger(price)||price<1||price>10000000)throw Error('Price must be between $0.01 and $100,000.00.');
    if(!Number.isSafeInteger(quantity)||quantity<1||quantity>100000)throw Error('Quantity must be a quantity in milliETH between 1 and 100,000.');
    if(this.orders.length>=2000)throw Error('Session limit reached. Reset the demo to continue.');
    const funds=this.available(owner);if(side==='buy'&&price*quantity*10>funds.cash)throw Error('Insufficient available demo USDT. Cancel a reserved order or reduce the total.');if(side==='sell'&&quantity>funds.asset)throw Error('Insufficient available ETH. Cancel a reserved order or reduce the quantity.');
    const opposite=this.orders.filter(o=>o.status==='open'&&o.side!==side&&(side==='buy'?o.price<=price:o.price>=price)).sort((a,b)=>(side==='buy'?a.price-b.price:b.price-a.price)||a.id-b.id);
    // Reject the entire incoming instruction before mutation if it could meet its own resting order.
    let needed=quantity;for(const o of opposite){if(needed<=0)break;if(o.owner===owner)throw Error('Self trading is blocked. Cancel your crossing order first.');needed-=o.remaining;}
    const order={id:++this.orderId,owner,side,price,quantity,remaining:quantity,status:'open'};this.orders.push(order);this.event('accepted',`${owner} ${side} ${quantity/1000} ETH at ${(price/100).toFixed(2)} USDT`);
    for(const maker of opposite){if(!order.remaining)break;const qty=Math.min(maker.remaining,order.remaining),value=qty*maker.price*10,buyer=side==='buy'?owner:maker.owner,seller=side==='sell'?owner:maker.owner;
      this.accounts[buyer].cash-=value;this.accounts[buyer].asset+=qty;this.accounts[seller].cash+=value;this.accounts[seller].asset-=qty;maker.remaining-=qty;order.remaining-=qty;if(!maker.remaining)maker.status='filled';
      const trade={id:this.trades.length+1,buyer,seller,price:maker.price,quantity:qty,value,maker:maker.id,taker:order.id};this.trades.push(trade);this.event('trade',`${buyer} bought ${qty/1000} ETH from ${seller} at ${(maker.price/100).toFixed(2)} USDT`);
    }if(!order.remaining)order.status='filled';return order;
  }
  cancel(owner,id){const o=this.orders.find(o=>o.id===id);if(!o||o.owner!==owner||o.status!=='open')throw Error('Only the owner can cancel an open order.');o.status='cancelled';this.event('cancelled',`${owner} cancelled order ${id}; reserves released`);return o;}
  book(side){return this.orders.filter(o=>o.side===side&&o.status==='open').sort((a,b)=>(side==='buy'?b.price-a.price:a.price-b.price)||a.id-b.id);}
  snapshot(){return structuredClone({accounts:this.accounts,orders:this.orders,trades:this.trades,events:this.events,sequence:this.sequence});}
}
export function seeded(){const e=new Exchange();for(const [price,quantity] of [[325000,120],[325050,180],[325075,100],[325100,150],[325150,80]])e.place({owner:'Alice',side:'sell',price,quantity});for(const [price,quantity] of [[324975,100],[324950,160],[324925,80],[324900,120],[324850,60]])e.place({owner:'Bob',side:'buy',price,quantity});return e;}

