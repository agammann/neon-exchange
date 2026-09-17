import assets from '../.build/assets.mjs';
import {handleOrderApi} from './order-api.js';
export default {async fetch(request,env){const url=new URL(request.url);if(url.pathname.startsWith('/api/'))return handleOrderApi(request,env);const asset=assets[url.pathname==='/'?'/index.html':url.pathname];if(request.method!=='GET'||!asset)return new Response('Not found',{status:404});return new Response(asset.body,{headers:{'content-type':asset.type,'cache-control':'no-cache','x-content-type-options':'nosniff'}});}};
