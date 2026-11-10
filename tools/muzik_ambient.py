#!/usr/bin/env python3
"""Telifsiz, kendi ürettiğimiz uzay ambiyans müziği (YouTube + TikTok için güvenli).
Kullanım: python3 tools/muzik_ambient.py cikis.wav saniye [tohum]
"""
import sys, wave, numpy as np
out, dur = sys.argv[1], float(sys.argv[2]); seed = int(sys.argv[3]) if len(sys.argv) > 3 else 1
SR = 44100; n = int(SR * dur); t = np.arange(n) / SR
rng = np.random.default_rng(seed)
def note(m): return 440 * 2 ** ((m - 69) / 12)
# Am - F - C - G (yavaş), her akor 6 sn
chords = [[45, 57, 60, 64], [41, 57, 60, 65], [48, 55, 60, 64], [43, 55, 59, 62]]
L = 6.0; mix = np.zeros(n)
for k in range(int(dur / L) + 2):
    c = chords[k % 4]; s0 = k * L
    env = np.clip((t - s0 + 1.5) / 3.0, 0, 1) * np.clip((s0 + L + 1.5 - t) / 3.0, 0, 1)
    env = env * env * (3 - 2 * env)
    for i, m in enumerate(c):
        f = note(m); det = 1 + 0.002 * (i - 1.5)
        v = np.sin(2*np.pi*f*det*t) + 0.5*np.sin(2*np.pi*f*2.003*t) + 0.25*np.sin(2*np.pi*f*3.01*t)
        mix += env * v * (0.6 if i == 0 else 0.35)
# yavaş parıltı (yüksek nota arpej)
for k in range(int(dur / 1.5)):
    s0 = k * 1.5 + rng.uniform(0, .3); f = note(rng.choice([72, 76, 79, 81, 84]))
    e = np.where(t >= s0, np.exp(-(t - s0) * 1.2), 0)
    mix += 0.12 * e * np.sin(2*np.pi*f*t)
# derin uğultu + gürültü dokusu
mix += 0.35 * np.sin(2*np.pi*note(33)*t) * (0.6 + 0.4*np.sin(2*np.pi*0.07*t))
noise = rng.standard_normal(n); k = np.ones(400) / 400
mix += 0.05 * np.convolve(noise, k, 'same') * 20
fade = np.clip(t / 2, 0, 1) * np.clip((dur - t) / 2.5, 0, 1)
mix *= fade; mix /= np.max(np.abs(mix)) + 1e-9; mix *= 0.8
# basit stereo genişlik
d = int(0.012 * SR); R = np.concatenate([np.zeros(d), mix[:-d]])
st = (np.stack([mix, 0.85*mix + 0.15*R], 1) * 32767).astype(np.int16)
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
