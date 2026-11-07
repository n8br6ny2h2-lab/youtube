"""Tanıtım videosu ses izi: oyunun prosedürel müziği + sahne olaylarına senkron efektler.
Kullanım: python3 promo/audio.py <events.json> <çıktı.wav> <video-adı>
Müzik, oyundaki MUSIC tanımlarıyla (js/services.js) aynı akor/tempo yapısını kullanır.
"""
import json, sys, wave
import numpy as np

SR = 44100
rng = np.random.default_rng(7)

def midi(n): return 440.0 * 2 ** ((n - 69) / 12)

def env(n, a=0.012, d=None):
    t = np.arange(n) / SR
    e = np.minimum(1, t / a) if a > 0 else np.ones(n)
    if d: e *= np.exp(-t / d)
    else: e *= np.linspace(1, 0, n) ** 1.6
    return e

def osc(kind, f, dur, slide=0.0):
    n = int(dur * SR); t = np.arange(n) / SR
    fr = f + slide * t / max(dur, 1e-3)
    ph = 2 * np.pi * np.cumsum(fr) / SR
    if kind == 'sine': w = np.sin(ph)
    elif kind == 'tri': w = 2 / np.pi * np.arcsin(np.sin(ph))
    elif kind == 'square': w = np.sign(np.sin(ph)) * 0.6
    else: w = 2 * ((ph / (2 * np.pi)) % 1) - 1  # saw
    return w

def lp(x, a=0.15):  # tek kutuplu alçak geçiren
    y = np.empty_like(x); s = 0.0
    for i, v in enumerate(x): s += a * (v - s); y[i] = s
    return y

def add(buf, x, t, vol=1.0, pan=0.0):
    i = int(t * SR)
    if i >= len(buf): return
    x = x[: len(buf) - i] * vol
    buf[i:i + len(x), 0] += x * (1 - max(0, pan))
    buf[i:i + len(x), 1] += x * (1 + min(0, pan))

def noise(dur): return rng.uniform(-1, 1, int(dur * SR))

# ---------------- müzik (oyundaki MUSIC ile aynı) ----------------
Am, F, C, G, Em = [57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62], [52, 55, 59]
Dm, Bb, A = [50, 53, 57], [53, 58, 62], [57, 61, 64]
MUSIC = {
    'menu':   dict(bpm=84,  prog=[Am, F, C, G],  lead='tri',    drums=False, drive=False),
    'battle': dict(bpm=126, prog=[Am, F, G, Em], lead='square', drums=True,  drive=False),
    'boss':   dict(bpm=142, prog=[Dm, Bb, C, A], lead='saw',    drums=True,  drive=True),
    'end':    dict(bpm=100, prog=[F, G, C, Am],  lead='tri',    drums=False, drive=False),
}

def kick(): n = int(.18 * SR); t = np.arange(n) / SR; f = 140 * (40 / 140) ** (t / .15); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .05) * 0.9
def snare(): x = noise(.14); return (x - lp(x, .2)) * env(len(x), .001, .045) * 0.5
def hat(): x = noise(.035); return (x - lp(x, .5)) * env(len(x), .001, .01) * 0.25

