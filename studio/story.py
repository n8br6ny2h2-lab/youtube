"""Hikâye ve senaryo motoru.

Çıktı her zaman aynı JSON yapısındadır (STORY_SCHEMA): sahneler, konuşmalar (beat), duygular,
hareketler, nesneler, ses efektleri ve Shorts adayları. Claude varsa özgün senaryo Claude'a
yazdırılır; yoksa yerel şablon motoru parametrik ve tekrar etmeyen hikâyeler üretir.
"""
from __future__ import annotations

import hashlib
import json
import random
from pathlib import Path

from loguru import logger

from . import db, llm, safety
from .characters import ACTIONS, CHARACTERS, EMOTIONS, bible
from .config import Paths
from .world import BACKGROUNDS, COLORS, PROPS

CATEGORIES = {
    "colors": "Renkler", "numbers": "Sayılar", "shapes": "Şekiller", "sharing": "Paylaşma",
    "friendship": "Arkadaşlık", "animal_adventure": "Hayvan maceraları", "educational": "Eğitici hikâyeler",
    "riddles": "Eğlenceli bilmeceler", "songs": "Özgün çocuk şarkıları / ritimler", "bedtime": "Uyku öncesi",
    "funny": "Komik maceralar",
}
SLOTS = ["left", "center", "right", "left2", "right2"]
SFX = ["pop", "boing", "whoosh", "sparkle", "ding", "tada", "splash", "drum", "clap", "rain", "giggle"]
MUSIC = ["happy", "calm", "adventure", "lullaby", "silly", "mystery"]
CHAR_IDS = [c for c in CHARACTERS if c != "bulut"]

STORY_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["title", "thumb_text", "category", "learning_goal", "moral", "summary", "hook", "scenes", "shorts_candidates", "tags"],
    "properties": {
        "title": {"type": "string"},
        "thumb_text": {"type": "string", "description": "Kapak için 1-3 kelimelik, büyük yazılacak kısa metin"},
        "category": {"type": "string", "enum": list(CATEGORIES)},
        "learning_goal": {"type": "string"},
        "moral": {"type": "string"},
        "summary": {"type": "string"},
        "hook": {"type": "string"},
        "tags": {"type": "array", "items": {"type": "string"}},
        "scenes": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["id", "background", "music", "characters", "props", "beats"],
                "properties": {
                    "id": {"type": "string"},
                    "background": {"type": "string", "enum": list(BACKGROUNDS)},
                    "music": {"type": "string", "enum": MUSIC},
                    "characters": {
                        "type": "array",
                        "items": {
                            "type": "object", "additionalProperties": False,
                            "required": ["id", "slot", "facing"],
                            "properties": {
                                "id": {"type": "string", "enum": CHAR_IDS},
                                "slot": {"type": "string", "enum": SLOTS},
                                "facing": {"type": "string", "enum": ["left", "right"]},
                            },
                        },
                    },
                    "props": {
                        "type": "array",
                        "items": {
                            "type": "object", "additionalProperties": False,
                            "required": ["kind", "color", "label"],
                            "properties": {
                                "kind": {"type": "string", "enum": PROPS},
                                "color": {"type": "string", "enum": list(COLORS)},
                                "label": {"type": "string"},
                            },
                        },
                    },
                    "beats": {
                        "type": "array",
                        "items": {
                            "type": "object", "additionalProperties": False,
                            "required": ["speaker", "text", "emotion", "action", "sfx", "show_prop"],
                            "properties": {
                                "speaker": {"type": "string", "enum": ["narrator", *CHAR_IDS]},
                                "text": {"type": "string"},
                                "emotion": {"type": "string", "enum": EMOTIONS},
                                "action": {"type": "string", "enum": ACTIONS},
                                "sfx": {"type": "string", "enum": ["none", *SFX]},
                                "show_prop": {"type": "integer"},
                            },
                        },
                    },
                },
            },
        },
        "shorts_candidates": {
            "type": "array",
            "items": {
                "type": "object", "additionalProperties": False,
                "required": ["title", "scene_ids", "hook_text"],
                "properties": {
                    "title": {"type": "string"},
                    "scene_ids": {"type": "array", "items": {"type": "string"}},
                    "hook_text": {"type": "string"},
                },
            },
        },
    },
}

SYSTEM_PROMPT = """Sen 2-8 yaş çocuklar için Türkçe özgün animasyon senaryoları yazan ödüllü bir çocuk yazarısın.
Kanal: Bulutkent. Anlatıcı: Bulut (konuşan bulut). Karakterler aşağıdaki karakter kitabındadır; kişiliklerine,
konuşma biçimlerine ve sloganlarına sadık kal. Başka markaların karakterlerini, şarkılarını veya hikâyelerini asla kullanma.

Kurallar:
- Çok kısa, net, sıcak cümleler (bir konuşma en fazla 14 kelime). Basit kelimeler, tekrar ve ritim kullan.
- İlk konuşma (hook) ilk 3 saniyede merak uyandırsın; soru veya şaşırtıcı bir an olsun.
- Tek bir öğrenme hedefi; anlatıcı izleyiciye arada doğrudan soru sorsun ve kısa bir düşünme payı bıraksın.
- Korku, şiddet, tehlikeli davranış (ateş, priz, yüksekten atlama, yabancıyla gitme vb.), alay, yanıltıcı başlık YOK.
- Her sahnede en fazla 3 karakter; sahne 4-8 konuşma. Toplam 5-7 sahne, yaklaşık 2-3 dakika.
- show_prop: o konuşmada ekrana getirilecek nesnenin sahnedeki props dizisindeki sırası (0'dan başlar), yoksa -1.
- sfx yoksa "none". Nesne etiketi yoksa label boş dize.
- shorts_candidates: 2-3 adet; her biri tek başına anlaşılan, başı-sonu olan mini hikâye oluşturan ardışık 1-2 sahne,
  15-55 saniye. hook_text izleyiciyi merakla başlatan kısa bir anlatıcı cümlesi.
- Başlık: kısa, dürüst, merak uyandıran; büyük harf veya ünlem yağmuru yok.
- thumb_text: kapakta büyük yazılacak 1-3 kelime (ör. "Kayıp Renkler!"), yanıltıcı olmasın."""


