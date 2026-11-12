#!/usr/bin/env python3
"""Kendi ürettiğimiz gök gürültüsü efekti (telifsiz).
Kullanım: python3 tools/ses_efekti.py cikis.wav toplam_saniye t1:guc t2:guc ...   (guc 0..1)
"""
import sys, wave, numpy as np
out, dur = sys.argv[1], float(sys.argv[2]); SR = 48000
n = int(SR * dur); mix = np.zeros(n); rng = np.random.default_rng(5)
def lowpass(x, a): 
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc += a * (x[i] - acc); y[i] = acc
    return y
for arg in sys.argv[3:]:
    t0, g = map(float, arg.split(':'))
    L = int(SR * 4.0); tt = np.arange(L) / SR
    crack = rng.standard_normal(L) * np.exp(-tt * 18) * 0.6
    rumble = lowpass(rng.standard_normal(L), 0.004) * 25
    rumble *= (1 - np.exp(-tt * 30)) * np.exp(-tt * 0.9) * (1 + 0.5 * np.sin(2 * np.pi * 1.7 * tt) * np.exp(-tt))
    s = (lowpass(crack, 0.08) * 3 + rumble) * g
    i0 = int(t0 * SR); k = min(L, n - i0)
    if k > 0: mix[i0:i0 + k] += s[:k]
mix /= max(1e-9, np.max(np.abs(mix))); mix *= 0.9
st = (np.stack([mix, mix], 1) * 32767).astype(np.int16)
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
