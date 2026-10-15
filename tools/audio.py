"""audio.py: the game's sounds and music, made with ElevenLabs (owner 2026-10-15: "take sound and music via the
ElevenLabs API, as in the neighbouring chat" — CriminalRussia/tools/hod, whose key handling and processing this
follows).

The key comes from ELEVENLABS_API_KEY or the macOS keychain (service "elevenlabs"), and is never printed or written
anywhere. Credits are shared with CriminalRussia, which keeps RESERVE of them for its voice-over: nothing here runs
if it would dip below that.

Effects land in assets/sfx/<name>.mp3 (mono), music loops in assets/music/<name>.mp3 (stereo). Raw takes stay in
assets/_raw (out of git). Each effect is made in TAKES takes; the one that starts at once and fills its length wins,
then silence is cut off its ends, it is levelled to −16 LUFS and given a 30 ms fade so it cannot click.

    python3 tools/audio.py check              # the key works? tier and credits left
    python3 tools/audio.py sfx [name …]       # make missing effects (named ones anew), then build them
    python3 tools/audio.py music [name …]     # make missing music loops (named ones anew)
"""
import json, os, ssl, subprocess, sys, time, urllib.error, urllib.request

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'assets/_raw')
API = 'https://api.elevenlabs.io'
RESERVE = 8000  # CriminalRussia's voice-over reserve (its sfx.py, agreed 2026-10-14)
TAKES = 2


def _tls() -> ssl.SSLContext:
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


TLS = _tls()
_key: list[str] = []


def key() -> str:
    if not _key:
        k = os.environ.get('ELEVENLABS_API_KEY', '').strip()
        if not k and sys.platform == 'darwin':
            r = subprocess.run(['security', 'find-generic-password', '-s', 'elevenlabs', '-w'], capture_output=True, text=True)
            k = r.stdout.strip() if r.returncode == 0 else ''
        if not k:
            sys.exit('No ElevenLabs key: put it in the keychain (security add-generic-password -a "$USER" -s elevenlabs -w).')
        _key.append(k)
    return _key[0]


def call(method: str, path: str, body: dict | None = None, accept: str = 'application/json', tries: int = 4) -> bytes:
    data = json.dumps(body).encode() if body is not None else None
    for attempt in range(tries):
        req = urllib.request.Request(API + path, data=data, method=method,
                                     headers={'xi-api-key': key(), 'Content-Type': 'application/json', 'Accept': accept})
        try:
            with urllib.request.urlopen(req, timeout=240, context=TLS) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            detail = e.read().decode('utf-8', 'replace')[:300]
            if e.code in (429, 500, 502, 503) and attempt < tries - 1:
                time.sleep(4 * (attempt + 1))
                continue
            sys.exit(f'ElevenLabs {method} {path.split("?")[0]}: HTTP {e.code} {detail}')
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt < tries - 1:
                time.sleep(4 * (attempt + 1))
                continue
            sys.exit(f'ElevenLabs: network — {e}')
    raise RuntimeError('unreachable')


def sub() -> dict:
    return json.loads(call('GET', '/v1/user/subscription'))


def credits_left() -> int:
    s = sub()
    return int(s['character_limit']) - int(s['character_count'])


def check() -> None:
    s = sub()
    used, limit = int(s.get('character_count', 0)), int(s.get('character_limit', 0))
    print(f"key accepted · tier {s.get('tier', '?')} · credits this month {limit}, used {used}, left {limit - used} "
          f"(reserve for CriminalRussia {RESERVE}, so {limit - used - RESERVE} to spend here)")