def _fingerprint(story: dict) -> str:
    core = json.dumps([story.get("title"), [[b["text"] for b in s["beats"]] for s in story["scenes"]]], ensure_ascii=False)
    return hashlib.sha256(core.encode()).hexdigest()[:16]


# --------------------------------------------------------------------------- yerel şablon motoru

def B(speaker, text, emotion="happy", action="talk", sfx="none", show=-1):
    return {"speaker": speaker, "text": text, "emotion": emotion, "action": action, "sfx": sfx, "show_prop": show}


def S(sid, bg, music, chars, beats, props=None):
    return {"id": sid, "background": bg, "music": music,
            "characters": [{"id": c, "slot": s, "facing": f} for c, s, f in chars], "props": props or [], "beats": beats}


def P(kind, color, label=""):
    return {"kind": kind, "color": color, "label": label}


def _cast(rnd, n):
    return rnd.sample(CHAR_IDS, n)


def _nm(cid):
    return CHARACTERS[cid].name


COLOR_OBJECTS = [("kırmızı", "apple", "elma"), ("sarı", "flower", "çiçek"), ("mavi", "balloon", "balon"),
                 ("yeşil", "leaf", "yaprak"), ("turuncu", "carrot", "havuç"), ("mor", "flower", "menekşe"),
                 ("pembe", "heart", "kalp"), ("kırmızı", "strawberry", "çilek"), ("mavi", "ball", "top"),
                 ("sarı", "star", "yıldız")]


def t_colors(rnd):
    a, b, c = _cast(rnd, 3)
    picks, seen = [], set()
    for col, kind, word in rnd.sample(COLOR_OBJECTS, len(COLOR_OBJECTS)):
        if col not in seen:
            picks.append((col, kind, word)); seen.add(col)
        if len(picks) == 3:
            break
    places = rnd.sample(["meadow", "garden", "forest", "village", "lake"], 3)
    title = f"{_nm(a)} ve Kayıp Renkler"
    scenes = [
        S("s1", "meadow", "mystery", [(a, "left", "right"), (b, "right", "left")], [
            B(a, "Aaa! Gökkuşağının renkleri nereye gitti?", "surprised", "look_around", "whoosh"),
            B("narrator", f"Bulutkent'te yağmur yeni dinmişti. Ama gökkuşağı bembeyazdı!", "calm", "idle"),
            B(b, "Renkler saklanmış olabilir mi?", "thinking", "think"),
            B(a, f"{CHARACTERS[a].catchphrase} Renkleri birlikte bulalım!", "excited", "jump", "boing"),
            B("narrator", "Sen de bize yardım eder misin? Hadi, renkleri arayalım!", "happy", "idle"),
        ]),
    ]
    for i, (col, kind, word) in enumerate(picks):
        who = [a, b, c][i % 3]
        other = [a, b, c][(i + 1) % 3]
        scenes.append(S(f"s{i+2}", places[i], "adventure", [(who, "left", "right"), (other, "right", "left")], [
            B("narrator", f"Bakın! Şurada bir şey parlıyor. Sence bu ne renk?", "happy", "idle", "sparkle"),
            B(who, f"Bu bir {word}! Rengi de {col}!", "excited", "point", "pop", 0),
            B(other, f"{col.capitalize()}! Çok güzel bir renk!", "happy", "clap"),
            B("narrator", f"Sen de söyle: {col}!", "happy", "idle"),
            B(who, f"{col.capitalize()} rengi gökkuşağına geri dönsün!", "laughing", "spin", "sparkle"),
        ], [P(kind, col, col)]))
    scenes.append(S(f"s{len(picks)+2}", "meadow", "happy", [(a, "left", "right"), (c, "center", "right"), (b, "right", "left")], [
        B("narrator", "Ve gökkuşağı yeniden renklendi!", "excited", "idle", "tada"),
        B(c, "Vay canına! " + ", ".join(p[0] for p in picks) + "... Hepsi burada!", "excited", "jump", "boing"),
        B(b, "Birlikte aradık, birlikte bulduk!", "happy", "dance"),
        B(a, "Sen de çok yardım ettin, teşekkürler!", "happy", "wave"),
        B("narrator", "Sence en sevdiğin renk hangisi? Etrafına bak, o rengi bulabilir misin?", "happy", "idle"),
    ]))
    return {"title": title, "category": "colors", "learning_goal": "Renkleri tanıma: " + ", ".join(p[0] for p in picks),
            "moral": "Birlikte aramak her şeyi kolaylaştırır.", "summary": f"{_nm(a)} ve arkadaşları gökkuşağının kayıp renklerini nesnelerde arar.",
            "hook": scenes[0]["beats"][0]["text"], "tags": ["renkler", "renkleri öğreniyorum"] + [p[0] for p in picks],
            "scenes": scenes,
            "shorts_candidates": [{"title": f"{picks[0][0].capitalize()} rengini bulduk!", "scene_ids": ["s2"], "hook_text": "Bu ne renk? Hadi birlikte bulalım!"},
                                  {"title": "Gökkuşağı geri geldi!", "scene_ids": [f"s{len(picks)+1}", f"s{len(picks)+2}"], "hook_text": "Gökkuşağının son rengi nerede saklanıyor?"}]}


FRUITS = [("strawberry", "kırmızı", "çilek"), ("apple", "kırmızı", "elma"), ("carrot", "turuncu", "havuç")]


