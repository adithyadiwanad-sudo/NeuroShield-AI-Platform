"""Smoke test a running deployment: python backend/smoke.py https://your-api"""
import asyncio
import json
import sys
import time
import httpx
import websockets

async def main():
    base=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8000').rstrip('/')
    async with httpx.AsyncClient(timeout=15) as client:
        health=(await client.get(base+'/api/health')).raise_for_status().json()
        assert health['service']=='neuroshield-fastapi'
        for kind,payload in [
            ('url',{'url':'http://paypa1.example/verify-account','demo':True}),
            ('text',{'text':'URGENT: bank account suspended. Enter your OTP immediately.','demo':True}),
            ('audio',{'metadata':{'spectralCentroid':4100,'spectralFlatness':.78,'pitchVariance':3.2,'durationSeconds':12},'transcript':'Wire funds immediately. Keep this confidential.','demo':True})]:
            response=(await client.post(base+'/api/scan-'+kind,json=payload)).raise_for_status().json()
            assert response['incident']['id'].startswith('INC-')
            print(json.dumps({'endpoint':kind,'risk':response['threatScore'],'modelProbability':response['smishingProbability'],'voiceLikelihood':response['syntheticVoiceLikelihood']}))
        async with websockets.connect(base.replace('http','ws',1)+'/ws/live-feed',open_timeout=10) as ws:
            ready=json.loads(await ws.recv());assert ready['type']=='ready'
            first=json.loads(await asyncio.wait_for(ws.recv(),6));start=time.perf_counter()
            second=json.loads(await asyncio.wait_for(ws.recv(),6));interval=time.perf_counter()-start
            assert first['incident']['id']!=second['incident']['id']
            assert 1.5<interval<4
            print(json.dumps({'websocket':'passed','observedIntervalSeconds':round(interval,3)}))
        public=(await client.post(base+'/api/scan-url',json={'url':'https://example.com'})).raise_for_status().json()
        print(json.dumps({'publicURL':'example.com','domainAgeDays':public['domainAgeDays'],'tls':public['sslStatus']}))

if __name__=='__main__':asyncio.run(main())