# ── Effects: name → (seconds, at least 0.5, prompt). One plain event each (the model keeps one event per prompt best). ──
NO = ' No voices, no words, no music.'
SFX = {
    'jump': (0.5, 'A soft bouncy cartoon jump: a short squishy rubbery boing, a little jelly ball hopping up. Cute and light.' + NO),
    'airjump': (0.5, 'A quick airy puff with a soft squishy pop, a little jelly blob bouncing off thin air in mid-jump. Cute and light.' + NO),
    'walljump': (0.5, 'A quick sticky peel and a springy boing: a gummy blob pushing off a stone wall. Cartoon, short.' + NO),
    'land': (0.5, 'A soft squishy splat: a small jelly ball landing on a stone floor. Short and gentle.' + NO),
    'stomp': (0.6, 'A juicy squelch and a bright pop: a cute cartoon jelly creature squashed flat by a jump from above. Satisfying.' + NO),
    'coin': (0.5, 'A bright short retro video game coin pickup chime: a quick high two-note sparkle.' + NO),
    'hurt': (0.6, 'A cartoon hit: a soft thump and a short squeaky rubber squeal, a small jelly ball getting bumped and hurt.' + NO),
    'fall': (1.0, 'A short descending cartoon slide whistle falling down, ending in a soft pop.' + NO),
    'die': (1.4, 'A sad cartoon deflating squish: a jelly blob going splat and fizzling out with a sinking wobble.' + NO),
    'spring': (0.6, 'A springy metal coil boing: a cartoon trampoline spring launching something upwards.' + NO),
    'crumble': (0.9, 'Small stones and dry earth crumbling and breaking apart, short.' + NO),
    'combo': (1.0, 'A cheerful short retro video game reward jingle: a quick bright rising arpeggio of chimes.' + NO),
    'buy': (0.7, 'A cute game shop purchase: a few coins clink and a soft bright bell dings.' + NO),
    'deny': (0.5, 'A short soft low buzzer blip, a cute game menu error sound.' + NO),
    'bubble': (0.7, 'A big soft bubble pop with a watery gulp: stepping into a magic soap bubble.' + NO),
    'portal': (1.4, 'A magical whoosh with rising twinkling sparkles: a cute video game portal teleport.' + NO),
    'click': (0.5, 'A tiny soft click of a game menu button, short and clean.' + NO),
    'bosshit': (0.8, 'A heavy wet squelch hitting a big jelly monster, with a low rubbery wobble.' + NO),
    'burn': (0.6, 'A short hot sizzle and crackling hiss with a soft squishy pop: a small jelly blob touching fire. Cartoon.' + NO),
    'spit': (0.6, 'A quick fiery whoosh and a soft pop: flames spitting a blob of burning lava up into the air. Cartoon, short.' + NO),
}
SR = 44100


def take(name: str, n: int) -> str:
    return os.path.join(RAW, 'sfx', f'{name}.{n}.mp3')


def pcm(path: str, ch: int = 1) -> np.ndarray:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', str(ch), '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, ch)


def score(x: np.ndarray) -> float:
    """Higher is better: it starts at once and fills its length (not a silence with a tail)."""
    m = np.abs(x.mean(1))
    win = 441   # 10 ms
    env = np.array([m[i:i + win].max() for i in range(0, len(m), win)]) + 1e-9
    loud = env > env.max() * 0.2
    onset = int(np.argmax(loud))
    return loud.mean() - onset * 0.03


def finish_sfx(name: str, x: np.ndarray) -> None:
    """Cut the silence off both ends (40 dB under the peak), level the active part to −18 dBFS RMS with the peak at
    most −1 dBFS, fade the last 30 ms, mono MP3 96 kbit/s."""
    mono = x.mean(1)
    win = 441
    rms = np.array([np.sqrt(np.mean(mono[i:i + win] ** 2)) for i in range(0, len(mono), win)]) + 1e-9
    db = 20 * np.log10(rms)
    on = np.nonzero(db > db.max() - 40)[0]
    y = mono[on[0] * win:min(len(mono), (on[-1] + 1) * win)].copy()
    level = np.sqrt(np.mean(y ** 2)) + 1e-9
    g = min(10 ** (-18 / 20) / level, 10 ** (-1 / 20) / (np.abs(y).max() + 1e-9))
    y *= g
    f = min(len(y), int(0.03 * SR))
    y[-f:] *= np.linspace(1, 0, f)
    out = os.path.join(ROOT, 'assets/sfx', f'{name}.mp3')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame',
                    '-b:a', '96k', out], input=y.astype(np.float32).tobytes(), check=True)