def t_numbers(rnd):
    a, b, c, d = _cast(rnd, 4)
    n = rnd.choice([3, 4, 5])
    kind, col, word = rnd.choice(FRUITS)
    nums = ["bir", "iki", "üç", "dört", "beş", "altı"]
    count_beats = [B(a if i % 2 == 0 else b, f"{nums[i].capitalize()}!", "excited", "point", "pop", i) for i in range(n)]
    scenes = [
        S("s1", "garden", "happy", [(a, "left", "right"), (b, "right", "left")], [
            B(a, f"Bugün büyük piknik günü! Ama kaç {word} lazım?", "surprised", "look_around", "whoosh"),
            B("narrator", f"{_nm(a)} ve {_nm(b)} bahçede {word} topluyordu.", "calm", "idle"),
            B(b, "Her arkadaşımıza bir tane. Hadi sayalım!", "happy", "nod"),
            B("narrator", "Sen de parmaklarınla bizimle say!", "happy", "idle"),
        ]),
        S("s2", "garden", "happy", [(a, "left", "right"), (b, "right", "left")],
          count_beats + [B("narrator", f"Tam {nums[n-1]} {word}! Aferin sana!", "excited", "idle", "ding"),
                         B(a, "Hepsini sepete koyalım!", "happy", "hop")],
          [P("number", col, str(i + 1)) for i in range(n)]),
        S("s3", "meadow", "silly", [(a, "left", "right"), (c, "center", "left"), (d, "right", "left")], [
            B(c, "Merhaba! Biz de pikniğe geldik!", "happy", "wave"),
            B(d, "Ben de geldim! Hapşu! Ups, pardon!", "laughing", "sneeze", "boing"),
            B(a, f"Eyvah! Şimdi kaç kişiyiz? Bir {word} eksik mi?", "surprised", "think"),
            B("narrator", f"Sence {nums[n-1]} {word} herkese yeter mi? Biraz düşün.", "thinking", "idle"),
        ]),
        S("s4", "meadow", "happy", [(a, "left", "right"), (c, "center", "left"), (d, "right", "left")], [
            B(c, "Hiç sorun değil! Ben benimkini ikiye bölerim.", "happy", "nod"),
            B(d, "Paylaşınca herkese yetiyor!", "excited", "clap", "clap"),
            B("narrator", f"Bölüşmek de matematik! Bir {word}, iki yarım olur.", "happy", "idle", "sparkle"),
            B(a, "Afiyet olsun arkadaşlar!", "laughing", "dance"),
        ], [P(kind, col, "")]),
        S("s5", "meadow", "calm", [(a, "left", "right"), (b, "center", "right"), (d, "right", "left")], [
            B("narrator", f"Bugün {n}'e kadar saydık ve paylaşmayı öğrendik.", "happy", "idle"),
            B(b, "Sen evde kaç şey sayabilirsin? Oyuncaklarını say bakalım!", "happy", "point"),
            B(a, "Bir sonraki maceraya kadar hoşça kal!", "happy", "wave"),
        ]),
    ]
    return {"title": f"{_nm(a)} ile {nums[n-1].capitalize()} {word.capitalize()} Sayalım", "category": "numbers",
            "learning_goal": f"1'den {n}'e kadar sayma ve paylaşma", "moral": "Paylaşınca herkese yeter.",
            "summary": f"Piknik için {word} sayılır, sürpriz bir misafir gelince paylaşmak gerekir.",
            "hook": scenes[0]["beats"][0]["text"], "tags": ["sayılar", "sayı sayma", "paylaşma", word],
            "scenes": scenes,
            "shorts_candidates": [{"title": f"Hadi {n}'e kadar sayalım!", "scene_ids": ["s2"], "hook_text": f"Kaç {word} var? Birlikte sayalım!"},
                                  {"title": "Bir eksik! Ne yapacağız?", "scene_ids": ["s3", "s4"], "hook_text": f"Piknikte bir {word} eksik çıktı!"}]}


SHAPES = [("circle", "daire", "Yuvarlak, köşesi hiç yok", "güneş gibi"), ("triangle", "üçgen", "Üç kenarı, üç köşesi var", "çatı gibi"),
          ("square", "kare", "Dört kenarı eşit", "pencere gibi"), ("star", "yıldız", "Beş ucu var, parlar", "gökyüzündeki gibi"),
          ("heart", "kalp", "Sevgi demek", "kocaman bir sevgi gibi")]


