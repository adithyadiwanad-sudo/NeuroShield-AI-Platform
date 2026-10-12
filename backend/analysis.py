"""Bounded research analysis with DNS-pinned, header-only URL inspection."""
from __future__ import annotations
import asyncio
import ipaddress
import re
import socket
import ssl
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, unquote
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
    ('Reward', 24, r'\b(congratulations|lottery|prize|guaranteed returns?|earning\s+rs\s*\d+|\d+\s*/\s*day)\b'),
    ('Recruitment', 22, r'\b(part-time job|telegram|job_admin|recruitment fee)\b'),
]

def text_rules(text: str) -> dict:
    features, phrases, axes = [], [], []
    for axis, weight, pattern in RULES:
        matches = [m for m in re.finditer(pattern, text, re.I) if not (axis == 'Credentials' and re.search(r"(?:do not|never|don't)\s*$", text[max(0, m.start()-16):m.start()], re.I))]
        axes.append({'axis': axis, 'value': min(100, len(matches)*45)})
        if matches:
            features.append({'name': f'{axis} indicators', 'impact': weight})
            phrases.extend(m.group() for m in matches)
    if re.search(r'https?://', text, re.I):
        features.append({'name': 'Link present', 'impact': 12})
    families = len(features)
    raw = min(100, sum(f['impact'] for f in features))
    return {'features': features, 'phrases': list(dict.fromkeys(phrases)), 'axes': axes, 'cueFamilies': families, 'ruleScore': min(raw, 20) if families <= 1 else raw}


def conversational(text: str, evidence: dict) -> bool:
    """Only bypass scoring for short conversation without risk cues or URL syntax."""
    if evidence['cueFamilies'] or re.search(r'[@/:\d]', text):
        return False
    normalized = re.sub(r'[^\w\s]', ' ', text.casefold())
    normalized = ' '.join(normalized.split())
    words = normalized.split()
    return bool(words) and (len(words) < 3 or bool(re.fullmatch(
        r'(?:hi+|hello|hey|good morning|good evening)(?:\s+[a-z]+)?(?: how are you(?: today)?)?', normalized)))

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
        if conversational(text, evidence):
            return dict(evidence, title='Safe Conversational Text', category='Safe Conversational Text', score=0,
                        explanation='Short conversational text with no configured scam cues. No model inference was needed; this does not verify the sender.',
                        source='Submitted message', payload=text, signalType='Text', provenance='heuristic',
                        checks=[{'label':'Scoring method','value':'Conversational pre-filter'}, {'label':'Matched cue families','value':'0'}],
                        smishingProbability=None, probabilityCalibrated=False)
        probability, category = None, None
        if self.classifier is not None:
            probabilities = self.classifier.predict_proba(self.vectorizer.transform([text]))[0]
            classes = list(self.classifier.classes_)
            probability = float(1 - probabilities[classes.index('Safe')])
            category = str(classes[int(probabilities.argmax())])
        raw_score = round(probability * 100) if probability is not None else evidence['ruleScore']
        families = evidence['cueFamilies']
        score = min(raw_score, 20) if families <= 1 else min(100, max(raw_score, evidence['ruleScore']))
        explanation = (f'Text model predicted {category}; its uncalibrated aggregate non-Safe score is {raw_score}/100. ' if probability is not None else 'No trained text model is available; language rules are active. ')
        explanation += f'Context policy yields {score}/100 risk from {families} cue families; zero or one family is capped at 20. Multiple families can raise the rule-based index. This is not a calibrated fraud probability. '
        explanation += 'The displayed rule contributions explain matched language cues, not the classifier internals; they are not SHAP/LIME values.'
        return dict(evidence, title='Message classification complete', category=category or 'Rule-based review', score=score, explanation=explanation, source='Submitted message', payload=text, signalType='Text', provenance='model' if probability is not None else 'heuristic', checks=[{'label':'Scoring method','value':'TF-IDF + logistic regression with context policy' if probability is not None else 'Transparent language rules'}, {'label':'Predicted class','value':category or 'Unavailable'}, {'label':'Matched cue families','value':str(families)}, {'label':'Calibration','value':'Not validated on a held-out benchmark'}, {'label':'Rule index','value':str(evidence['ruleScore'])}], smishingProbability=probability, probabilityCalibrated=False)

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