def sfx(names: list[str]) -> None:
    todo = names or list(SFX)
    for name in todo:
        dur, prompt = SFX[name]
        for n in range(1, TAKES + 1):
            if os.path.exists(take(name, n)) and not names:
                continue
            if credits_left() < RESERVE + 2000:
                sys.exit(f'stopped at {name}: keeping the {RESERVE}-credit reserve')
            body = {'text': prompt, 'duration_seconds': dur, 'prompt_influence': 0.6, 'model_id': 'eleven_text_to_sound_v2'}
            audio = call('POST', '/v1/sound-generation?output_format=mp3_44100_128', body, accept='audio/mpeg')
            os.makedirs(os.path.dirname(take(name, n)), exist_ok=True)
            open(take(name, n), 'wb').write(audio)
        takes = [take(name, n) for n in range(1, TAKES + 1) if os.path.exists(take(name, n))]
        best = max(takes, key=lambda t: score(pcm(t)))
        finish_sfx(name, pcm(best))
        print(f'{name}: {os.path.basename(best)}', flush=True)


# ── Music: name → (seconds, mood line, styles[, reference]). Loops for <AudioBufferSourceNode loop>. A reference is
# another loop uploaded to Music and given as a sound sample (conditioning_ref, as CriminalRussia does with its theme):
# owner 2026-10-15 liked the rooms' calm loop better than the first climb, so climb now grows out of calm. ──
MUSIC = {
    'climb': (75, 'cozy, playful, gently bouncy, steady, no ending',
              ['lo-fi chiptune', 'soft warm synth pads', 'gentle music box arpeggio melody', 'soft steady beat with light drums',
               'cozy and hopeful', 'cute video game platformer, climbing', 'steady 100 BPM'], 'calm'),
    'calm': (60, 'calm, cozy, dreamy, steady, no ending',
             ['lo-fi chiptune', 'soft warm synth pads', 'gentle music box arpeggio', 'cozy and safe', 'video game shop',
              'steady 84 BPM', 'no drums']),
    'boss': (60, 'intense, urgent, driving, steady, no ending',
             ['chiptune', 'driving pulsing bass', 'fast arpeggios', 'tense and urgent', 'video game boss battle', 'steady 150 BPM']),
}
NOT_MUSIC = ['vocals', 'lyrics', 'singing', 'choir', 'intro', 'outro', 'ending', 'fade out', 'orchestra', 'guitar solo',
             'dubstep', 'heavy distortion', 'tape warble', 'lo-fi noise']


def music_raw(name: str) -> str:
    return os.path.join(RAW, 'music', f'{name}.wav')


def song_id(name: str) -> str:
    """Upload a finished loop to Music once (to be a sample for others); the song_id is kept in the raw folder."""
    path = os.path.join(RAW, 'music', 'songs.json')
    ids = json.load(open(path)) if os.path.exists(path) else {}
    if name not in ids:
        import uuid
        b = '----' + uuid.uuid4().hex
        body = (f'--{b}\r\nContent-Disposition: form-data; name="file"; filename="{name}.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n'
                ).encode() + open(os.path.join(ROOT, 'assets/music', f'{name}.mp3'), 'rb').read() + f'\r\n--{b}--\r\n'.encode()
        req = urllib.request.Request(API + '/v1/music/upload', data=body, method='POST',
                                     headers={'xi-api-key': key(), 'Content-Type': f'multipart/form-data; boundary={b}'})
        try:
            ids[name] = json.loads(urllib.request.urlopen(req, context=TLS, timeout=600).read())['song_id']
        except urllib.error.HTTPError as e:
            sys.exit(f'ElevenLabs music upload: HTTP {e.code} {e.read().decode("utf-8", "replace")[:300]}')
        json.dump(ids, open(path, 'w'), indent=1)
    return ids[name]