def t_shapes(rnd):
    host = "tombi"
    a, b = rnd.sample([c for c in CHAR_IDS if c != host], 2)
    shapes = rnd.sample(SHAPES, 3)
    cols = rnd.sample(["kırmızı", "mavi", "sarı", "yeşil", "mor", "turuncu"], 3)
    places = rnd.sample(["village", "home", "garden", "lake"], 3)
    scenes = [S("s1", "meadow", "mystery", [(host, "left", "right"), (a, "center", "left"), (b, "right", "left")], [
        B(host, "Bugün size gizemli bir şekil avı hazırladım.", "happy", "nod", "sparkle"),
        B(a, "Şekil avı mı? Ne demek o?", "surprised", "look_around"),
        B(host, "İpucunu dinleyin, şekli bulun. Acele etme, adım adım!", "calm", "point"),
        B("narrator", "Sen de gözlerini aç, şekilleri birlikte bulalım!", "happy", "idle"),
    ])]
    for i, (kind, name, clue, like) in enumerate(shapes):
        who = [a, b, a][i]
        scenes.append(S(f"s{i+2}", places[i], "adventure", [(host, "left", "right"), (who, "right", "left")], [
            B(host, f"İpucu: {clue}. {like.capitalize()}.", "thinking", "think"),
            B("narrator", "Sence hangi şekil? Biraz düşün...", "thinking", "idle"),
            B(who, f"Buldum! Bu bir {name}!", "excited", "jump", "pop", 0),
            B(host, f"Aferin! {name.capitalize()}! Hem de {cols[i]} bir {name}.", "happy", "clap", "ding"),
            B("narrator", f"Parmağınla havaya bir {name} çiz!", "happy", "idle"),
        ], [P(kind, cols[i], name)]))
    scenes.append(S("s5", "meadow", "happy", [(host, "left", "right"), (a, "center", "right"), (b, "right", "left")], [
        B("narrator", "Şekil avı bitti! Kaç şekil bulduk?", "excited", "idle", "tada"),
        B(a, ", ".join(s[1] for s in shapes).capitalize() + "!", "excited", "dance"),
        B(b, "Etrafımız şekillerle dolu!", "happy", "spin"),
        B(host, "Evde de bir şekil avına çıkabilirsin. Hoşça kal!", "happy", "wave"),
    ], [P(s[0], cols[i], s[1]) for i, s in enumerate(shapes)]))
    return {"title": "Tombi'nin Şekil Avı: " + ", ".join(s[1].capitalize() for s in shapes), "category": "shapes", "thumb_text": "Şekil Avı!",
            "learning_goal": "Şekilleri tanıma: " + ", ".join(s[1] for s in shapes), "moral": "Dikkatle bakınca her yerde şekil vardır.",
            "summary": "Tombi ipuçları verir, arkadaşları şekilleri bulur.", "hook": scenes[0]["beats"][0]["text"],
            "tags": ["şekiller", "şekilleri öğreniyorum"] + [s[1] for s in shapes], "scenes": scenes,
            "shorts_candidates": [{"title": f"Bu hangi şekil? İpucu: {shapes[0][3]}", "scene_ids": ["s2"], "hook_text": "Bu ipucu hangi şekli anlatıyor?"},
                                  {"title": f"{shapes[1][1].capitalize()} nerede saklanıyor?", "scene_ids": ["s3"], "hook_text": "Yeni bir ipucu geldi! Bil bakalım!"}]}


SHARE_ITEMS = [("umbrella", "kırmızı", "şemsiye", "rain", "Yağmur yağıyor!"), ("kite", "mavi", "uçurtma", "whoosh", "Rüzgâr esiyor!"),
               ("ball", "turuncu", "top", "boing", "Top oynamak ne güzel!"), ("drum", "kırmızı", "davul", "drum", "Ritim zamanı!")]


def t_sharing(rnd):
    a, b, c = _cast(rnd, 3)
    kind, col, word, sfx, line = rnd.choice(SHARE_ITEMS)
    bg = "village" if kind == "umbrella" else "meadow"
    scenes = [
        S("s1", bg, "happy", [(a, "center", "right")], [
            B(a, f"Bakın! Yepyeni bir {word}! Benim!", "excited", "jump", "sparkle", 0),
            B("narrator", f"{_nm(a)} yeni oyuncağını çok seviyordu.", "happy", "idle"),
            B(a, line, "happy", "spin", sfx),
        ], [P(kind, col, "")]),
        S("s2", bg, "calm", [(a, "left", "right"), (b, "center", "left"), (c, "right", "left")], [
            B(b, f"Ne güzel {word}! Ben de biraz deneyebilir miyim?", "shy", "talk"),
            B(a, "Hayır! O benim!", "grumpy", "shake_head"),
            B(c, "Ama biz de çok istiyoruz...", "sad", "talk"),
            B("narrator", f"{_nm(b)} ve {_nm(c)} üzüldü. Sence {_nm(a)} ne yapmalı?", "thinking", "idle"),
        ], [P(kind, col, "")]),
        S("s3", bg, "calm", [(a, "center", "right")], [
            B(a, "Hmm... Tek başıma oynamak hiç eğlenceli değil.", "thinking", "think"),
            B("narrator", "Bazen paylaşmak zor gelir. Ama paylaşınca kalp ısınır.", "calm", "idle"),
            B(a, "Buldum! Sırayla oynayabiliriz!", "excited", "jump", "ding"),
        ]),
        S("s4", bg, "happy", [(a, "left", "right"), (b, "center", "left"), (c, "right", "left")], [
            B(a, "Arkadaşlar, oyuncağımı paylaşmak istiyorum. Önce sen dene!", "happy", "point", "pop", 0),
            B(b, "Gerçekten mi? Teşekkür ederim!", "excited", "clap", "clap"),
            B(c, "Sonra ben, sonra yine sen!", "laughing", "dance"),
            B(a, "Birlikte oynamak çok daha eğlenceli!", "laughing", "jump", "boing"),
        ], [P(kind, col, "")]),
        S("s5", "meadow", "happy", [(a, "left", "right"), (b, "center", "right"), (c, "right", "left")], [
            B("narrator", "Paylaşmak, mutluluğu ikiye katlar.", "happy", "idle", "sparkle"),
            B(b, "Sen bugün neyi paylaşabilirsin?", "happy", "point"),
            B(a, "Hoşça kal, yine görüşelim!", "happy", "wave"),
        ]),
    ]
    return {"title": f"{_nm(a)} ve Yeni {word.capitalize()}: Paylaşmak Güzeldir", "category": "sharing", "thumb_text": "Paylaşmak Güzel",
            "learning_goal": "Paylaşma ve sırayla oynama", "moral": "Paylaşınca mutluluk çoğalır.",
            "summary": f"{_nm(a)} yeni {word} oyuncağını önce paylaşmak istemez, sonra sırayla oynamayı keşfeder.",
            "hook": scenes[0]["beats"][0]["text"], "tags": ["paylaşma", "arkadaşlık", word], "scenes": scenes,
            "shorts_candidates": [{"title": f"{_nm(a)} paylaşmayı öğreniyor", "scene_ids": ["s3", "s4"], "hook_text": f"{_nm(a)} çok önemli bir karar verecek!"}]}