def music(buf, mode, t0, t1):
    M = MUSIC[mode]; spb = 60 / M['bpm'] / 4; step = 0; t = t0
    while t < t1:
        s = step % 16; ch = M['prog'][(step // 16) % len(M['prog'])]
        if s == 0:
            for n_ in ch: add(buf, osc('sine', midi(n_), spb * 16) * env(int(spb * 16 * SR), .2), t, .05)
        if s % 4 == 0 or (M['drive'] and s % 2 == 0):
            d = spb * (1.8 if M['drive'] else 3.5)
            add(buf, lp(osc('tri', midi(ch[0] - 12), d), .3) * env(int(d * SR), .01), t, .26)
        if s % 2 == 0:
            arp = [0, 1, 2, 1, 0, 2, 1, 2][(s // 2) % 8]; d = spb * 1.6
            add(buf, lp(osc(M['lead'], midi(ch[arp] + 12), d), .25) * env(int(d * SR), .008), t, .07, pan=(0.3 if s % 4 else -0.3))
        if M['drums']:
            if s % 4 == 0: add(buf, kick(), t, .55)
            if s % 8 == 4: add(buf, snare(), t, .5)
            if s % 2 == 1: add(buf, hat(), t, .5, pan=.4)
        step += 1; t = t0 + step * spb

# ---------------- efektler ----------------
def sfx(buf, kind, t):
    if kind == 'whoosh':
        x = noise(.38); y = lp(x, .05) * 0.5 + (x - lp(x, .4)) * 0.2
        add(buf, y * np.sin(np.linspace(0, np.pi, len(y))) ** 2, t, .55)
    elif kind == 'boss':
        add(buf, lp(osc('saw', 82, 1.1, -35), .08) * env(int(1.1 * SR), .02), t, .55)
        add(buf, lp(noise(.7), .05) * env(int(.7 * SR), .01), t, .4)
        add(buf, kick(), t, .8)
    elif kind == 'boom':
        add(buf, lp(noise(.6), .07) * env(int(.6 * SR), .002, .18), t, .9)
        add(buf, osc('sine', 90, .45, -55) * env(int(.45 * SR), .002), t, .7)
    elif kind in ('win', 'level', 'legend', 'end'):
        notes = {'win': [523, 659, 784, 659, 784, 1046], 'level': [523, 659, 784, 1046],
                 'legend': [392, 523, 659, 784, 1046, 1318], 'end': [523, 784, 1046, 1318]}[kind]
        gap = {'win': .11, 'level': .07, 'legend': .08, 'end': .09}[kind]
        for i, f in enumerate(notes):
            d = .32 if kind != 'level' else .16
            add(buf, osc('tri', f, d) * env(int(d * SR), .005), t + i * gap, .3, pan=(-.2 if i % 2 else .2))
        if kind in ('legend', 'end'):
            x = noise(.9); add(buf, (x - lp(x, .6)) * env(len(x), .05, .35), t + .35, .12)
            for f in ([523, 659, 784] if kind == 'end' else [392, 494, 587]):
                add(buf, osc('sine', f, 1.6) * env(int(1.6 * SR), .05, .7), t + .4, .08)

def hits(buf, t0, t1, rate=9):
    t = t0
    while t < t1:
        if rng.random() < .55: add(buf, osc('square', rng.uniform(160, 220), .05, -80) * env(int(.05 * SR), .001), t, .08, pan=rng.uniform(-.5, .5))
        else: add(buf, osc('square', rng.uniform(480, 620), .08, 300) * env(int(.08 * SR), .001), t, .06, pan=rng.uniform(-.5, .5))
        t += rng.exponential(1 / rate)

PLAN = {
    'boss':  dict(music=[(0, 'battle'), (2.7, 'boss'), (11.6, None), (14.5, 'end')], hits=[(0.2, 11.5)]),
    'guc':   dict(music=[(0, 'menu'), (10.8, 'battle'), (14.8, 'end')], hits=[(10.9, 14.8)]),
    'kombo': dict(music=[(0, 'battle'), (8.0, 'menu'), (10.6, 'battle'), (13.8, 'end')], hits=[(0.2, 8.0), (10.6, 13.8)]),
}

def main():
    ev = json.load(open(sys.argv[1])); out = sys.argv[2]; name = sys.argv[3]
    dur = ev['duration']; buf = np.zeros((int((dur + .5) * SR), 2))
    plan = PLAN[name]; segs = plan['music'] + [(dur, None)]
    for (t0, m), (t1, _) in zip(segs, segs[1:]):
        if m: music(buf, m, t0, t1)
    for a, b in plan['hits']: hits(buf, a, b)
    for e in ev['events']: sfx(buf, e['type'], e['t'])
    buf = buf[: int(dur * SR)]
    fade = int(.6 * SR); buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    buf = np.tanh(buf * 1.4) / np.tanh(1.4)                  # yumuşak sıkıştırma
    buf *= 0.89 / max(1e-6, np.abs(buf).max())               # tepe -1 dB
    pcm = (buf * 32767).astype('<i2')
    with wave.open(out, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print(f'{name}: {dur:.1f} sn ses yazıldı')

if __name__ == '__main__':
    main()