def loopify(x: np.ndarray, length_s: float) -> np.ndarray:
    """End the loop where the pattern of hits best matches its start (4 s window, end searched in 65–90 % of the
    take), skip the first second (the take's attack), and cross-fade the tail into the head over 0.75 s."""
    hop, fps = 512, SR / 512
    mono = x.mean(1)
    fr = np.lib.stride_tricks.sliding_window_view(mono, 2048)[::hop] * np.hanning(2048)
    S = np.abs(np.fft.rfft(fr, axis=1))
    env = np.maximum(np.diff(np.log1p(S), axis=0), 0).sum(1)
    s0, w, fade = int(fps), int(4 * fps), int(0.75 * SR)
    a = env[s0:s0 + w]
    a = (a - a.mean()) / (a.std() + 1e-9)
    best, match = 0, -1.0
    for n in range(int(0.65 * length_s * fps), min(len(env) - s0 - w - fade // hop - 1, int(0.9 * length_s * fps))):
        b = env[s0 + n:s0 + n + w]
        c = float(np.dot(a, (b - b.mean()) / (b.std() + 1e-9)) / w)
        if c > match:
            best, match = n, c
    start, length = s0 * hop, best * hop
    y = x[start:start + length].copy()
    t = np.linspace(0, np.pi / 2, fade)[:, None]
    y[:fade] = x[start:start + fade] * np.sin(t) + x[start + length:start + length + fade] * np.cos(t)
    print(f'  loop {length / SR:.1f} s, seam match {match:.2f}')
    return y


def music(names: list[str]) -> None:
    for name in names or list(MUSIC):
        length, mood, styles, *ref = MUSIC[name]
        if not os.path.exists(music_raw(name)) or names:
            before = credits_left()
            if before < RESERVE + 6000:
                sys.exit(f'stopped at {name}: keeping the {RESERVE}-credit reserve')
            chunk = {'text': f'[Instrumental] {{{mood}}}', 'duration_ms': int(length * 1000), 'positive_styles': ['instrumental'] + styles,
                     'negative_styles': NOT_MUSIC}
            if ref:   # its key, pulse and mood from the sample, the rest from the text
                chunk.update({'context_adherence': 'high', 'condition_strength': 'medium',
                              'conditioning_ref': {'song_id': song_id(ref[0]), 'range': {'start_ms': 0, 'end_ms': 30000}}})
            raw = call('POST', '/v1/music?output_format=pcm_44100', {'composition_plan': {'chunks': [chunk]}, 'model_id': 'music_v2_5'},
                       accept='audio/pcm')
            os.makedirs(os.path.dirname(music_raw(name)), exist_ok=True)
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-', music_raw(name)],
                           input=raw, check=True)
            print(f'{name}: generated, {before - credits_left()} credits')
        y = loopify(pcm(music_raw(name), 2), length)
        peak = np.abs(y).max() + 1e-9
        rms = np.sqrt(np.mean(y ** 2)) + 1e-9
        y *= min(10 ** (-16 / 20) / rms, 10 ** (-1.5 / 20) / peak)   # about −16 dBFS RMS, peak under −1.5 dBFS, no limiter
        out = os.path.join(ROOT, 'assets/music', f'{name}.mp3')
        os.makedirs(os.path.dirname(out), exist_ok=True)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'libmp3lame',
                        '-b:a', '128k', out], input=y.astype(np.float32).tobytes(), check=True)
        print(f'{name}: {out}', flush=True)


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'check'
    if cmd == 'check':
        check()
    elif cmd == 'sfx':
        sfx(sys.argv[2:])
    elif cmd == 'music':
        music(sys.argv[2:])
    else:
        sys.exit(__doc__)
