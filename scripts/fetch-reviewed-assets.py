"""Fetch only reviewed binary assets through short-lived, read-only download URLs."""
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import re
import urllib.parse
import urllib.request

manifest = json.loads(os.environ['TRANSFER_MANIFEST'])
tag = manifest['tag']
assert re.fullmatch(r'v\d+\.\d+\.\d+-[\w.-]+', tag), 'Beta tag required'
assert re.fullmatch(r'[a-f0-9]{40}', manifest['sourceCommit'])
assets = manifest['assets']
assert 1 <= len(assets) <= 16
assert len({a['name'] for a in assets}) == len(assets)
assert sum(a['size'] for a in assets) < 1_500_000_000
root = Path('reviewed-assets')
root.mkdir()

def fetch(asset):
    name = asset['name']
    assert name in ['latest.json', 'downloads.json', 'qualification.json', 'SHA256SUMS'] or re.fullmatch(r'(?:windows-x86_64|darwin-aarch64|darwin-x86_64)-[^/\\]+\.(?:exe|dmg|app\.tar\.gz)(?:\.sig)?', name)
    assert Path(name).name == name
    assert 0 < asset['size'] < 300_000_000
    assert re.fullmatch(r'[a-f0-9]{64}', asset['sha256'])
    url = urllib.parse.urlsplit(asset['url'])
    assert url.scheme == 'https' and not url.username and not url.password
    assert url.hostname == 'release-assets.githubusercontent.com' or url.hostname.endswith('.blob.core.windows.net')
    print('::add-mask::' + asset['url'], flush=True)
    digest = hashlib.sha256()
    size = 0
    with urllib.request.urlopen(asset['url'], timeout=120) as response, (root / name).open('wb') as output:
        # Redirects must never escape the approved asset hosts.
        host = urllib.parse.urlsplit(response.url).hostname
        assert host == 'release-assets.githubusercontent.com' or host.endswith('.blob.core.windows.net')
        while chunk := response.read(1024 * 1024):
            size += len(chunk)
            if size > asset['size']:
                raise ValueError('Unexpected asset size')
            digest.update(chunk)
            output.write(chunk)
    assert size == asset['size'] and digest.hexdigest() == asset['sha256'], 'Asset digest mismatch'
    print('Reviewed asset received: ' + name, flush=True)

# Start every request before the short-lived URLs expire.
with concurrent.futures.ThreadPoolExecutor(max_workers=16) as executor:
    list(executor.map(fetch, assets))
Path('transfer-source.json').write_text(json.dumps({'tag': tag, 'sourceCommit': manifest['sourceCommit']}))