def t_friendship(rnd):
    lost_owner = "lili"
    a, b = rnd.sample([c for c in CHAR_IDS if c != lost_owner], 2)
    item = rnd.choice([("gift", "mor", "fiyonk kutusu"), ("paintbrush", "mor", "boya fırçası"), ("book", "mavi", "resim defteri")])
    kind, col, word = item
    places = rnd.sample(["forest", "lake", "garden", "village"], 2)
    scenes = [
        S("s1", "home", "calm", [(lost_owner, "center", "right")], [
            B(lost_owner, f"Eyvah! En sevdiğim {word} nerede?", "sad", "look_around", "whoosh"),
            B("narrator", f"Lili en sevdiği eşyayı bulamıyordu: {word}!", "sad", "idle"),
            B(lost_owner, "Tek başıma nasıl bulacağım?", "sad", "cry"),
        ]),
        S("s2", "village", "calm", [(lost_owner, "left", "right"), (a, "center", "left"), (b, "right", "left")], [
            B(a, "Lili, neden üzgünsün?", "surprised", "talk"),
            B(lost_owner, f"En sevdiğim {word} kayboldu.", "sad", "talk"),
            B(b, "Üzülme! Arkadaşlar ne içindir? Birlikte ararız!", "happy", "hop", "boing"),
            B("narrator", "Üzgün olunca yardım istemek çok güzel bir şeydir.", "calm", "idle"),
        ]),
        S("s3", places[0], "adventure", [(a, "left", "right"), (lost_owner, "right", "left")], [
            B(a, "Burada mı acaba? Çalıların arkasına bakalım!", "thinking", "look_around"),
            B("narrator", "Sence burada mı? Dikkatle bak!", "thinking", "idle"),
            B(a, f"Burada yok ama bir ipucu buldum: {col} bir iz!", "surprised", "point", "sparkle"),
        ]),
        S("s4", places[1], "adventure", [(b, "left", "right"), (lost_owner, "right", "left")], [
            B(b, f"{col.capitalize()} iz buraya geliyor. Adım adım takip edelim!", "happy", "walk_in"),
            B(lost_owner, "İşte! Orada! Buldum!", "excited", "jump", "tada", 0),
            B(b, "Rüzgâr uçurmuş olmalı!", "laughing", "laugh"),
        ], [P(kind, col, "")]),
        S("s5", "village", "happy", [(lost_owner, "left", "right"), (a, "center", "left"), (b, "right", "left")], [
            B(lost_owner, "Bana yardım ettiğiniz için çok teşekkür ederim!", "happy", "clap"),
            B(a, "Arkadaşlar her zaman birbirine yardım eder.", "happy", "nod"),
            B("narrator", "Sen de bir arkadaşına yardım ettin mi hiç?", "happy", "idle"),
            B(b, "Hadi şimdi hep birlikte resim yapalım!", "excited", "dance", "pop"),
        ]),
    ]
    return {"title": f"Lili ve Kayıp {word.title()}", "category": "friendship", "thumb_text": "Nerede Bu?", "learning_goal": "Yardım istemek ve yardım etmek",
            "moral": "Arkadaşlar zor anda birbirine destek olur.", "summary": f"Lili'nin {word} kaybolur, arkadaşları ipuçlarını takip ederek bulur.",
            "hook": scenes[0]["beats"][0]["text"], "tags": ["arkadaşlık", "yardımlaşma", "duygular"], "scenes": scenes,
            "shorts_candidates": [{"title": "İpucunu takip et!", "scene_ids": ["s3", "s4"], "hook_text": "Kayıp eşya nerede? İpucunu takip edelim!"}]}


def t_bedtime(rnd):
    a, b = _cast(rnd, 2)
    n = rnd.choice([3, 4, 5])
    nums = ["Bir", "İki", "Üç", "Dört", "Beş"]
    scenes = [
        S("s1", "night", "lullaby", [(a, "left", "right"), (b, "right", "left")], [
            B("narrator", "Bulutkent'te gece oldu. Ay gülümsüyor, yıldızlar parlıyor.", "calm", "idle"),
            B(a, "Gökyüzünde kaç yıldız var acaba?", "thinking", "look_around"),
            B(b, "Hadi yavaşça sayalım...", "calm", "nod"),
        ]),
        S("s2", "night", "lullaby", [(a, "left", "right"), (b, "right", "left")],
          [B(a if i % 2 == 0 else b, f"{nums[i]} yıldız...", "calm", "point", "sparkle", i) for i in range(n)]
          + [B("narrator", "Derin bir nefes al... ve yavaşça bırak.", "calm", "idle")],
          [P("star", "sarı", str(i + 1)) for i in range(n)]),
        S("s3", "bedroom", "lullaby", [(a, "left", "right"), (b, "right", "left")], [
            B(b, "Dişlerimizi fırçaladık, pijamalarımızı giydik.", "sleepy", "nod"),
            B(a, "İyi geceler ay, iyi geceler yıldızlar.", "sleepy", "wave"),
            B("narrator", "Gözler yavaşça kapanıyor... Rüyalarında bulutlara uç.", "calm", "idle"),
            B(b, "İyi geceler...", "sleepy", "sleep"),
            B(a, "İyi geceler...", "sleepy", "sleep"),
        ]),
        S("s3b", "bedroom", "lullaby", [(a, "left", "right"), (b, "right", "left")], [
            B("narrator", "Gün boyunca neler yaptık, hatırlayalım mı?", "calm", "idle"),
            B(a, "Oynadık, güldük, yeni şeyler öğrendik.", "calm", "nod"),
            B(b, "Şimdi bedenimiz dinlenmek istiyor.", "sleepy", "talk"),
            B("narrator", "Omuzlarını gevşet... Ellerini karnına koy... Nefes al... ve ver.", "calm", "idle"),
            B("narrator", "Bir kez daha... Nefes al... ve yavaşça ver.", "calm", "idle"),
        ]),
        S("s4", "night", "lullaby", [], [
            B("narrator", "Tatlı rüyalar, küçük dostum. Yarın yeni bir maceraya uyanacağız.", "calm", "idle"),
        ]),
    ]
    return {"title": f"Yıldız Sayma Gecesi: {_nm(a)} ve {_nm(b)} Uyuyor", "category": "bedtime", "thumb_text": "İyi Geceler",
            "learning_goal": f"Sakinleşme, uyku rutini ve {n}'e kadar sayma", "moral": "Sakin bir rutin tatlı uyku getirir.",
            "summary": "İki arkadaş yıldızları sayarak sakinleşir ve uyur.", "hook": scenes[0]["beats"][0]["text"],
            "tags": ["uyku masalı", "ninni", "uyku öncesi"], "scenes": scenes,
            "shorts_candidates": [{"title": "Yıldızları sayalım...", "scene_ids": ["s2"], "hook_text": "Gökyüzünde kaç yıldız var? Sakince sayalım."}]}


