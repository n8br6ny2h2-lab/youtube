#!/usr/bin/env python3
"""Kendi bestemiz, telifsiz yumuşak ninni (müzik kutusu + pad). Moonshelf TV hikâyeleri için.
Kullanım: python3 tools/muzik_ninni.py cikis.wav saniye [tohum]
"""
import sys, wave, numpy as np
out, dur = sys.argv[1], float(sys.argv[2]); seed = int(sys.argv[3]) if len(sys.argv) > 3 else 1
SR = 44100; n = int(SR * dur); mix = np.zeros(n); rng = np.random.default_rng(seed)
def hz(m): return 440 * 2 ** ((m - 69) / 12)
BEAT = 0.75   # yavaş (80 bpm)
# özgün melodi (C majör pentatonik ağırlıklı), 16 vuruşluk iki cümle
mel = [72, 76, 79, 76, 74, 72, 74, None, 72, 76, 79, 81, 79, 76, 74, None,
       77, 76, 74, 72, 74, 76, 72, None, 69, 72, 74, 76, 74, 72, 72, None]
chords = [[48, 55, 64], [45, 52, 60], [41, 48, 57], [43, 50, 59]]   # C - Am - F - G
def bell(f, L, amp):
    t = np.arange(int(SR * L)) / SR
    env = np.exp(-t * 2.2) * np.minimum(1, t / 0.005)
    return amp * env * (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t * 3) + 0.12 * np.sin(2 * np.pi * f * 3.0 * t) * np.exp(-t * 5))
def pad(fs, L, amp):
    t = np.arange(int(SR * L)) / SR
    env = np.minimum(1, t / 1.2) * np.minimum(1, (L - t) / 1.2)
    return amp * env * sum(np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.001 * t) for f in fs) / len(fs)
def add(sig, at):
    i = int(at * SR); k = min(len(sig), n - i)
    if k > 0: mix[i:i + k] += sig[:k]
t = 1.0; step = 0
while t < dur - 2:
    m = mel[step % len(mel)]
    if m is not None: add(bell(hz(m), 3.0, 0.22), t)
    if step % 4 == 0:   # her ölçüde akor
        c = chords[(step // 4) % 4]
        add(pad([hz(x) for x in c], BEAT * 4 + 1.0, 0.18), t)
        add(bell(hz(c[0] + 12), 3.0, 0.08), t)
    t += BEAT; step += 1
# basit yankı (reverb hissi)
for d, g in [(0.23, .35), (0.41, .25), (0.67, .18), (1.1, .1)]:
    k = int(d * SR); mix[k:] += g * mix[:-k] * 0.6
fade = np.minimum(1, np.arange(n) / SR / 3) * np.minimum(1, (dur - np.arange(n) / SR) / 4)
mix *= fade; mix /= np.max(np.abs(mix)) + 1e-9; mix *= 0.8
dl = int(0.015 * SR); R = np.concatenate([np.zeros(dl), mix[:-dl]])
st = (np.stack([mix, 0.8 * mix + 0.2 * R], 1) * 32767).astype(np.int16)
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
