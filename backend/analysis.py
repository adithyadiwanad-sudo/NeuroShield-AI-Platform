"""Bounded, explicit research-prototype analysis; no destination page downloads."""
from __future__ import annotations
import asyncio
import ipaddress
import re
import socket
import ssl
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit
import httpx
import joblib

BRANDS = ('paypal.com', 'microsoft.com', 'google.com', 'amazon.com', 'netflix.com', 'sbi.co.in')
RULES = [
    ('Urgency', 22, r'\b(urgent|immediately|act now|final notice|within \d+ hours?)\b'),
    ('Authority', 16, r'\b(bank|police|manager|court|tax department|support team)\b'),
    ('Coercion', 23, r'\b(arrest|suspend(?:ed)?|terminat(?:ed|ion)|freeze|penalty|legal action)\b'),
    ('Payment', 21, r'\b(wire|transfer funds|gift cards?|registration fee|pay (?:a |the )?fee|settlement|crypto wallet)\b'),
    ('Credentials', 25, r'\b(?:share|send|enter|verify|confirm|provide|reveal)\b.{0,28}\b(?:otp|password|pin|code|credentials|bank details)\b'),
    ('Secrecy', 16, r'\b(confidential|do not tell|keep (?:it|this) secret|do not contact)\b'),
]

def text_rules(text: str) -> dict:
    features, phrases, axes = [], [], []
    for axis, weight, pattern in RULES:
        matches = [m for m in re.finditer(pattern, text, re.I) if not (axis == 'Credentials' and re.search(r"(?:do not|never|don't)\s*$", text[max(0, m.start()-16):m.start()], re.I))]
        axes.append({'axis': axis, 'value': min(100, len(matches)*45)})
        if matches:
            features.append({'name': f'{axis} indicators', 'impact': weight})
            phrases.extend(m.group() for m in matches)
    if re.search(r'https?://', text) and features:
        features.append({'name': 'Link alongside persuasion cues', 'impact': 12})
    return {'features': features, 'phrases': list(dict.fromkeys(phrases)), 'axes': axes, 'ruleScore': min(100, sum(f['impact'] for f in features))}

class TextModel:
    def __init__(self, directory: Path):
        self.classifier = self.vectorizer = None
        self.status = 'unavailable; rule scoring active'
        try:
            # Only operator-installed repository artifacts are loaded, never uploads.
            self.classifier = joblib.load(directory / 'scam_model.pkl')
            self.vectorizer = joblib.load(directory / 'scam_tfidf.pkl')
            if 'Safe' not in self.classifier.classes_:
                raise ValueError('Safe class is required')
            self.classifier.predict_proba(self.vectorizer.transform(['health check']))
            self.status = 'ready; project-example training, not benchmark validated'
        except Exception:
            self.classifier = self.vectorizer = None
    def analyze(self, text: str) -> dict:
        evidence = text_rules(text)
        probability, category = None, None
        if self.classifier is not None:
            probabilities = self.classifier.predict_proba(self.vectorizer.transform([text]))[0]
            classes = list(self.classifier.classes_)
            probability = float(1 - probabilities[classes.index('Safe')])
            category = str(classes[int(probabilities.argmax())])
        score = round(probability * 100) if probability is not None else evidence['ruleScore']
        explanation = (f'The project-example text classifier assigns {score}/100 aggregate non-Safe probability; predicted class: {category}. This probability is uncalibrated and does not establish fraud. ' if probability is not None else f'Local language rules produce {score}/100 heuristic risk. No trained text model is available. ')
        explanation += 'The displayed rule contributions explain matched language cues, not the classifier internals; they are not SHAP/LIME values.'
        return dict(evidence, title='Message classification complete', score=score, explanation=explanation, source='Submitted message', payload=text, signalType='Text', provenance='model' if probability is not None else 'heuristic', checks=[{'label':'Scoring method','value':'TF-IDF + logistic regression' if probability is not None else 'Transparent language rules'}, {'label':'Predicted class','value':category or 'Unavailable'}, {'label':'Calibration','value':'Not validated on a held-out benchmark'}, {'label':'Rule index','value':str(evidence['ruleScore'])}], smishingProbability=probability, probabilityCalibrated=False)

async def public_addresses(host: str) -> list[str]:
    """Resolve once; reject the entire answer if any address is non-public."""
    records = await asyncio.wait_for(asyncio.get_running_loop().getaddrinfo(host, 443, type=socket.SOCK_STREAM), 3)
    addresses = list(dict.fromkeys(record[4][0] for record in records))
    if not addresses or any(not ipaddress.ip_address(ip).is_global for ip in addresses):
        raise ValueError('Non-public destination is not inspected')
    return addresses

async def tls_status(host: str, addresses: list[str]) -> str:
    writer = None
    try:
        # Connect to the vetted literal IP; SNI and certificate validation use hostname.
        _, writer = await asyncio.wait_for(asyncio.open_connection(addresses[0], 443, ssl=ssl.create_default_context(), server_hostname=host, ssl_handshake_timeout=3), 4)
        cert = writer.get_extra_info('ssl_object').getpeercert()
        return f"Valid certificate for hostname; expires {cert.get('notAfter', 'unknown')}"
    except (OSError, TimeoutError, ssl.SSLError):
        return 'Unavailable or invalid TLS handshake; not proof of maliciousness'
    finally:
        if writer:
            writer.close()

