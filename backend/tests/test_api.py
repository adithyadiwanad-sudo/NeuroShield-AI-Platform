import asyncio
import os
import unittest
from unittest.mock import AsyncMock, patch
os.environ['FEED_INTERVAL_SECONDS']='0.05'
from fastapi.testclient import TestClient
from backend.main import app, Broker
from backend.analysis import analyze_url, public_addresses

class ApiTests(unittest.TestCase):
    def test_network_batch_rules_and_bounds(self):
        flow={'Destination_Port':80,'Flow_Duration':500,'Total_Fwd_Packets':850,'Total_Bwd_Packets':2,'Flow_Bytes_s':100000,'Flow_Packets_s':1700,'SYN_Flag_Count':1,'ACK_Flag_Count':0}
        normal={**flow,'Total_Fwd_Packets':25,'Total_Bwd_Packets':30,'Flow_Bytes_s':380,'Flow_Packets_s':3.6,'ACK_Flag_Count':1}
        result=self.client.post('/api/scan-network',json={'flows':[flow,normal],'demo':True})
        self.assertEqual(result.status_code,200)
        data=result.json();self.assertEqual(data['flagged'],1)
        self.assertEqual([r['threatScore'] for r in data['records']],[100,0])
        self.assertTrue(all(r['incident']['demo'] for r in data['records']))
        for flows in ([],[flow]*101,[{**flow,'Destination_Port':65536}],[{**flow,'Total_Fwd_Packets':-1}]):
            self.assertEqual(self.client.post('/api/scan-network',json={'flows':flows}).status_code,422)
    def test_evaluation_counts_and_metrics(self):
        result=self.client.get('/api/model/evaluation')
        self.assertEqual(result.status_code,200)
        data=result.json()
        self.assertEqual(sum(map(sum,data['confusionMatrix'])),data['samples'])
        self.assertEqual(len(data['classes']),len(data['confusionMatrix']))
        self.assertTrue(all(0<=v<=1 for v in data['metrics'].values()))
        self.assertIn('not UNSW',data['limitation'])
    def setUp(self):
        self.context=TestClient(app);self.client=self.context.__enter__()
    def tearDown(self):self.context.__exit__(None,None,None)
    def test_health_and_real_text_inference(self):
        health=self.client.get('/api/health').json()
        self.assertEqual(health['status'],'ok');self.assertIn('ready',health['models']['text'])
        result=self.client.post('/api/scan-text',json={'text':'URGENT: bank account suspended. Enter your OTP immediately.'})
        self.assertEqual(result.status_code,200)
        body=result.json();self.assertFalse(body['incident']['demo']);self.assertEqual(body['incident']['provenance'],'model')
        self.assertIsInstance(body['smishingProbability'],float);self.assertGreater(body['threatScore'],0)
        self.assertFalse(body['probabilityCalibrated']);self.assertTrue(body['xaiReasoning'])
    def test_url_validation_and_reserved_fixture(self):
        result=self.client.post('/api/scan-url',json={'url':'http://paypa1.example/verify-account','demo':True})
        self.assertEqual(result.status_code,200);self.assertGreaterEqual(result.json()['threatScore'],65)
        self.assertIsNone(result.json()['domainAgeDays']);self.assertIn('reserved',result.json()['sslStatus'])
        for value in ('javascript:alert(1)','http://','http://example.com:bad'):
            self.assertEqual(self.client.post('/api/scan-url',json={'url':value}).status_code,422)
    def test_audio_metadata_is_bounded_and_not_a_fake_probability(self):
        payload={'metadata':{'spectralCentroid':4100,'spectralFlatness':.78,'pitchVariance':3.2,'durationSeconds':12},'transcript':'Wire the payment immediately. Keep this confidential.','demo':True}
        result=self.client.post('/api/scan-audio',json=payload)
        self.assertEqual(result.status_code,200);self.assertIsNone(result.json()['syntheticVoiceLikelihood'])
        self.assertTrue(result.json()['incident']['demo']);self.assertGreater(result.json()['threatScore'],60)
        payload['metadata']['spectralFlatness']=2
        self.assertEqual(self.client.post('/api/scan-audio',json=payload).status_code,422)
    def test_cors_limits_and_blank_input(self):
        cors=self.client.options('/api/scan-text',headers={'Origin':'https://example.vercel.app','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'})
        self.assertEqual(cors.headers['access-control-allow-origin'],'*')
        self.assertEqual(self.client.post('/api/scan-text',json={'text':' '}).status_code,422)
        self.assertEqual(self.client.post('/api/scan-text',json={'text':'x'*70000}).status_code,413)
        self.assertEqual(self.client.post('/api/scan-text',json={'text':'hi','unexpected':True}).status_code,422)
    def test_websocket_broadcast_and_cleanup(self):
        with self.client.websocket_connect('/ws/live-feed') as first, self.client.websocket_connect('/ws/live-feed') as second:
            self.assertEqual(first.receive_json()['type'],'ready');second.receive_json()
            a=first.receive_json();b=second.receive_json()
            self.assertEqual(a['type'],'incident');self.assertEqual(a['incident']['id'],b['incident']['id'])
            self.assertTrue(a['incident']['demo']);self.assertIn('simulated',a['incident']['actionTaken'])
            self.assertEqual(self.client.get('/api/health').json()['connectedClients'],2)
        self.assertEqual(len(app.state.broker.clients),0)
    def test_private_scans_do_not_enter_shared_feed(self):
        with self.client.websocket_connect('/ws/live-feed') as ws:
            ws.receive_json()
            private=self.client.post('/api/scan-text',json={'text':'PRIVATE_TEST_MARKER urgent bank transfer funds'}).json()
            event=ws.receive_json()
            self.assertNotEqual(event['incident']['id'],private['incident']['id'])
            self.assertNotIn('PRIVATE_TEST_MARKER',str(event))

