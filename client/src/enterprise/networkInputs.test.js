import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleCsv,parseFlows,flowFields} from './networkInputs.js';
test('numeric CSV samples round-trip and malformed or oversized batches fail',()=>{
 const rows=parseFlows(sampleCsv());assert.equal(rows.length,3);assert.equal(rows[1].Flow_Packets_s,1700);
 assert.deepEqual(Object.keys(rows[0]),flowFields);
 for(const value of ['x,y\n1,2',sampleCsv().replace('1700','NaN'),sampleCsv().replace('1700','-1'),sampleCsv().replace('1700',''),sampleCsv().split('\n')[0]+'\n'+Array(101).fill(sampleCsv().split('\n')[1]).join('\n')])assert.throws(()=>parseFlows(value));
});
