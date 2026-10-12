"""NeuroShield live transport and analysis API. Run one worker for the in-memory demo feed."""
from __future__ import annotations
import asyncio
from collections import OrderedDict
from contextlib import asynccontextmanager, suppress
from datetime import datetime, timezone
import itertools
import os
from pathlib import Path
import time
from typing import Annotated
import uuid
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator
try:
    from .analysis import TextModel, analyze_url, analyze_audio
    from .research import network_result, evaluate_examples
except ImportError:
    from analysis import TextModel, analyze_url, analyze_audio
    from research import network_result, evaluate_examples

INTERVAL = max(.05, float(os.getenv('FEED_INTERVAL_SECONDS','2.5')))
DEMO_FEED = os.getenv('DEMO_FEED_ENABLED','true').lower() == 'true'
MODEL_DIR = Path(os.getenv('MODEL_DIR',str(Path(__file__).parent/'models')))
ORIGINS = [o.strip() for o in os.getenv('CORS_ORIGINS','*').split(',') if o.strip()]

def utc(): return datetime.now(timezone.utc).isoformat()
def severity(score): return 'Critical' if score>=85 else 'High' if score>=65 else 'Medium' if score>=35 else 'Low' if score>0 else 'Safe'

def incident_from(result: dict, demo=False, scenario='scan') -> dict:
    stamp=utc(); score=result['score']
    return dict(id=f'INC-{uuid.uuid4().hex[:12].upper()}',title=result['title'],source=result['source'],score=score,threatScore=score,attackType=result['title'],severity=severity(score),timestamp=stamp,time=stamp[11:19]+' UTC',explanation=result['explanation'],signalType=result['signalType'],demo=demo,provenance='simulation' if demo else result['provenance'],features=result['features'],status='Open',phase='Scored',region='Unmapped',payload=result['payload'],scenario=scenario,autoManaged=False,actionTaken='Analyst review; enforcement disabled',history=[{'action':'Synthetic backend event' if demo else 'Backend analysis completed','timestamp':stamp}],entities=[])

SCENARIOS = [
 ('DDoS burst','Network flow','203.0.113.42',97,'Asia Pacific',[('SYN imbalance',45),('Request velocity',32),('Source concentration',20)]),
 ('Credential brute force','Authentication','192.0.2.12',92,'Europe',[('Failed login burst',42),('Request velocity',30),('Session deviation',20)]),
 ('Smishing payment lure','SMS','192.0.2.76',88,'North America',[('Urgency language',38),('Credential request',31),('External destination',19)]),
 ('Prompt instruction override','Prompt','198.51.100.24',91,'South America',[('Instruction override',43),('Data extraction cue',29),('Role impersonation',19)]),
 ('Baseline network flow','Network flow','198.51.100.18',0,'Europe',[]),
 ('Synthetic voice payment lure','Voice','203.0.113.91',94,'Asia Pacific',[('Urgency keywords',38),('Authority impersonation',24),('Illustrative voice variation',15)]),
]
def demo_incident(index: int) -> dict:
    title,signal,ip,score,region,features=SCENARIOS[index%len(SCENARIOS)]
    record=incident_from(dict(title=title,score=score,source=ip,explanation='Automatically generated backend demonstration event. Scores and attribution weights are illustrative; no network attack or enforcement was executed.',signalType=signal,payload=f'DEMO / {signal} / source={ip} / no real packet captured',provenance='simulation',features=[{'name':n,'impact':v} for n,v in features]),True,'live-demo')
    record.update(region=region,ip=ip,status='Contained' if score>=85 else 'Resolved',actionTaken='Containment simulated' if score>=85 else 'Baseline reviewed (demo)')
    record['history'].append({'action':record['actionTaken'],'timestamp':record['timestamp']})
    return record

class Broker:
    def __init__(self): self.clients: set[asyncio.Queue] = set(); self.dropped=0
    def publish(self, event):
        for queue in tuple(self.clients):
            if queue.full(): queue.get_nowait(); self.dropped+=1
            queue.put_nowait(event)

