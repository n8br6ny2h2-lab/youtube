"""İki kanalın haftalık planını üretir ve plans/<hafta>.md olarak birleştirir.
Kullanım: python scripts/weekly_plan.py [0|1]   (0 = bu hafta, 1 = gelecek hafta; varsayılan 1)"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
offset = int(sys.argv[1]) if len(sys.argv) > 1 else 1
code = ("import json,sys; from studio import pipeline, planner; pipeline.setup(); "
        f"print('JSON'+json.dumps(planner.write({offset}), ensure_ascii=False))")
parts, week = [], None
for ch in ("bulutkent", "gece"):
    if ch == "gece" and not (ROOT / "channels/gece/secrets/token.json").exists():
        continue
    r = subprocess.run([sys.executable, "-c", code], cwd=ROOT, capture_output=True, text=True,
                       env={**__import__("os").environ, "BK_CHANNEL": ch})
    line = next((ln for ln in r.stdout.splitlines() if ln.startswith("JSON")), None)
    if not line:
        print(f"{ch}: plan üretilemedi\n{r.stderr[-800:]}")
        continue
    res = json.loads(line[4:])
    week = res["week"]
    parts.append(Path(res["path"]).read_text(encoding="utf-8"))
if week:
    out = ROOT / "plans" / f"{week}.md"
    head = [f"# Haftalık Plan {week}", "",
            "Plan her gece yenilenir. Uzun video slotları doluysa o gece üretim yapılmaz; boş slotlar için en yüksek puanlı tema üretilir.",
            "Tema puanı: trend radarı (YouTube popüler + mevsim) ve yeterli veri olduğunda kanalımızın kendi izlenme verisi (%50).",
            "Google denetimi onaylanana kadar API yüklemeleri özel kalır: 'YouTube'da' olanları Studio'dan aynı saate planlayın.", ""]
    out.write_text("\n".join(head) + "\n".join(parts), encoding="utf-8")
    print(out)
