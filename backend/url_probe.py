"""DNS-pinned HTTP HEAD probe. Never follows redirects or downloads page bodies."""
import asyncio
import re
import ssl
from urllib.parse import quote


async def head_probe(parsed, host, addresses):
    writer = None
    secure = parsed.scheme == 'https'
    port = parsed.port or (443 if secure else 80)
    authority = f'[{host}]' if ':' in host else host
    if parsed.port:
        authority += f':{port}'
    target = quote(parsed.path or '/', safe="/%:@!$&'()*+,;=-._~")
    if parsed.query:
        target += '?' + quote(parsed.query, safe="/%?:@!$&'()*+,;=-._~")
    try:
        # Literal vetted IP prevents a second DNS lookup and rebinding.
        reader, writer = await asyncio.open_connection(
            addresses[0], port, limit=8192,
            **({'ssl': ssl.create_default_context(), 'server_hostname': host,
                'ssl_handshake_timeout': 3} if secure else {}))
        writer.write((f'HEAD {target} HTTP/1.1\r\nHost: {authority}\r\n'
                      'User-Agent: NeuroShield-Research/2.2 (reachability HEAD)\r\n'
                      'Accept: */*\r\nConnection: close\r\n\r\n').encode('ascii'))
        await writer.drain()
        try:
            line = await reader.readline()
        except ValueError as exc:
            raise OSError('HTTP status line exceeds limit') from exc
        match = re.fullmatch(rb'HTTP/1\.[01] ([1-5][0-9]{2})[^\r\n]*\r?\n', line)
        if not match:
            raise OSError('Invalid HTTP response')
        return int(match[1]), 'Valid certificate for hostname' if secure else 'HTTP URL: no TLS used'
    finally:
        if writer:
            writer.close()
            # Do not wait for a remote close handshake beyond the request deadline.