RIDDLES = [
    ("Kırmızıdır, yuvarlaktır, ağaçta yetişir. Ben neyim?", "apple", "kırmızı", "Elma"),
    ("Gündüz uyurum, gece parlarım, gökyüzünde gülümserim. Ben neyim?", "moon", "sarı", "Ay"),
    ("Yağmur yağınca açılırım, seni ıslanmaktan korurum. Ben neyim?", "umbrella", "mavi", "Şemsiye"),
    ("İpimle gökyüzünde dans ederim, rüzgârı severim. Ben neyim?", "kite", "turuncu", "Uçurtma"),
    ("İçimde sayfalar, sayfalarda masallar var. Ben neyim?", "book", "yeşil", "Kitap"),
    ("Tavşanlar beni çok sever, turuncuyum, toprakta büyürüm. Ben neyim?", "carrot", "turuncu", "Havuç"),
    ("Doğum gününde gelirim, üstümde mum yanar. Ben neyim?", "cake", "pembe", "Pasta"),
]


def t_riddles(rnd):
    host = "tombi"
    a, b = rnd.sample([c for c in CHAR_IDS if c != host], 2)
    rs = rnd.sample(RIDDLES, 3)
    scenes = [S("s1", "garden", "mystery", [(host, "left", "right"), (a, "center", "left"), (b, "right", "left")], [
        B(host, "Bilmece zamanı! Hazır mısınız?", "excited", "clap", "drum"),
        B(a, "Hazırız! Ama zor olmasın!", "laughing", "jump"),
        B("narrator", "Sen de dinle, cevabı içinden söyle!", "happy", "idle"),
    ])]
    for i, (q, kind, col, ans) in enumerate(rs):
        who = [a, b, a][i]
        scenes.append(S(f"s{i+2}", ["meadow", "forest", "lake"][i], "mystery", [(host, "left", "right"), (who, "right", "left")], [
            B(host, q, "thinking", "think"),
            B("narrator", "Sence ne? Bir... iki... üç...", "thinking", "idle", "drum"),
            B(who, f"Biliyorum! {ans}!", "excited", "jump", "ding", 0),
            B(host, f"Doğru! Cevap: {ans.lower()}! Sen de bildin mi?", "happy", "clap", "tada"),
        ], [P(kind, col, ans)]))
    scenes.append(S("s5", "garden", "happy", [(host, "left", "right"), (a, "center", "right"), (b, "right", "left")], [
        B(b, "Bilmeceler çok eğlenceli!", "laughing", "dance"),
        B(host, "Şimdi sıra sende: Evdekilere bir bilmece sor!", "happy", "point"),
        B("narrator", "Bir sonraki bilmece gününde görüşmek üzere!", "happy", "idle"),
    ]))
    return {"title": "Tombi'nin Bilmece Bahçesi: Üç Bilmece, Üç Cevap", "category": "riddles", "thumb_text": "Bil Bakalım!",
            "learning_goal": "Dinleme, ipucundan çıkarım yapma", "moral": "Dikkatle dinleyen cevabı bulur.",
            "summary": "Tombi üç bilmece sorar, arkadaşları ve izleyici cevabı bulur.", "hook": scenes[0]["beats"][0]["text"],
            "tags": ["bilmeceler", "çocuk bilmeceleri", "ben neyim"], "scenes": scenes,
            "shorts_candidates": [{"title": "Bu bilmeceyi bilir misin?", "scene_ids": ["s2"], "hook_text": "Üç saniyede bu bilmeceyi bil!"},
                                  {"title": "Ben neyim? Bil bakalım!", "scene_ids": ["s3"], "hook_text": "Yeni bir bilmece! Cevabı söyle!"}]}


