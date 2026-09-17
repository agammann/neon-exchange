import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkReadiness} from '../src/readiness.js';
import {handleOrderApi} from '../src/order-api.js';
import {localDB} from '../scripts/local-db.mjs';

test('readiness fails closed on stale or missing Ethereum blocks',async()=>{
  for(const block of [null,{timestamp:1}])await assert.rejects(checkReadiness({getBlock:async()=>block}),/stale/);
});
test('storage health remains distinct from unavailable settlement readiness',async()=>{
  const db=localDB(':memory:');
  try {
    const provider={getBlock:async()=>null};
    const health=await handleOrderApi(new Request('http://localhost/api/health'),{DB:db},provider);
    assert.equal(health.status,200);
    const readiness=await handleOrderApi(new Request('http://localhost/api/readiness'),{DB:db},provider);
    assert.equal(readiness.status,503);
    assert.equal((await readiness.json()).ready,false);
  } finally {db.close();}
});