def normalize_url(value: str) -> str:
    value = value.strip(" \t\r\n'\"`")
    if not value or re.search(r'[\x00-\x20\x7f\\]', value):
        raise ValueError('URL contains whitespace or control characters')
    value = re.sub(r'^(https?):/*', r'\1://', value, flags=re.I)
    if not re.match(r'^[a-z][a-z0-9+.-]*:', value, re.I):
        value = 'http://' + value
    return value


async def analyze_url(value: str) -> dict:
    try:
        from .url_probe import head_probe
    except ImportError:
        from url_probe import head_probe
    normalized = normalize_url(value)
    parsed = urlsplit(normalized)
    host = (parsed.hostname or '').encode('idna').decode().lower().rstrip('.')
    if parsed.scheme not in ('http', 'https') or not host or len(host) > 253:
        raise ValueError('Provide a valid HTTP or HTTPS URL')
    literal_ip = False
    try:
        ipaddress.ip_address(host)
        literal_ip = True
    except ValueError:
        if any(not re.fullmatch(r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?', label) for label in host.split('.')):
            raise ValueError('Invalid hostname')
    port = parsed.port
    features, phrases = [], []
    def flag(name, impact):
        features.append({'name': name, 'impact': impact})
        phrases.append(name)
    if parsed.scheme == 'http': flag('Unencrypted HTTP scheme', 20)
    if parsed.username or parsed.password: flag('User information before hostname', 25)
    if 'xn--' in host: flag('Internationalized hostname', 15)
    if literal_ip: flag('IP address instead of domain', 18)
    similarity = 0
    for brand in BRANDS:
        if host == brand or host.endswith('.' + brand): continue
        token = brand.split('.')[0]
        for label in re.split(r'[.-]', host):
            ratio = SequenceMatcher(None, label, token).ratio()
            if len(label) >= 3 and (ratio >= .8 or token in label):
                similarity = max(similarity, round(ratio * 100))
    if similarity: flag('Brand lookalike outside official domain', 34)
    terms = host + ' ' + unquote(parsed.path) + ' ' + unquote(parsed.query)
    credential = bool(re.search(r'\b(login|verify|password|secure|account|wallet|otp)\b', terms, re.I))
    if credential: flag('Credential-themed URL terms', 12)
    # A TLD is weak evidence, never sufficient for a high-risk verdict.
    if host.split('.')[-1] in ('center', 'top', 'tk', 'xyz', 'academy', 'app'):
        flag('TLD review cue (not proof of abuse)', 8)
    if re.search(r'(movierul[ez]|netmirror|movieboxapp|tamilmovierules)', host, re.I):
        flag('Configured unofficial-media domain pattern; reputation unverified', 65)
    if re.search(r'(\.apk(?:$|[? /])|download[-_/]?apk|mod[-_/]?apk)', terms, re.I):
        flag('Third-party APK download pattern; content unverified', 65)
    if credential and parsed.scheme == 'http':
        flag('Credential-themed link over unencrypted transport', 35)
    age, age_text, tls = None, 'Not inspected', 'Not inspected'
    status, detail, http_status = 'not_inspected', '', None
    reserved = host.endswith(('.example', '.test', '.invalid', '.localhost')) or host in ('localhost', 'example', 'test', 'invalid')
    if reserved or port not in (None, 80, 443):
        detail = 'Not inspected: reserved name or nonstandard port'
        age_text = tls = detail
    else:
        try:
            # Includes DNS, TCP, TLS and first response line within one deadline.
            async with asyncio.timeout(3.0):
                addresses = await public_addresses(host)
                http_status, tls = await head_probe(parsed, host, addresses)
            status = 'reachable'
            detail = f'HTTP {http_status}: server responded to HEAD; redirects and body not fetched'
            # 403/404/405 prove a responding host, not a missing domain.
            age, age_text = await domain_age(host)
        except ValueError:
            status = 'blocked'
            detail = 'Inspection blocked: non-public destination; no request sent'
            age_text = tls = detail
        except socket.gaierror as exc:
            status = 'dns_not_found' if exc.errno == socket.EAI_NONAME else 'unreachable'
            detail = 'Domain could not be reached or resolved via public DNS.'
            age_text = tls = detail
        except ssl.SSLError:
            status = 'tls_error'
            detail = 'TLS validation failed; domain existence and page safety are not determined'
            tls = detail
        except (OSError, TimeoutError):
            status = 'unreachable'
            detail = 'Domain could not be reached or resolved via public DNS. It may be temporarily unavailable; nonexistence is not confirmed.'
            tls = 'Unavailable during reachability check'
    if age is not None and age < 3: flag('Domain registered less than three days ago', 24)
    if status in ('dns_not_found', 'unreachable', 'tls_error', 'blocked'):
        # Availability uncertainty is a floor, not an assertion of phishing.
        missing = max(0, 35 - sum(f['impact'] for f in features))
        if missing: flag('Unverified availability / inspection risk floor', missing)
    score = min(95, sum(f['impact'] for f in features))
    netloc = f'[{host}]' if ':' in host else host
    if port: netloc += f':{port}'
    clean_url = urlunsplit((parsed.scheme, netloc, parsed.path, parsed.query, ''))
    titles = {'dns_not_found': 'URL / Domain Does Not Exist', 'unreachable': 'URL / Domain Unreachable',
              'blocked': 'URL inspection blocked', 'tls_error': 'URL TLS validation failed'}
    return dict(title=titles.get(status, 'URL inspection complete'), score=score, features=features,
        phrases=phrases, axes=[{'axis':'Brand resemblance','value':similarity}, {'axis':'Rule risk','value':score}],
        explanation=f'{detail}. Structural and availability checks yield {score}/100 heuristic risk. Domain patterns and TLD cues are not verified threat intelligence. A response does not establish safety; no page body or redirect target was fetched.',
        source=host, payload=clean_url, signalType='URL', provenance='heuristic',
        checks=[{'label':'Normalized URL','value':clean_url}, {'label':'Availability','value':detail},
                {'label':'Domain age','value':age_text}, {'label':'SSL / TLS status','value':tls},
                {'label':'Matched cues','value':str(len(features))}, {'label':'Page content / redirects','value':'Not fetched'}],
        domainAgeDays=age, sslStatus=tls, availability=status, httpStatus=http_status, normalizedUrl=clean_url)

def analyze_audio(metadata: dict, transcript: str, demo: bool) -> dict:
    features=[]
    if metadata['pitchVariance'] < 8: features.append({'name':'Low supplied pitch variance','impact':25})
    if metadata['spectralFlatness'] > .65: features.append({'name':'High supplied spectral flatness','impact':25})
    if metadata['spectralCentroid'] > 3500: features.append({'name':'High supplied spectral centroid','impact':15})
    language = text_rules(transcript)
    if language['ruleScore'] >= 35: features.append({'name':'Persuasive transcript cues','impact':30})
    score=min(100,sum(f['impact'] for f in features))
    return dict(title='Voice metadata inspection',score=score,features=features,phrases=language['phrases'],axes=language['axes'],explanation=f'Supplied spectral metadata and transcript produce a {score}/100 heuristic review index. No trained voice classifier is installed; syntheticVoiceLikelihood is unavailable. Metadata is caller-supplied, not independently measured by this endpoint.',source='Synthetic voice fixture' if demo else 'Submitted spectral metadata',payload=transcript or 'Spectral metadata only',signalType='Voice',provenance='simulation' if demo else 'heuristic',checks=[{'label':'Pitch variance','value':str(metadata['pitchVariance'])},{'label':'Spectral centroid','value':f"{metadata['spectralCentroid']} Hz"},{'label':'Spectral flatness','value':str(metadata['spectralFlatness'])},{'label':'Synthetic voice likelihood','value':'Unavailable — no trained classifier'},{'label':'Evidence source','value':'Synthetic fixture' if demo else 'Caller-supplied metadata'}],syntheticVoiceLikelihood=None)
