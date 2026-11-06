"""HTML/SVG -> PNG (logo, banner, karakter kartları, kapaklar) için başsız Chrome."""
from __future__ import annotations

import os
import shutil
from pathlib import Path

from playwright.sync_api import sync_playwright

from .config import Paths


def _chrome() -> str | None:
    for cand in (os.environ.get("CHROME_PATH"), "/opt/pw-browsers/chromium", shutil.which("google-chrome"),
                 shutil.which("chromium"), shutil.which("chromium-browser")):
        if cand and Path(cand).exists():
            if Path(cand).is_dir():
                for sub in Path(cand).rglob("chrome"):
                    if sub.is_file() and os.access(sub, os.X_OK):
                        return str(sub)
                continue
            return cand
    return None


def font_css() -> str:
    f = (Paths.templates / "fonts").as_uri()
    return f"""
@font-face{{font-family:'Baloo 2';font-weight:800;src:url('{f}/baloo-2-latin-ext-800-normal.woff2') format('woff2');unicode-range:U+0100-02AF,U+0304,U+0308,U+0329,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF;}}
@font-face{{font-family:'Baloo 2';font-weight:800;src:url('{f}/baloo-2-latin-800-normal.woff2') format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}}
@font-face{{font-family:'Nunito';font-weight:900;src:url('{f}/nunito-latin-ext-900-normal.woff2') format('woff2');unicode-range:U+0100-02AF,U+0304,U+0308,U+0329,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF;}}
@font-face{{font-family:'Nunito';font-weight:900;src:url('{f}/nunito-latin-900-normal.woff2') format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}}
@font-face{{font-family:'Nunito';font-weight:800;src:url('{f}/nunito-latin-ext-800-normal.woff2') format('woff2');unicode-range:U+0100-02AF,U+0304,U+0308,U+0329,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF;}}
@font-face{{font-family:'Nunito';font-weight:800;src:url('{f}/nunito-latin-800-normal.woff2') format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}}
"""


def html_page(body: str, width: int, height: int, css: str = "", transparent: bool = False) -> str:
    bg = "transparent" if transparent else "#fff"
    return (
        f"<!doctype html><html><head><meta charset='utf-8'><style>{font_css()}"
        f"html,body{{margin:0;width:{width}px;height:{height}px;overflow:hidden;background:{bg}}}"
        f"*{{box-sizing:border-box}}{css}</style></head><body>{body}"
        "<div style='position:absolute;left:-9999px;top:0'><span style=\"font:800 20px 'Baloo 2'\">Ağ</span>"
        "<span style='font:900 20px Nunito'>Ağ</span><span style='font:800 20px Nunito'>Ağ</span></div></body></html>"
    )


def render_many(jobs: list[tuple[str, int, int, Path]], transparent: bool = False) -> list[Path]:
    """jobs: (html, width, height, out_path). Tek tarayıcı açılışıyla hepsini işler."""
    out = []
    tmp = Paths.scenes / "_static"
    tmp.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        exe = _chrome()
        browser = p.chromium.launch(executable_path=exe, args=["--no-sandbox", "--allow-file-access-from-files"]) if exe else p.chromium.launch()
        for i, (html, w, h, path) in enumerate(jobs):
            page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
            f = tmp / f"page_{os.getpid()}_{i}.html"
            f.write_text(html, encoding="utf-8")
            page.goto(f.as_uri())
            page.evaluate("""async () => { await Promise.all([document.fonts.load("800 40px 'Baloo 2'", 'Ağş'),
                document.fonts.load("900 40px Nunito", 'Ağş'), document.fonts.load("800 40px Nunito", 'Ağş')]);
                await document.fonts.ready; }""")
            page.wait_for_timeout(150)
            path.parent.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(path), omit_background=transparent, type="png")
            page.close()
            f.unlink(missing_ok=True)
            out.append(path)
        browser.close()
    return out


def render(html: str, width: int, height: int, path: Path, transparent: bool = False) -> Path:
    return render_many([(html, width, height, path)], transparent)[0]