def t_funny(rnd):
    s = "bobo"
    a, b = rnd.sample([c for c in CHAR_IDS if c != s], 2)
    thing = rnd.choice([("balloon", "kırmızı", "balonlar"), ("leaf", "turuncu", "yapraklar"), ("flower", "pembe", "çiçekler")])
    kind, col, word = thing
    scenes = [
        S("s1", "village", "silly", [(s, "center", "right")], [
            B(s, "Burnum kaşınıyor... A... a... aaa...", "surprised", "look_around"),
            B("narrator", "Eyvah! Bobo hapşırmak üzere! Sence ne olacak?", "surprised", "idle"),
        ]),
        S("s2", "village", "silly", [(s, "left", "right"), (a, "right", "left")], [
            B(s, "Hapşuuu!", "surprised", "sneeze", "whoosh"),
            B(a, f"Aaa! Bütün {word} uçtu!", "surprised", "look_around", "boing", 0),
            B(s, "Ups! Özür dilerim!", "shy", "talk"),
            B(a, "Çok yaşa Bobo!", "laughing", "laugh", "giggle"),
            B(s, "Sen de gör!", "happy", "nod"),
        ], [P(kind, col, "")]),
        S("s3", "meadow", "silly", [(s, "left", "right"), (a, "center", "left"), (b, "right", "left")], [
            B(b, f"{word.capitalize()} buraya kadar gelmiş!", "laughing", "jump", "pop", 0),
            B(s, "Hadi hepsini birlikte toplayalım!", "excited", "walk_in"),
            B("narrator", f"Bir, iki, üç... Tüm {word} geri geldi!", "happy", "idle", "sparkle"),
        ], [P(kind, col, "")]),
        S("s4", "village", "happy", [(s, "left", "right"), (a, "center", "left"), (b, "right", "left")], [
            B(b, "Bobo, hapşırırken dirseğini ağzına kapatırsan hiçbir şey uçmaz!", "happy", "point"),
            B(s, "Böyle mi? Ha... hapşu!", "laughing", "sneeze", "pop"),
            B(a, "Evet! Hiçbir şey uçmadı!", "excited", "clap", "clap"),
            B("narrator", "Sen de hapşırırken dirseğini kapatıyor musun? Harika!", "happy", "idle"),
            B(s, "Hadi kutlama dansı!", "laughing", "dance", "drum"),
        ]),
    ]
    scenes.append(S("s5", "meadow", "happy", [(s, "left", "right"), (a, "center", "left"), (b, "right", "left")], [
        B("narrator", "Bugün neler öğrendik? Hadi hatırlayalım!", "happy", "idle"),
        B(a, "Hapşırınca dirseğimizi kapatırız.", "happy", "nod"),
        B(b, "Bir şey dağılınca birlikte toplarız.", "happy", "clap"),
        B(s, "Ve hata yapınca özür dileriz. Ups, bu sefer hapşırmadım!", "laughing", "laugh", "giggle"),
        B("narrator", "Sen de dene bakalım: dirseğini ağzına kapat... Aferin!", "happy", "idle", "ding"),
    ]))
    return {"title": f"Bobo Hapşırınca {word.capitalize()} Uçtu!", "category": "funny", "thumb_text": "Hapşu!",
            "learning_goal": "Hapşırırken ağzı kapatma (sağlıklı alışkanlık)", "moral": "Hata yapınca özür dileyip birlikte düzeltiriz.",
            "summary": f"Bobo'nun hapşırığı {word} uçurur; arkadaşlar toplar ve doğru hapşırmayı öğrenir.",
            "hook": scenes[0]["beats"][0]["text"], "tags": ["komik", "sağlıklı alışkanlıklar", "hapşırık"], "scenes": scenes,
            "shorts_candidates": [{"title": "Bobo hapşırınca ne oldu?", "scene_ids": ["s1", "s2"], "hook_text": "Bobo hapşırmak üzere! Sence ne olacak?"},
                                  {"title": "Doğru hapşırma dansı!", "scene_ids": ["s4"], "hook_text": "Hapşırırken nasıl kapatırız? İzle!"}]}


def t_songs(rnd):
    s = "bobo"
    a, b = rnd.sample([c for c in CHAR_IDS if c != s], 2)
    animal = rnd.choice([("tavşan", "hop hop"), ("kurbağa", "vırak vırak"), ("arı", "vız vız"), ("ördek", "vak vak")])
    scenes = [
        S("s1", "meadow", "happy", [(s, "center", "right")], [
            B(s, "Davulum hazır! Ritim zamanı!", "excited", "jump", "drum", 0),
            B("narrator", "Bugün Bobo ile ritim tutuyoruz. Ellerini hazırla!", "happy", "idle"),
        ], [P("drum", "kırmızı", "")]),
        S("s2", "meadow", "happy", [(s, "left", "right"), (a, "right", "left")], [
            B(s, "Bir alkış, iki alkış!", "happy", "clap", "clap"),
            B(a, "Bir alkış, iki alkış!", "happy", "clap", "clap"),
            B(s, "Şimdi ayaklar: tap tap!", "excited", "hop", "drum"),
            B(a, "Tap tap! Tap tap!", "laughing", "hop", "drum"),
            B("narrator", "Sen de yap: alkış, alkış, tap, tap!", "happy", "idle", "clap"),
        ]),
        S("s3", "garden", "silly", [(s, "left", "right"), (b, "right", "left")], [
            B(b, f"Bir {animal[0]} gibi yapalım: {animal[1]}!", "laughing", "dance"),
            B(s, f"{animal[1].capitalize()}! {animal[1].capitalize()}!", "laughing", "dance", "boing"),
            B(b, "Daha hızlı! Daha hızlı!", "excited", "spin", "drum"),
            B(s, "Şimdi yavaş... çok yavaş...", "calm", "nod"),
        ]),
        S("s4", "meadow", "happy", [(s, "left", "right"), (a, "center", "left"), (b, "right", "left")], [
            B("narrator", "Hep birlikte son ritim!", "excited", "idle", "drum"),
            B(s, "Alkış, alkış, tap, tap, zıpla!", "laughing", "jump", "tada"),
            B(a, "Çok eğlendik!", "happy", "clap", "clap"),
            B(b, "Yarın yeni bir ritimle görüşürüz!", "happy", "wave"),
        ]),
    ]
    scenes.insert(3, S("s3b", "lake", "happy", [(s, "left", "right"), (a, "right", "left")], [
        B(a, "Şimdi göl kenarında yeni bir ritim: Şıp, şıp, şıp!", "happy", "hop", "splash"),
        B(s, "Şıp şıp! Şap şap! Su damlaları gibi!", "laughing", "dance", "splash"),
        B("narrator", "Ellerinle dizlerine vur: şıp, şıp... Şimdi alkış: şap, şap!", "happy", "idle", "clap"),
        B(a, "Bir daha! Şıp, şıp, şap, şap!", "excited", "clap", "clap"),
        B(s, "Ritim her yerde! Yağmurda, gölde, kalbimizde!", "happy", "spin", "drum"),
    ]))
    return {"title": f"Bobo ile Ritim Zamanı: Alkış, Tap ve {animal[0].capitalize()} Dansı", "category": "songs", "thumb_text": "Ritim Zamanı!",
            "learning_goal": "Ritim, dinleme ve hareket koordinasyonu", "moral": "Birlikte ritim tutmak eğlencelidir.",
            "summary": "Bobo davuluyla ritim kurar; herkes alkış ve hareketle katılır.", "hook": scenes[0]["beats"][0]["text"],
            "tags": ["ritim", "hareketli çocuk şarkısı", "alkış oyunu"], "scenes": scenes,
            "shorts_candidates": [{"title": "Alkış, alkış, tap, tap!", "scene_ids": ["s2"], "hook_text": "Ellerini hazırla! Ritmi yakala!"},
                                  {"title": f"{animal[0].capitalize()} dansı!", "scene_ids": ["s3"], "hook_text": f"Bir {animal[0]} gibi dans edebilir misin?"}]}