@asynccontextmanager
async def lifespan(app):
    app.state.broker=Broker(); app.state.text_model=await asyncio.to_thread(TextModel,MODEL_DIR)
    app.state.limits=OrderedDict(); app.state.analysis_slots=asyncio.Semaphore(12)
    async def generate():
        for index in itertools.count():
            await asyncio.sleep(INTERVAL)
            if app.state.broker.clients:
                app.state.broker.publish({'type':'incident','incident':demo_incident(index),'emittedAt':utc()})
    task=asyncio.create_task(generate()) if DEMO_FEED else None
    yield
    if task:
        task.cancel()
        with suppress(asyncio.CancelledError): await task

app=FastAPI(title='NeuroShield Live Prototype',version='2.1.0',lifespan=lifespan)

class BodyLimit:
    def __init__(self,app): self.app=app
    async def __call__(self,scope,receive,send):
        if scope['type']!='http' or scope['method'] not in ('POST','PUT','PATCH'):
            return await self.app(scope,receive,send)
        data=bytearray()
        while True:
            message=await receive()
            if message['type']=='http.disconnect': return
            data.extend(message.get('body',b''))
            if len(data)>65536:
                return await JSONResponse({'detail':'Request body exceeds 64 KiB'},status_code=413)(scope,receive,send)
            if not message.get('more_body'): break
        consumed=False
        async def replay():
            nonlocal consumed
            if consumed: return await receive()
            consumed=True
            return {'type':'http.request','body':bytes(data),'more_body':False}
        await self.app(scope,replay,send)
app.add_middleware(BodyLimit)
app.add_middleware(CORSMiddleware,allow_origins=ORIGINS,allow_credentials=False,allow_methods=['GET','POST','OPTIONS'],allow_headers=['Content-Type'])

class ScanInput(BaseModel):
    model_config=ConfigDict(extra='forbid',str_strip_whitespace=True,allow_inf_nan=False)
    demo: bool=False
class UrlInput(ScanInput):
    url: str=Field(min_length=1,max_length=2048)
class TextInput(ScanInput):
    text: str=Field(min_length=1,max_length=12000)
class NetworkFlow(BaseModel):
    model_config=ConfigDict(extra='forbid',allow_inf_nan=False)
    Destination_Port: int=Field(ge=0,le=65535)
    Flow_Duration: float=Field(ge=0,le=1e12)
    Total_Fwd_Packets: int=Field(ge=0,le=1000000000)
    Total_Bwd_Packets: int=Field(ge=0,le=1000000000)
    Flow_Bytes_s: float=Field(ge=0,le=1e12)
    Flow_Packets_s: float=Field(ge=0,le=1e9)
    SYN_Flag_Count: int=Field(ge=0,le=1000000000)
    ACK_Flag_Count: int=Field(ge=0,le=1000000000)
class NetworkInput(ScanInput):
    flows: list[NetworkFlow]=Field(min_length=1,max_length=100)
class AudioMetadata(BaseModel):
    model_config=ConfigDict(extra='forbid',allow_inf_nan=False)
    spectralCentroid: float=Field(ge=0,le=24000)
    spectralFlatness: float=Field(ge=0,le=1)
    pitchVariance: float=Field(ge=0,le=100000)
    durationSeconds: float=Field(gt=0,le=60)
class AudioInput(ScanInput):
    metadata: AudioMetadata
    transcript: str=Field(default='',max_length=12000)

async def rate_limit(request: Request):
    key=request.client.host if request.client else 'unknown'; now=time.monotonic()
    limits=request.app.state.limits
    start,count=limits.pop(key,(now,0))
    if now-start>=60: start,count=now,0
    limits[key]=(start,count+1)
    while len(limits)>2048: limits.popitem(last=False)
    if count>=60: raise HTTPException(429,'Scan limit reached; retry in one minute',headers={'Retry-After':'60'})
    try: await asyncio.wait_for(request.app.state.analysis_slots.acquire(),timeout=.1)
    except TimeoutError: raise HTTPException(503,'Analysis capacity busy; retry shortly')
    try: yield
    finally: request.app.state.analysis_slots.release()