async def domain_age(host: str) -> tuple[int | None, str]:
    parts = host.split('.')
    if len(parts) < 2 or parts[-1] not in ('com', 'net'):
        return None, 'Registry lookup supported for .com and .net only'
    domain = '.'.join(parts[-2:])
    try:
        # Fixed trusted registry hosts, no arbitrary URL fetch or redirects.
        async with httpx.AsyncClient(timeout=4, follow_redirects=False, trust_env=False) as client:
            response = await client.get(f'https://rdap.verisign.com/{parts[-1]}/v1/domain/{domain}')
            response.raise_for_status()
            for event in response.json().get('events', []):
                if event.get('eventAction') == 'registration':
                    registered = datetime.fromisoformat(event['eventDate'].replace('Z', '+00:00'))
                    age = max(0, (datetime.now(timezone.utc) - registered).days)
                    return age, f'{age} days (registry registration date)'
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        pass
    return None, 'Registration date unavailable from registry'

async def analyze_url(value: str) -> dict:
    parsed = urlsplit(value)
    host = (parsed.hostname or '').encode('idna').decode().lower().rstrip('.')
    if parsed.scheme not in ('http', 'https') or not host or len(host) > 253 or not re.fullmatch(r'[a-z0-9.:-]+', host):
        raise ValueError('Provide a valid HTTP or HTTPS URL')
    port = parsed.port  # invalid ports raise a validation error
    features, phrases = [], []
    def flag(name, impact):
        features.append({'name':name, 'impact':impact}); phrases.append(name)
    if parsed.scheme == 'http': flag('Unencrypted HTTP scheme',20)
    if parsed.username or parsed.password: flag('User information before hostname',25)
    if 'xn--' in host: flag('Internationalized hostname',15)
    similarity = 0
    for brand in BRANDS:
        if host == brand or host.endswith('.'+brand): continue
        token = brand.split('.')[0]
        for label in re.split(r'[.-]',host):
            ratio = SequenceMatcher(None,label,token).ratio()
            if len(label) >= 3 and (ratio >= .8 or token in label): similarity=max(similarity, round(ratio*100))
    if similarity: flag('Brand lookalike outside official domain',34)
    if re.search(r'\b(login|verify|password|secure|account|wallet)\b',host+' '+parsed.path,re.I): flag('Credential-themed URL terms',12)
    age, age_text, tls = None, 'Not inspected', 'Not inspected'
    try:
        ipaddress.ip_address(host)
        flag('IP address instead of domain',18)
    except ValueError: pass
    if host.endswith(('.example','.test','.invalid','.localhost')) or host in ('localhost','example','test','invalid') or port not in (None,80,443):
        age_text = tls = 'Not inspected: reserved name or nonstandard port'
    else:
        try:
            addresses = await public_addresses(host)
            age_result, tls = await asyncio.gather(domain_age(host), tls_status(host,addresses) if parsed.scheme=='https' else asyncio.sleep(0,result='HTTP URL: no TLS used'))
            age, age_text = age_result
        except (OSError, TimeoutError, ValueError):
            age_text = tls = 'Unavailable: unresolved or non-public destination'
    if age is not None and age < 3: flag('Domain registered less than three days ago',24)
    score = min(100, sum(f['impact'] for f in features))
    safe_netloc = f'[{host}]' if ':' in host else host
    if port: safe_netloc += f':{port}'
    clean_url = urlunsplit((parsed.scheme,safe_netloc,parsed.path,parsed.query,''))
    return dict(title='URL inspection complete',score=score,features=features,phrases=phrases,axes=[{'axis':'Brand resemblance','value':similarity},{'axis':'Transport','value':80 if parsed.scheme=='http' else 10},{'axis':'Rule risk','value':score}],explanation=f'Observed structural indicators yield {score}/100 heuristic risk. Registry and TLS checks are reported separately. No page content or redirects were fetched. A low score does not establish safety.',source=host,payload=clean_url,signalType='URL',provenance='heuristic',checks=[{'label':'Hostname','value':host},{'label':'Domain age','value':age_text},{'label':'SSL / TLS status','value':tls},{'label':'Brand string similarity','value':f'{similarity}%'},{'label':'Page content / redirects','value':'Not fetched'}],domainAgeDays=age,sslStatus=tls)

def analyze_audio(metadata: dict, transcript: str, demo: bool) -> dict:
    features=[]
    if metadata['pitchVariance'] < 8: features.append({'name':'Low supplied pitch variance','impact':25})
    if metadata['spectralFlatness'] > .65: features.append({'name':'High supplied spectral flatness','impact':25})
    if metadata['spectralCentroid'] > 3500: features.append({'name':'High supplied spectral centroid','impact':15})
    language = text_rules(transcript)
    if language['ruleScore'] >= 35: features.append({'name':'Persuasive transcript cues','impact':30})
    score=min(100,sum(f['impact'] for f in features))
    return dict(title='Voice metadata inspection',score=score,features=features,phrases=language['phrases'],axes=language['axes'],explanation=f'Supplied spectral metadata and transcript produce a {score}/100 heuristic review index. No trained voice classifier is installed; syntheticVoiceLikelihood is unavailable. Metadata is caller-supplied, not independently measured by this endpoint.',source='Synthetic voice fixture' if demo else 'Submitted spectral metadata',payload=transcript or 'Spectral metadata only',signalType='Voice',provenance='simulation' if demo else 'heuristic',checks=[{'label':'Pitch variance','value':str(metadata['pitchVariance'])},{'label':'Spectral centroid','value':f"{metadata['spectralCentroid']} Hz"},{'label':'Spectral flatness','value':str(metadata['spectralFlatness'])},{'label':'Synthetic voice likelihood','value':'Unavailable — no trained classifier'},{'label':'Evidence source','value':'Synthetic fixture' if demo else 'Caller-supplied metadata'}],syntheticVoiceLikelihood=None)