TEMPLATES = {"colors": t_colors, "numbers": t_numbers, "shapes": t_shapes, "sharing": t_sharing,
             "friendship": t_friendship, "animal_adventure": t_friendship, "bedtime": t_bedtime, "riddles": t_riddles,
             "funny": t_funny, "songs": t_songs, "educational": t_shapes}


def local_story(category: str, seed: int) -> dict:
    rnd = random.Random(seed)
    story = TEMPLATES.get(category, t_colors)(rnd)
    story["category"] = category if category in CATEGORIES else story["category"]
    return story


# --------------------------------------------------------------------------- doğrulama

def normalize(story: dict) -> dict:
    """LLM/şablon çıktısını güvenli sınırlara çeker (geçersiz slot, prop indeksi vb.)."""
    for sc in story["scenes"]:
        used = set()
        clean = []
        for ch in sc["characters"][:3]:
            if ch["id"] in CHAR_IDS and ch["id"] not in used:
                used.add(ch["id"]); clean.append(ch)
        sc["characters"] = clean
        on_stage = {c["id"] for c in clean}
        for b in sc["beats"]:
            if b["speaker"] not in ("narrator", *on_stage):
                b["speaker"] = "narrator"
            if not (0 <= int(b.get("show_prop", -1)) < len(sc["props"])):
                b["show_prop"] = -1
            if b.get("sfx") in (None, ""):
                b["sfx"] = "none"
            b["text"] = b["text"].strip()
        sc["beats"] = [b for b in sc["beats"] if b["text"]]
    story["scenes"] = [s for s in story["scenes"] if s["beats"]]
    ids = {s["id"] for s in story["scenes"]}
    story["shorts_candidates"] = [c for c in story.get("shorts_candidates", []) if set(c["scene_ids"]) <= ids]
    return story


def write(idea: dict) -> dict:
    """Bir fikirden hikâye üretir, güvenlik kontrolünden geçirir ve kaydeder."""
    engine = "local"
    story = None
    if llm.available():
        prompt = (
            f"Karakter kitabı:\n{json.dumps(bible(), ensure_ascii=False)}\n\n"
            f"Kategori: {idea['category']} ({CATEGORIES.get(idea['category'], '')})\n"
            f"Fikir başlığı: {idea['title']}\nFikir: {idea['premise']}\n"
            f"Kullanılabilecek arka planlar: {json.dumps(BACKGROUNDS, ensure_ascii=False)}\n"
            "Bu fikirden özgün, sıcak ve eğlenceli bir bölüm senaryosu yaz."
        )
        try:
            story = llm.generate_json(SYSTEM_PROMPT, prompt, STORY_SCHEMA, "story", estimate_usd=0.4)
            engine = "claude"
        except Exception as exc:  # LLM başarısızsa yerel motora düş
            logger.warning(f"Claude hikâyesi alınamadı, yerel motora geçiliyor: {exc}")
    if story is None:
        seed = int(idea.get("seed") or idea.get("id") or 0)
        story = local_story(idea["category"], seed)
        if idea.get("title") and idea.get("source") == "local":
            story["title"] = idea["title"]
    story = normalize(story)
    check = safety.check_story(story)
    fp = _fingerprint(story)
    if db.one("SELECT id FROM stories WHERE path LIKE ?", (f"%{fp}%",)):
        raise ValueError("Bu hikâye daha önce üretildi (tekrar engellendi)")
    path = Paths.stories / f"story_{fp}.json"
    story["_meta"] = {"engine": engine, "idea_id": idea.get("id"), "fingerprint": fp, "safety": check}
    path.write_text(json.dumps(story, ensure_ascii=False, indent=2), encoding="utf-8")
    sid = db.insert("stories", idea_id=idea.get("id"), created_at=db.now(), title=story["title"], category=story["category"],
                    path=str(path.relative_to(Paths.root)), engine=engine, safety=check,
                    status="written" if check["passed"] else "blocked")
    story["_meta"]["story_id"] = sid
    if idea.get("id"):
        db.update("ideas", idea["id"], status="written" if check["passed"] else "blocked")
    if not check["passed"]:
        logger.warning(f"Hikâye güvenlik kontrolünden geçemedi: {check['issues']}")
    else:
        logger.info(f"Hikâye yazıldı ({engine}): {story['title']}")
    return story


def load(story_id: int) -> dict:
    row = db.one("SELECT * FROM stories WHERE id=?", (story_id,))
    story = json.loads((Paths.root / row["path"]).read_text(encoding="utf-8"))
    story.setdefault("_meta", {})["story_id"] = story_id
    return story