@app.get('/api/health')
@app.get('/health')
async def health():
    return {'status':'ok','service':'neuroshield-fastapi','demoFeed':DEMO_FEED,'intervalSeconds':INTERVAL,'connectedClients':len(app.state.broker.clients),'droppedEvents':app.state.broker.dropped,'models':{'text':app.state.text_model.status,'audio':'not installed; metadata heuristics only'},'enforcement':'disabled'}

def response(result, demo):
    incident=incident_from(result,demo)
    analysis={key:result[key] for key in ('title','score','explanation','features','phrases','checks','axes','source','payload','signalType')}
    return {'success':True,'analysis':analysis,'incident':incident,'threatScore':result['score'],'xaiReasoning':result['features'],'explanationMethod':'transparent rules; not SHAP/LIME','smishingProbability':result.get('smishingProbability'),'syntheticVoiceLikelihood':result.get('syntheticVoiceLikelihood'),'probabilityCalibrated':False,'domainAgeDays':result.get('domainAgeDays'),'sslStatus':result.get('sslStatus'),'availability':result.get('availability'),'httpStatus':result.get('httpStatus'),'normalizedUrl':result.get('normalizedUrl'),'category':result.get('category'),'cueFamilies':result.get('cueFamilies')}

@app.post('/api/scan-url',dependencies=[Depends(rate_limit)])
async def scan_url(body: UrlInput):
    try: result=await asyncio.wait_for(analyze_url(body.url),timeout=9)
    except (ValueError,UnicodeError): raise HTTPException(422,'Provide a valid HTTP or HTTPS URL with a valid hostname and port')
    except TimeoutError: raise HTTPException(504,'URL intelligence lookup timed out; retry or use a reserved demo URL')
    return response(result,body.demo)

@app.post('/api/scan-text',dependencies=[Depends(rate_limit)])
async def scan_text(body: TextInput):
    result=await asyncio.to_thread(app.state.text_model.analyze,body.text)
    return response(result,body.demo)

@app.post('/api/scan-audio',dependencies=[Depends(rate_limit)])
async def scan_audio(body: AudioInput):
    return response(analyze_audio(body.metadata.model_dump(),body.transcript,body.demo),body.demo)

@app.websocket('/ws/live-feed')
async def live_feed(ws: WebSocket):
    origin=ws.headers.get('origin')
    if '*' not in ORIGINS and origin and origin not in ORIGINS: return await ws.close(code=1008)
    if len(app.state.broker.clients)>=64: return await ws.close(code=1013)
    await ws.accept()
    queue=asyncio.Queue(maxsize=32); app.state.broker.clients.add(queue)
    await ws.send_json({'type':'ready','demo':True,'intervalSeconds':INTERVAL,'feedEnabled':DEMO_FEED})
    async def send_events():
        while True: await asyncio.wait_for(ws.send_json(await queue.get()),timeout=5)
    async def receive():
        while True:
            message=await ws.receive_text()
            if len(message)>1024: await ws.close(code=1009); return
            if message=='ping':
                if not queue.full(): queue.put_nowait({'type':'pong'})
    sender=asyncio.create_task(send_events()); receiver=asyncio.create_task(receive())
    try:
        done,_=await asyncio.wait((sender,receiver),return_when=asyncio.FIRST_COMPLETED)
        for task in done:
            with suppress(WebSocketDisconnect,RuntimeError,TimeoutError): task.result()
    except asyncio.CancelledError:
        pass
    finally:
        app.state.broker.clients.discard(queue)
        sender.cancel();receiver.cancel()
        with suppress(asyncio.CancelledError):
            await asyncio.gather(sender,receiver,return_exceptions=True)
        with suppress(WebSocketDisconnect,RuntimeError,asyncio.CancelledError): await ws.close()

@app.post('/api/scan-network', dependencies=[Depends(rate_limit)])
async def scan_network(body: NetworkInput):
    records=[response(network_result(flow.model_dump()), body.demo) for flow in body.flows]
    return {'success': True, 'records': records, 'total': len(records),
            'flagged': sum(r['threatScore'] >= 65 for r in records)}

@app.get('/api/model/evaluation', dependencies=[Depends(rate_limit)])
async def model_evaluation():
    return await asyncio.to_thread(evaluate_examples)