class IntelligenceTests(unittest.IsolatedAsyncioTestCase):
    async def test_tls_and_registry_results_are_used_without_visiting_page(self):
        with patch('backend.analysis.public_addresses',AsyncMock(return_value=['93.184.216.34'])),patch('backend.url_probe.head_probe',AsyncMock(return_value=(200,'Valid certificate'))),patch('backend.analysis.domain_age',AsyncMock(return_value=(1,'1 day (registry)'))):
            result=await analyze_url('https://paypa1.com/verify')
            self.assertEqual(result['domainAgeDays'],1);self.assertEqual(result['sslStatus'],'Valid certificate')
            self.assertTrue(any(f['name'].startswith('Domain registered') for f in result['features']))
    async def test_private_destination_blocked_before_tls(self):
        with patch('backend.analysis.public_addresses',AsyncMock(side_effect=ValueError('private'))),patch('backend.analysis.tls_status',AsyncMock()) as tls:
            result=await analyze_url('https://127.0.0.1/')
            tls.assert_not_called();self.assertIn('non-public',result['sslStatus'])
    async def test_mixed_dns_answer_rejected(self):
        loop=asyncio.get_running_loop()
        records=[(2,1,6,'',('93.184.216.34',443)),(2,1,6,'',('127.0.0.1',443))]
        with patch.object(loop,'getaddrinfo',AsyncMock(return_value=records)):
            with self.assertRaises(ValueError):await public_addresses('rebind.example.com')
    async def test_slow_subscriber_queue_is_bounded(self):
        broker=Broker();queue=asyncio.Queue(maxsize=2);broker.clients.add(queue)
        for i in range(10):broker.publish({'n':i})
        self.assertEqual(queue.qsize(),2);self.assertEqual(broker.dropped,8);self.assertEqual(queue.get_nowait()['n'],8)

if __name__=='__main__':unittest.main()
