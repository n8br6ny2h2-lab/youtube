#!/usr/bin/env python3
"""Video kalite kontrolü: YouTube'a girecek her klip ve son video bu kontrolden geçer.

Kural (Kerem): kötü görüntü yok, en az Full HD (1920x1080), tercihen 4K.
Kullanım: python3 tools/kalite_kontrol.py dosya1.mp4 [dosya2.mp4 ...]
Çıkış kodu 0 = hepsi geçti, 1 = en az bir dosya kaldı.
"""
import json, subprocess, sys

MIN_W, MIN_H = 1920, 1080          # yatay video için en az Full HD
MIN_FPS = 24
MIN_MBPS = {1080: 4.0, 2160: 12.0}  # bunun altı "bulanık / çok sıkıştırılmış" sayılır


def probe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height,r_frame_rate,bit_rate,codec_name:format=duration,bit_rate",
         "-of", "json", path], capture_output=True, text=True, check=True).stdout
    d = json.loads(out)
    s, f = d["streams"][0], d["format"]
    num, den = (s["r_frame_rate"].split("/") + ["1"])[:2]
    br = s.get("bit_rate") or f.get("bit_rate") or 0
    return {"w": int(s["width"]), "h": int(s["height"]), "fps": float(num) / float(den or 1),
            "mbps": int(br) / 1e6, "sure": float(f.get("duration", 0)), "codec": s.get("codec_name")}


def check(path):
    try:
        p = probe(path)
    except Exception as e:  # dosya bozuk ya da video değil
        return False, f"okunamadı: {e}"
    long_side, short_side = max(p["w"], p["h"]), min(p["w"], p["h"])
    sorunlar = []
    if long_side < MIN_W or short_side < MIN_H:
        sorunlar.append(f"çözünürlük düşük ({p['w']}x{p['h']})")
    if p["fps"] < MIN_FPS:
        sorunlar.append(f"kare hızı düşük ({p['fps']:.0f} fps)")
    sinif = 2160 if short_side >= 2160 else 1080
    if p["mbps"] and p["mbps"] < MIN_MBPS[sinif]:
        sorunlar.append(f"bit hızı düşük ({p['mbps']:.1f} Mbps)")
    etiket = "4K" if short_side >= 2160 else ("Full HD" if short_side >= 1080 else "HD altı")
    ozet = f"{p['w']}x{p['h']} {etiket}, {p['fps']:.0f} fps, {p['mbps']:.1f} Mbps, {p['sure']:.1f} sn"
    return (not sorunlar), ozet + ("" if not sorunlar else " | " + "; ".join(sorunlar))


def main(paths):
    ok_all = True
    for path in paths:
        ok, msg = check(path)
        ok_all &= ok
        print(f"{'GEÇTİ ✅' if ok else 'KALDI ❌'}  {path}\n         {msg}")
    return 0 if ok_all else 1


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1:]))
