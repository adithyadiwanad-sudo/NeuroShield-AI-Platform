"""Regression coverage for guide-reported scoring and public URL checks."""
import socket
import unittest
from pathlib import Path
from urllib.parse import urlsplit
from unittest.mock import AsyncMock, Mock, patch
from backend.analysis import TextModel, analyze_url, normalize_url
from backend.url_probe import head_probe

class TextPolicyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.model = TextModel(Path(__file__).parents[1] / 'models')
    def test_greetings_bypass_model(self):
        for value in ['hi', 'hii', 'hiii', 'hello', 'hey', 'prabhat', 'good morning', 'Good morning prabhat, how are you today?']:
            with self.subTest(value=value):
                result = self.model.analyze(value)
                self.assertEqual(result['score'], 0)
                self.assertEqual(result['category'], 'Safe Conversational Text')
    def test_single_family_is_capped(self):
        for value in ['Urgent', 'please', 'URGENT immediately act now', 'provide your password']:
            self.assertLessEqual(self.model.analyze(value)['score'], 20)
    def test_multiple_cues_raise_risk(self):
        result = self.model.analyze('URGENT: Your bank account is locked. Click http://bit.ly/bank-renew to verify your OTP immediately or face penalty.')
        self.assertGreater(result['score'], 50)
        self.assertGreaterEqual(result['cueFamilies'], 2)

class UrlPolicyTests(unittest.IsolatedAsyncioTestCase):
    def test_normalization(self):
        self.assertEqual(normalize_url(" '''tamilmovierules.com` "), 'http://tamilmovierules.com')
        self.assertEqual(normalize_url('https:/kirankumard.com'), 'https://kirankumard.com')
        with self.assertRaises(ValueError): normalize_url('https://a.com/\r\nx')
    async def test_dns_failure_and_timeout_are_distinct(self):
        for error, expected in [(socket.gaierror(socket.EAI_NONAME, 'missing'), 'dns_not_found'), (TimeoutError(), 'unreachable')]:
            with patch('backend.analysis.public_addresses', AsyncMock(side_effect=error)):
                result = await analyze_url('https://unregistered.com')
                self.assertEqual(result['availability'], expected)
                self.assertEqual(result['score'], 35)
    async def test_status_codes_and_risk_patterns(self):
        with patch('backend.analysis.public_addresses', AsyncMock(return_value=['93.184.216.34'])), patch('backend.analysis.domain_age', AsyncMock(return_value=(1000,'1000 days'))), patch('backend.url_probe.head_probe', AsyncMock(return_value=(403,'Valid TLS'))):
            safe = await analyze_url('https://google.com')
            self.assertEqual(safe['availability'], 'reachable')
            self.assertEqual(safe['score'], 0)
            for url in ['https://5movierulz.academy','https://netmirror.center','https://example.com/file.apk','http://verify-bank-account-update.center']:
                self.assertGreaterEqual((await analyze_url(url))['score'],65)
            self.assertLess((await analyze_url('https://ordinary.app'))['score'],35)
    async def test_probe_pins_ip_and_does_not_follow_redirect(self):
        reader = Mock(); reader.readline = AsyncMock(return_value=b'HTTP/1.1 302 Found\r\n')
        writer = Mock(); writer.drain = AsyncMock()
        with patch('backend.url_probe.asyncio.open_connection', AsyncMock(return_value=(reader,writer))) as connect:
            status, _ = await head_probe(urlsplit('https://example.com/a?q=1'), 'example.com', ['93.184.216.34'])
            self.assertEqual(status,302)
            connect.assert_awaited_once()
            self.assertEqual(connect.call_args.args[0], '93.184.216.34')
            self.assertEqual(connect.call_args.kwargs['server_hostname'], 'example.com')
            self.assertIn(b'HEAD /a?q=1 HTTP/1.1',writer.write.call_args.args[0])
            self.assertIn(b'User-Agent: NeuroShield',writer.write.call_args.args[0])
            writer.close.assert_called_once()
