"""Bilimdon — multiplayer quiz server (Python standard library only).

Run:  python server.py        (optional: set PORT env var, default 8000)
Site: http://localhost:8000/   (hosts sign in with the "Login" button)
Players (phones on same Wi-Fi): http://<LAN-IP>:8000/
"""
import base64
import gzip
import hashlib
import hmac
import json
import mimetypes
import os
import random
import re
import secrets
import shutil
import socket
import sqlite3
import threading
import time
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import urllib.request
from urllib.parse import parse_qs, urlencode, urlparse

import importlib.util

# optional: only needed for "✨ AI bilan yaratish" (pip install anthropic). Only checked here;
# the package is loaded on the first AI request, so the server always starts quickly.
HAS_ANTHROPIC = importlib.util.find_spec("anthropic") is not None
anthropic = None


def load_anthropic():
    global anthropic
    if anthropic is None:
        import anthropic as sdk
        anthropic = sdk
    return anthropic

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "public")
# BILIMDON_DATA: another data folder (the automatic tests use a throwaway one, never the real data)
DATA = os.path.abspath(os.environ.get("BILIMDON_DATA") or os.path.join(HERE, "data"))
UPLOADS = os.path.join(DATA, "uploads")
SESSION_DAYS = 30
PORT = int(os.environ.get("PORT", 8000))
# --- settings for running on the internet (see HOSTING.md) ---
# PUBLIC_URL: the address players type, e.g. https://bilimdon.uz (shown in the lobby and QR codes)
PUBLIC_URL = os.environ.get("PUBLIC_URL", "").strip().rstrip("/")
# TRUST_PROXY=1 when nginx/Caddy/Cloudflare sits in front: the real visitor address then comes
# from X-Forwarded-For (for rate limits), and cookies get the Secure flag on https
TRUST_PROXY = os.environ.get("TRUST_PROXY", "") == "1"
# PIXABAY_KEY: free key from pixabay.com/api/docs — turns on picture search in the editor
PIXABAY_KEY = os.environ.get("PIXABAY_KEY", "").strip()
# ANTHROPIC_API_KEY: key from console.anthropic.com — turns on "✨ AI bilan yaratish" in the editor (paid per use)
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "").strip()
AI_ON = bool(ANTHROPIC_KEY and HAS_ANTHROPIC)  # needs both the key and the `anthropic` package
MAX_BODY = 2_000_000
MAX_UPLOAD_BODY = 15_000_000  # base64 JSON for one file
MAX_IMAGE = 5_000_000         # decoded image bytes
MAX_AUDIO = 10_000_000        # decoded audio bytes
MEDIA_TYPES = {".png": "image/png", ".jpg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp",
               ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".m4a": "audio/mp4"}
UPLOAD_RE = re.compile(r"^/uploads/[a-f0-9]{24}\.(png|jpg|gif|webp|mp3|ogg|wav|m4a)$")
IMG_UPLOAD_RE = re.compile(r"^/uploads/[a-f0-9]{24}\.(png|jpg|gif|webp)$")
AUDIO_UPLOAD_RE = re.compile(r"^/uploads/[a-f0-9]{24}\.(mp3|ogg|wav|m4a)$")
# Bilimdon's own avatar characters, drawn by public/avatars.js (older games may still hold emoji avatars)
AVATARS = [f"c{i}" for i in range(12)]
# 3D avatars (public/avatar3d.js): "3d:<character>.<accessory>.<colour>"; colour is "x" (the
# character's own), a finish name or 6 hex digits. Keep these lists in step with avatar3d.js.
AV3_CHARS = {"robot", "jelly", "alien", "ghost", "astro", "mushroom", "cactus", "icecream", "planet", "fire",
             "cloud", "crystal", "cupcake", "dice", "star", "donut"}
AV3_ACCS = {"none", "tophat", "party", "halo", "phones", "shades", "prop", "horns", "bow", "orbit", "chef", "vr",
            "stache", "mask", "ninja", "rainbow", "raincloud", "wings"}
AV3_FINISHES = {"gold", "chrome", "holo", "pearl", "neon", "galaxy", "rainbow", "sunset", "ocean", "lava", "camo", "candy"}
AV3_RE = re.compile(r"^3d:([a-z]+)\.([a-z]+)\.([a-z]+|[0-9a-f]{6})$")


def pick_avatar(av):
    """The avatar a joining player asked for: an SVG character's number or a 3D token; else a random one."""
    if isinstance(av, int) and not isinstance(av, bool) and 0 <= av < len(AVATARS):
        return AVATARS[av]
    if isinstance(av, str):
        m = AV3_RE.match(av)
        if m and m[1] in AV3_CHARS and m[2] in AV3_ACCS and (
                m[3] == "x" or m[3] in AV3_FINISHES or re.fullmatch(r"[0-9a-f]{6}", m[3])):
            return av
    return random.choice(AVATARS)

NICK_ADJ = ["Chaqqon", "Dono", "Quvnoq", "Botir", "Zukko", "Epchil", "Mard", "Sirli", "Yorqin", "Tezkor", "Ziyrak", "Shijoatli"]
NICK_NOUN = ["Tulki", "Burgut", "Sher", "Yo'lbars", "Lochin", "Bo'ri", "Ayiq", "Kiyik", "Delfin", "Boyqush", "Asalari", "Qoplon"]
TEAMS = [("Qizil jamoa", "#e4572e"), ("Ko'k jamoa", "#2e86ab"), ("Sariq jamoa", "#f3a712"), ("Binafsha jamoa", "#6a4c93")]

# quiz = one right answer, tf = true/false, multi = several right answers,
# type = player types the answer, order = put items in the right order,
# poll = opinion (no right answer), slide = information only (no answers),
# wordcloud = everyone types a word, open = free-text answer, slider = pick a number,
# pin = tap the right spot on a picture
# brainstorm = everyone writes an idea, then the class votes for the best ones
TYPES = ("quiz", "tf", "multi", "type", "order", "poll", "slide", "wordcloud", "open", "slider", "pin", "brainstorm")
OPTION_TYPES = ("quiz", "tf", "multi", "poll")  # player taps one or more of the listed answers
NEUTRAL = ("poll", "wordcloud", "open", "brainstorm")  # no right answer, no points
TEXT_LIMIT = {"type": 60, "wordcloud": 20, "open": 250, "brainstorm": 80}
VOTE_SECONDS = 25   # length of a brainstorm's voting round
MAX_VOTES = 3       # each player may like up to 3 ideas (never their own)
TF = ["To'g'ri", "Noto'g'ri"]

cv = threading.Condition()  # guards `games` and every Game
games = {}


# ---------------- persistent storage (SQLite: data/bilimdon.db) ----------------
# The server keeps every table in memory as a dict (as before). Each top-level entry of a
# dict (one user, one host's quizzes, one assignment…) is one row in SQLite; save() writes
# only the rows that changed, all in one transaction, so a crash can't leave a half-written file.
# On the first start the old data/*.json files are copied in; they are kept untouched.
dlock = threading.RLock()  # guards everything below
DB_PATH = os.path.join(DATA, "bilimdon.db")
TABLES = ("users", "sessions", "quizzes", "history", "challenges", "groups", "rosters")
_db_lock = threading.Lock()
_db = None
_db_cache = {}  # table -> {key: the JSON text stored for it}


def db():
    global _db
    if _db is None:
        os.makedirs(DATA, exist_ok=True)
        fresh = not os.path.exists(DB_PATH)
        _db = sqlite3.connect(DB_PATH, check_same_thread=False, isolation_level=None)
        _db.execute("PRAGMA journal_mode=WAL")
        _db.execute("PRAGMA synchronous=NORMAL")
        _db.execute("CREATE TABLE IF NOT EXISTS kv (tbl TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (tbl, key))")
        if fresh:
            migrate_json()
    return _db


def migrate_json():
    """First start on SQLite: copy data/*.json in (the files stay, plus a copy in backups/)."""
    old = [n for n in TABLES if os.path.isfile(os.path.join(DATA, n + ".json"))]
    if not old:
        return
    keep = os.path.join(DATA, "backups", "json-before-sqlite")
    os.makedirs(keep, exist_ok=True)
    rows = []
    for n in old:
        src = os.path.join(DATA, n + ".json")
        shutil.copy2(src, os.path.join(keep, n + ".json"))
        try:
            with open(src, encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, ValueError) as e:
            print(f"  {n}.json o'qilmadi ({e}) — o'tkazib yuborildi")
            continue
        if isinstance(data, dict):
            rows += [(n, str(k), json.dumps(v, ensure_ascii=False)) for k, v in data.items()]
    _db.execute("BEGIN")
    _db.executemany("INSERT OR REPLACE INTO kv VALUES (?, ?, ?)", rows)
    _db.execute("COMMIT")
    print(f"Ma'lumotlar SQLite bazasiga ko'chirildi: {len(rows)} ta yozuv ({', '.join(old)}). Eski JSON fayllar: {keep}")


def load(name, default):
    with _db_lock:
        rows = db().execute("SELECT key, value FROM kv WHERE tbl = ?", (name,)).fetchall()
    _db_cache[name] = {k: v for k, v in rows}
    if not rows:
        return default
    return {k: json.loads(v) for k, v in rows}


def save(name, obj):
    """Write the entries of `obj` that changed since the last save (and remove deleted ones)."""
    with _db_lock:  # one save at a time, so the cache always matches the database
        fresh = {str(k): json.dumps(v, ensure_ascii=False) for k, v in obj.items()}
        old = _db_cache.setdefault(name, {})
        changed = [(name, k, v) for k, v in fresh.items() if old.get(k) != v]
        gone = [(name, k) for k in old if k not in fresh]
        if not changed and not gone:
            return
        c = db()
        c.execute("BEGIN")
        try:
            c.executemany("INSERT OR REPLACE INTO kv VALUES (?, ?, ?)", changed)
            c.executemany("DELETE FROM kv WHERE tbl = ? AND key = ?", gone)
            c.execute("COMMIT")
        except Exception:
            c.execute("ROLLBACK")
            raise
        _db_cache[name] = fresh


users = load("users", {})              # login (lowercase) -> {name, salt, hash, created}
sessions = load("sessions", {})        # token -> {user, exp}
quizzes_db = load("quizzes", {})       # login -> {quiz_id: quiz}
history_db = load("history", {})       # login -> [game result, newest first]
challenges = load("challenges", {})    # pin -> self-paced assignment (see "Assignments" below)
groups = load("groups", {})            # group id -> {name, owner, members: [login], created}; quizzes opt in with quiz["group"]
rosters = load("rosters", {})          # login -> {roster id: {name, students: [names]}}  (class lists)


def roster_key(name):
    return " ".join(str(name).lower().replace("ʻ", "'").replace("’", "'").split())


def roster_match(roster, name):
    """The student's name exactly as written in the class list, or None if they are not on it."""
    k = roster_key(name)
    return next((s for s in roster["students"] if roster_key(s) == k), None)


def roster_absent(roster, present_names):
    present = {roster_key(n) for n in present_names}
    return [s for s in roster["students"] if roster_key(s) not in present]


def clean_roster(body):
    name = " ".join(str(body.get("name", "")).split())[:40]
    seen, students = set(), []
    for s in body.get("students") or []:
        s = " ".join(str(s).split())[:16]
        if s and roster_key(s) not in seen:
            seen.add(roster_key(s))
            students.append(s)
    return name, students[:200]


# ---------------- automatic daily backups of ./data ----------------
BACKUPS = os.path.join(DATA, "backups")
KEEP_BACKUPS = 7


def backup_data():
    """Copy the database into data/backups/<date>/bilimdon.db once a day; keep the newest 7 days."""
    try:
        day = time.strftime("%Y-%m-%d")
        target = os.path.join(BACKUPS, day)
        if not os.path.isfile(os.path.join(target, "bilimdon.db")):
            os.makedirs(target, exist_ok=True)
            with dlock, _db_lock:  # a consistent snapshot, even while the site is in use
                dst = sqlite3.connect(os.path.join(target, "bilimdon.db"))
                db().backup(dst)
                dst.close()
        days = sorted(d for d in os.listdir(BACKUPS) if re.fullmatch(r"\d{4}-\d{2}-\d{2}", d)) if os.path.isdir(BACKUPS) else []
        for old in days[:-KEEP_BACKUPS]:
            shutil.rmtree(os.path.join(BACKUPS, old), ignore_errors=True)
    except OSError as e:
        print("Zaxira nusxa olinmadi:", e)


def backup_loop():
    while True:
        backup_data()
        time.sleep(3 * 3600)  # checks a few times a day; copies only once per day

USERNAME_RE = re.compile(r"^[A-Za-z0-9_.\-]{3,20}$")
YT_RE = re.compile(r"(?:youtu\.be/|youtube(?:-nocookie)?\.com/(?:watch\?(?:[^#]*&)?v=|embed/|shorts/|live/))([A-Za-z0-9_-]{11})")


def hash_pw(password, salt_hex):
    return hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), 200_000).hex()


# ---------------- rate limits ----------------
# per address: (max requests, per seconds). A whole class may share one internet address
# (school Wi-Fi), so game requests get room for ~40 phones; password guessing gets very little.
RATE_LIMITS = {
    "/api/auth/login": (10, 60), "/api/auth/recover": (5, 300), "/api/auth/register": (10, 3600),
    "/api/auth/password": (10, 300), "/api/auth/recovery-code": (10, 300),
    "/api/join": (120, 60), "/api/pin": (120, 60),  # also stops trying PIN after PIN "/api/upload": (40, 60), "/api/preview": (30, 60), "/api/import": (10, 60),
    "/api/images/search": (40, 60), "/api/images/save": (30, 60), "/api/ai/generate": (10, 300),
}
rate_hits = {}  # (address, path) -> recent request times
rate_lock = threading.Lock()


def rate_ok(addr, path):
    rule = RATE_LIMITS.get(path)
    if not rule:
        return True
    limit, window = rule
    now = time.time()
    with rate_lock:
        if len(rate_hits) > 20000:  # forget old entries now and then
            for k in [k for k, v in rate_hits.items() if not v or v[-1] < now - 3600]:
                del rate_hits[k]
        hits = [t for t in rate_hits.get((addr, path), []) if t > now - window]
        if len(hits) >= limit:
            rate_hits[(addr, path)] = hits
            return False
        hits.append(now)
        rate_hits[(addr, path)] = hits
        return True


RC_ALPHABET ="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O or 1/I mix-ups when copied by hand


def new_recovery_code(u):
    """Give the user a fresh one-time recovery code (only its hash is kept) and return it."""
    code = "-".join("".join(secrets.choice(RC_ALPHABET) for _ in range(4)) for _ in range(4))
    u["rc_salt"] = secrets.token_hex(16)
    u["rc_hash"] = hash_pw(code, u["rc_salt"])
    return code


def norm_rc(code):
    c = re.sub(r"[^A-Z0-9]", "", str(code).upper())
    return "-".join(c[i:i + 4] for i in range(0, len(c), 4))


def new_session(login):
    token = secrets.token_urlsafe(32)
    with dlock:
        now = time.time()
        for t in [t for t, s in sessions.items() if s["exp"] < now]:
            del sessions[t]
        sessions[token] = {"user": login, "exp": now + SESSION_DAYS * 86400}
        save("sessions", sessions)
    return token


def record_history(login, entry):
    with dlock:
        h = history_db.setdefault(login, [])
        h.insert(0, entry)
        del h[100:]
        save("history", history_db)


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


def new_pin():
    """A 6-digit PIN not used by a live game or an assignment (call with cv held)."""
    while True:
        pin = str(random.randint(100000, 999999))
        if pin not in games and pin not in challenges:
            return pin


def norm_text(s):
    return " ".join(str(s).lower().replace("ʻ", "'").replace("’", "'").replace("`", "'").split())


# Rude nickname filter (Uzbek, Russian, English). Roots are matched inside the name after
# removing spaces/punctuation and undoing simple tricks like "f*ck" or "sh1t".
BAD_ROOTS = (
    "fuck", "shit", "bitch", "cunt", "dick", "pussy", "whore", "slut", "nigg", "faggot", "asshole",
    "хуй", "хуе", "хуё", "хуя", "пизд", "ебат", "ебан", "ёбан", "бляд", "блят", "сука", "мудак", "пидор", "гандон", "залуп", "шлюх",
    "huy", "hui", "xuy", "pizd", "eban", "blyat", "blyad", "suka", "mudak", "pidor", "gandon",
    "jalab", "qanjiq", "dalbayob", "sikay", "sikish", "sikdim", "sikaman", "itvachcha", "onangni",
)
LEET = str.maketrans({"0": "o", "1": "i", "3": "e", "4": "a", "@": "a", "$": "s", "5": "s", "7": "t"})


def bad_name(name):
    flat = "".join(ch for ch in str(name).lower().translate(LEET) if ch.isalnum())
    return any(root in flat for root in BAD_ROOTS)


def safe_url(u, uploaded=IMG_UPLOAD_RE):
    """An http(s) link, or a file uploaded to this server (/uploads/...) of the right kind."""
    u = str(u or "").strip()[:500]
    return u if u.startswith(("http://", "https://")) or uploaded.match(u) else ""


def audio_ext(data):
    """Audio file extension from the first bytes, or None."""
    if data.startswith(b"ID3") or data[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"):
        return ".mp3"
    if data.startswith(b"OggS"):
        return ".ogg"
    if data[:4] == b"RIFF" and data[8:12] == b"WAVE":
        return ".wav"
    if data[4:8] == b"ftyp":
        return ".m4a"
    return None


def image_ext(data):
    """File extension from the file's first bytes (never trust the name the browser sent)."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if data.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if data.startswith((b"GIF87a", b"GIF89a")):
        return ".gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ".webp"
    return None


def fb_summary(items):
    """Players' end-of-game feedback -> averages for the host's report."""
    items = list(items)
    if not items:
        return None
    n = len(items)
    return {"count": n,
            "stars": round(sum(f["stars"] for f in items) / n, 1),
            "learned": round(100 * sum(1 for f in items if f["learned"]) / n),
            "recommend": round(100 * sum(1 for f in items if f["recommend"]) / n),
            "mood": {m: sum(1 for f in items if f["mood"] == m) for m in ("pos", "neu", "neg")}}


def clean_feedback(body):
    stars, mood = body.get("stars"), body.get("mood")
    if not isinstance(stars, int) or isinstance(stars, bool) or not 1 <= stars <= 5 or mood not in ("pos", "neu", "neg"):
        return None
    return {"stars": stars, "learned": bool(body.get("learned")), "recommend": bool(body.get("recommend")), "mood": mood}


def parse_video(v):
    """YouTube link (or an already parsed {"id", "start"}) -> {"id", "start"} or ""."""
    if isinstance(v, dict):
        vid = str(v.get("id", ""))
        return {"id": vid, "start": max(0, min(int(v.get("start", 0) or 0), 36000))} if re.fullmatch(r"[A-Za-z0-9_-]{11}", vid) else ""
    u = str(v or "").strip()[:300]
    m = YT_RE.search(u)
    if not m:
        return ""
    t = re.search(r"[?&](?:t|start)=(\d+)", u)
    return {"id": m.group(1), "start": min(int(t.group(1)), 36000) if t else 0}


def clean_question(q):
    typ = q.get("type")
    if typ not in TYPES:  # quizzes saved before question types existed
        c = q.get("c", 0)
        if q.get("poll") or (isinstance(c, int) and c < 0):
            typ = "poll"
        elif q.get("a") == TF:
            typ = "tf"
        else:
            typ = "quiz"
    text = str(q.get("q", "")).strip()[:300]
    if not text:
        raise ValueError("question text")
    pts = int(q.get("pts", 1))
    out = {"type": typ, "q": text, "img": safe_url(q.get("img")), "video": parse_video(q.get("video")),
           "audio": safe_url(q.get("audio"), AUDIO_UPLOAD_RE),
           "t": max(5, min(int(q.get("t", 20)), 240)), "pts": pts if pts in (0, 1, 2) else 1,
           "a": [], "c": -1}
    explain = str(q.get("explain", "")).strip()[:300]
    if explain and typ != "slide":
        out["explain"] = explain  # shown after the question: why the right answer is right
    a = [str(x).strip()[:120] for x in (q.get("a") or [])][:4]
    if typ in ("wordcloud", "open", "brainstorm"):
        out["pts"] = 0
    elif typ == "slider":
        s = q.get("slider") or {}
        lo, hi = float(s.get("min", 0)), float(s.get("max", 100))
        step = float(s.get("step", 1) or 1)
        ans, tol = float(s.get("ans", lo)), abs(float(s.get("tol", 0) or 0))
        if not (lo < hi and step > 0 and lo <= ans <= hi and tol <= hi - lo and (hi - lo) / step <= 100000):
            raise ValueError("slider range")
        num = lambda x: int(x) if float(x).is_integer() else round(x, 4)
        out["slider"] = {"min": num(lo), "max": num(hi), "step": num(step), "ans": num(ans), "tol": num(tol),
                         "unit": str(s.get("unit", "")).strip()[:12]}
    elif typ == "pin":
        p = q.get("pin") or {}
        x, y, r = float(p.get("x", -1)), float(p.get("y", -1)), float(p.get("r", 10))
        ar = float(q.get("ar", 1.5) or 1.5)
        if not out["img"]:
            raise ValueError("pin needs a picture")
        if not (0 <= x <= 100 and 0 <= y <= 100 and 2 <= r <= 50):
            raise ValueError("pin spot")
        out["pin"] = {"x": round(x, 2), "y": round(y, 2), "r": round(r, 2)}
        out["ar"] = max(0.2, min(ar, 5.0))  # picture width / height, to measure distances fairly
    elif typ == "slide":
        out.update(body=str(q.get("body", "")).strip()[:1000], pts=0)
    elif typ == "type":
        a = [x[:60] for x in a if x]
        if not a:
            raise ValueError("accepted answers")
        out["a"] = a
    else:
        if typ == "tf":
            a = list(TF)
        # quiz / multi-select / poll answers may be pictures; then the text is optional
        ai = [safe_url(x) for x in (q.get("ai") or [])][:len(a)] if typ in ("quiz", "multi", "poll") else []
        ai += [""] * (len(a) - len(ai))
        if len(a) < 2 or not all(a[i] or ai[i] for i in range(len(a))):
            raise ValueError("answers")
        out["a"] = a
        if any(ai):
            out["ai"] = ai
        if typ == "poll":
            out["pts"] = 0
        elif typ == "multi":
            cs = sorted({int(i) for i in q.get("cs", []) if isinstance(i, int) and 0 <= i < len(a)})
            if not cs:
                raise ValueError("multi needs a correct answer")
            out["cs"] = cs
        elif typ in ("quiz", "tf"):
            c = int(q.get("c", 0))
            if not 0 <= c < len(a):
                raise ValueError("correct answer")
            out["c"] = c
    return out


def clean_quiz(raw):
    """Validate a quiz sent by the host."""
    if not isinstance(raw, dict):
        raise ValueError("quiz")
    qs = [clean_question(q) for q in raw.get("questions", [])[:100]]
    if not qs:
        raise ValueError("empty")
    return {"title": str(raw.get("title", "Viktorina")).strip()[:80] or "Viktorina",
            "description": str(raw.get("description", "")).strip()[:500],
            "folder": " ".join(str(raw.get("folder", "")).split())[:40],
            "group": str(raw.get("group", ""))[:16],
            "cover": safe_url(raw.get("cover")), "public": bool(raw.get("public")), "questions": qs}


def make_perm(n):
    """Shuffled display order for an "order" question (never already sorted)."""
    perm = list(range(n))
    while n > 1 and perm == sorted(perm):
        random.shuffle(perm)
    return perm


def shown_items(q, perm):
    if q["type"] in ("type", "slide"):
        return []
    return [q["a"][i] for i in perm] if q["type"] == "order" else q["a"]


def evaluate(q, choice, perm):
    """Check an answer. Returns (ok, normalized choice), or None when the answer is malformed."""
    typ, n = q["type"], len(q["a"])
    if typ in ("quiz", "tf", "poll"):
        if not isinstance(choice, int) or isinstance(choice, bool) or not 0 <= choice < n:
            return None
        return typ != "poll" and choice == q["c"], choice
    if typ == "multi":
        if not isinstance(choice, list) or not choice or not all(isinstance(i, int) and 0 <= i < n for i in choice):
            return None
        choice = sorted(set(choice))
        return choice == q["cs"], choice
    if typ in ("type", "wordcloud", "open", "brainstorm"):
        if not isinstance(choice, str) or not choice.strip():
            return None
        choice = " ".join(choice.split())[:TEXT_LIMIT[typ]]
        return typ == "type" and norm_text(choice) in {norm_text(x) for x in q["a"]}, choice
    if typ == "slider":
        s = q["slider"]
        if not isinstance(choice, (int, float)) or isinstance(choice, bool) or not s["min"] <= choice <= s["max"]:
            return None
        return abs(choice - s["ans"]) <= s["tol"] + 1e-9, choice
    if typ == "pin":
        if not isinstance(choice, dict):
            return None
        x, y = choice.get("x"), choice.get("y")
        if not all(isinstance(v, (int, float)) and not isinstance(v, bool) and 0 <= v <= 100 for v in (x, y)):
            return None
        p = q["pin"]
        # x is a % of the width and y a % of the height: scale x so both are measured in the same units
        dist = (((x - p["x"]) * q["ar"]) ** 2 + (y - p["y"]) ** 2) ** 0.5
        return dist <= p["r"], {"x": round(x, 2), "y": round(y, 2)}
    if typ == "order":
        if not isinstance(choice, list) or sorted(choice) != list(range(n)):
            return None
        return [perm[i] for i in choice] == list(range(n)), choice
    return None


def points(q, ok, elapsed, streak, accuracy=False):
    """Up to 1000 points for a fast right answer (x2 on double-point questions) plus a streak bonus.
    In accuracy mode speed does not matter: every right answer is worth the full 1000."""
    if not ok or not q["pts"]:
        return 0
    base = 1000 if accuracy else round(1000 * (1 - min(elapsed, q["t"]) / q["t"] / 2))
    return base * q["pts"] + min(streak - 1, 5) * 100


def item_text(q, i):
    t = q["a"][i] if isinstance(i, int) and 0 <= i < len(q["a"]) else ""
    return t or "🖼"  # picture-only answers have no text


def choice_text(q, choice, perm):
    """A player's answer as readable text, for their end-of-game review."""
    typ = q["type"]
    if choice is None:
        return ""
    if typ in ("quiz", "tf", "poll"):
        return item_text(q, choice)
    if typ == "multi":
        return ", ".join(item_text(q, i) for i in choice)
    if typ == "order":
        return " → ".join(item_text(q, perm[i]) for i in choice)
    if typ == "slider":
        return f"{choice:g} {q['slider'].get('unit', '')}".strip()
    if typ == "pin":
        return "📍"
    return str(choice)


def right_text(q):
    typ = q["type"]
    if typ in ("quiz", "tf"):
        return item_text(q, q["c"])
    if typ == "multi":
        return ", ".join(item_text(q, i) for i in q["cs"])
    if typ == "type":
        return " / ".join(q["a"])
    if typ == "order":
        return " → ".join(item_text(q, i) for i in range(len(q["a"])))
    if typ == "slider":
        s = q["slider"]
        return (f"{s['ans']:g} {s.get('unit', '')}".strip() + (f" (±{s['tol']:g})" if s["tol"] else ""))
    if typ == "pin":
        return "📍"
    return ""


def review_entry(q, choice, perm, ok, pts):
    """One line of a player's answer review: the question, their answer, the right one."""
    neutral = q["type"] in NEUTRAL
    return {"q": q["q"][:200], "type": q["type"], "your": choice_text(q, choice, perm)[:200],
            "right": "" if neutral else right_text(q)[:200], "ok": None if neutral else bool(ok), "pts": pts,
            "explain": q.get("explain", "")}


EMOTES = ["👍", "😂", "😮", "🔥", "❤️", "👏"]

_static_cache = {}  # (path, mtime, gzip?) -> bytes: page files are read and compressed once per change
_static_lock = threading.Lock()


def static_bytes(path, mtime, gz):
    k = (path, mtime, gz)
    with _static_lock:
        hit = _static_cache.get(k)
    if hit is None:
        with open(path, "rb") as f:
            hit = f.read()
        if gz:
            hit = gzip.compress(hit, 6)
        with _static_lock:
            for old in [x for x in _static_cache if x[0] == path and x[1] != mtime]:
                del _static_cache[old]  # an edited file replaces its old copies
            _static_cache[k] = hit
    return hit


# ---------------- AI question generation (Claude API, optional) ----------------
AI_MODEL = "claude-opus-5-5"
AI_LANGS = {"uz": "Uzbek (Latin script)", "ru": "Russian", "en": "English"}
AI_SCHEMA = {
    "type": "object",
    "properties": {"questions": {"type": "array", "items": {
        "type": "object",
        "properties": {
            "type": {"type": "string", "enum": ["quiz", "multi", "tf", "type"]},
            "question": {"type": "string"},
            "answers": {"type": "array", "items": {"type": "string"}},
            "correct": {"type": "array", "items": {"type": "integer"}},
            "explanation": {"type": "string"},
        },
        "required": ["type", "question", "answers", "correct", "explanation"],
        "additionalProperties": False,
    }}},
    "required": ["questions"],
    "additionalProperties": False,
}
AI_SYSTEM = """You write questions for a live classroom quiz game that students answer on their phones.
Each question has one of these types:
- "quiz": 4 short answer options, exactly one correct; "correct" holds its index (0-3).
- "multi": 4 short answer options, two or three correct; "correct" holds their indexes.
- "tf": a statement; "answers" is ["True", "False"]; "correct" is [0] if the statement is true, [1] if false.
- "type": the student types the answer; "answers" lists 1-3 accepted spellings of one short answer (one or two words); "correct" is [0].
Keep questions under 200 characters and answer options under 60 characters, so they fit on a projector and a phone.
Make the facts correct and suitable for the grade given; if you are not sure a fact is right, leave that question out.
Wrong options should be plausible but clearly wrong to someone who knows the topic.
"explanation" is one short sentence saying why the right answer is right.
Write the questions, answers and explanations in the language you are asked for."""


def ai_generate(topic, count, lang, grade, types):
    """Ask Claude for quiz questions; returns cleaned questions in this app's format."""
    client = load_anthropic().Anthropic(timeout=120.0, max_retries=1)
    ask = (f"Topic: {topic}\nGrade / level: {grade or 'not given'}\nNumber of questions: {count}\n"
           f"Allowed types: {', '.join(types)}\nLanguage: {AI_LANGS[lang]}")
    resp = client.beta.messages.create(
        model=AI_MODEL,
        max_tokens=16000,
        output_config={"effort": "medium", "format": {"type": "json_schema", "schema": AI_SCHEMA}},
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",  # if the request is declined, the API retries it on a fallback model
        system=AI_SYSTEM,
        messages=[{"role": "user", "content": ask}],
    )
    if resp.stop_reason == "refusal":
        raise ValueError("refusal")
    text = next((b.text for b in resp.content if b.type == "text"), "")
    return ai_to_questions(json.loads(text), types)[:count]


def ai_to_questions(data, types):
    """Turn the model's JSON into this app's question format; anything malformed is skipped."""
    out = []
    for item in (data or {}).get("questions", []):
        try:
            typ, a = item["type"], [str(x).strip() for x in item["answers"] if str(x).strip()]
            right = [i for i in item["correct"] if isinstance(i, int)]
            if typ not in types:
                continue
            q = {"type": typ, "q": item["question"], "t": 30 if typ == "type" else 20,
                 "explain": item.get("explanation", "")}
            if typ == "tf":
                q.update(a=TF, c=0 if right == [0] else 1)
            elif typ == "type":
                q.update(a=a[:4])
            elif typ == "quiz":
                q.update(a=a[:4], c=right[0])
            else:
                q.update(a=a[:4], cs=right)
            out.append(clean_question(q))
        except (KeyError, IndexError, TypeError, ValueError):
            continue
    return out


def input_info(q):
    """Extra, answer-free details a phone needs to draw the input (slider range, picture shape)."""
    out = {}
    if q["type"] == "slider":
        out["slider"] = {k: q["slider"][k] for k in ("min", "max", "step", "unit")}
    if q["type"] == "pin":
        out["ar"] = q["ar"]
    if q.get("ai"):
        out["ai"] = q["ai"]
    if q.get("audio"):
        out["audio"] = q["audio"]
    return out


def public_question(q, perm):
    """What a player's phone may know about a question (never the right answer)."""
    return {"type": q["type"], "q": q["q"], "img": q["img"], "video": q.get("video") or "", "t": q["t"],
            "mult": q["pts"], "body": q.get("body", ""), "answers": shown_items(q, perm), **input_info(q)}


class Game:
    def __init__(self, quiz, owner, quiz_id="", ghosts=None, ghost_of=""):
        self.quiz_id = quiz_id
        self.ghosts = ghosts or []  # [{name, trail}] from an earlier game of the same quiz
        self.ghost_of = ghost_of
        self.owner = owner
        self.pin = new_pin()
        self.key = secrets.token_hex(12)
        self.quiz = quiz
        self.players = {}  # pid -> {name, avatar, score, streak, correct, answer, last, team}
        self.state = "lobby"  # lobby | question | results | board | final
        self.qi = -1
        self.start = 0.0
        self.deadline = 0.0
        self.version = 0
        self.timer = None
        self.perm = []     # display order of items for an "order" question
        self.qstats = []   # per-question summary for the report
        self.feedback = {}  # pid -> end-of-game feedback
        self.banned = set()  # lowercase names the host kicked out for good
        self.hist_id = None
        self.created = time.time()
        self.settings = {"shuffleQ": False, "shuffleA": False, "showQ": False,
                         "lock": False, "nick": False, "teams": 0, "accuracy": False, "roster": "",
                         "react": True, "read": 0, "limit": 0}
        self.ideas, self.voted = None, {}  # brainstorm: [{text, by, votes}], pid -> picked idea indices
        self.reactions = []  # last few emoji reactions: {id, e, name}
        self.react_seq = 0
        self.roster = None  # {name, students} when only students on a class list may join
        self.paused = False
        self.paused_at = 0.0
        self.pause_left = 0.0  # seconds that were left on the timer when the host paused

    def apply_shuffle(self):
        qs = self.quiz["questions"]
        if self.settings["shuffleQ"]:
            random.shuffle(qs)
        n = self.settings["limit"]
        if n and n < len(qs):
            # play only N random questions (kept in their original order unless shuffled)
            keep = sorted(random.sample(range(len(qs)), n))
            qs[:] = [qs[i] for i in keep]
        if self.settings["shuffleA"]:
            for q in qs:
                if q["type"] not in ("quiz", "multi", "poll") or len(q["a"]) < 3:
                    continue
                order = list(range(len(q["a"])))
                random.shuffle(order)
                q["a"] = [q["a"][i] for i in order]
                if q.get("ai"):
                    q["ai"] = [q["ai"][i] for i in order]
                if q["c"] >= 0:
                    q["c"] = order.index(q["c"])
                if "cs" in q:
                    q["cs"] = sorted(order.index(i) for i in q["cs"])

    def assign_teams(self):
        k = self.settings["teams"]
        pids = list(self.players)
        random.shuffle(pids)
        for i, pid in enumerate(pids):
            self.players[pid]["team"] = i % k if k else None

    def team_board(self):
        """Team ranking: average score of the members, so team size does not matter."""
        k = self.settings["teams"]
        if not k:
            return []
        out = []
        for i in range(k):
            members = [p for p in self.players.values() if p.get("team") == i]
            avg = round(sum(p["score"] for p in members) / len(members)) if members else 0
            out.append({"name": TEAMS[i][0], "color": TEAMS[i][1], "score": avg, "members": len(members)})
        return sorted(out, key=lambda t: -t["score"])

    def nickname(self):
        taken = {p["name"].lower() for p in self.players.values()}
        for _ in range(50):
            n = f"{random.choice(NICK_ADJ)} {random.choice(NICK_NOUN)}"
            if n.lower() not in taken:
                return n
        return f"{random.choice(NICK_ADJ)} {random.choice(NICK_NOUN)} {len(self.players) + 1}"

    # --- helpers (call with cv held) ---
    def bump(self):
        self.version += 1
        cv.notify_all()

    @property
    def q(self):
        return self.quiz["questions"][self.qi] if 0 <= self.qi < len(self.quiz["questions"]) else None

    def ranking(self):
        return sorted(self.players.items(), key=lambda kv: -kv[1]["score"])

    def start_question(self):
        self.qi += 1
        if self.qi >= len(self.quiz["questions"]):
            self.finish()
            return
        self.state = "question"
        self.paused = False
        self.ideas, self.voted = None, {}  # brainstorm voting round of this question
        for p in self.players.values():
            p["answer"] = None
            p["last"] = None
        q = self.q
        self.perm = make_perm(len(q["a"])) if q["type"] == "order" else []
        # reading time: the question is shown first, answers open (and the clock starts) a few seconds later
        read = self.settings["read"] if q["type"] != "slide" else 0
        self.start = time.time() + read
        if q["type"] == "slide":  # no timer: the host moves on when ready
            self.deadline = 0
        else:
            self.deadline = self.start + q["t"]
            self.arm_timer(read + q["t"])
            if read:
                rt = threading.Timer(read, self._read_done, args=(self.qi,))
                rt.daemon = True
                rt.start()
        self.bump()

    def _read_done(self, qi):
        with cv:
            if self.state == "question" and self.qi == qi:
                self.bump()  # answers are open now: tell every screen

    def reading(self):
        """Seconds left before answers open (0 when they are open)."""
        return 0.0 if self.state != "question" or self.paused else max(0.0, self.start - time.time())

    def arm_timer(self, seconds):
        qi = self.qi
        self.timer = threading.Timer(seconds + 0.3, self._timeout, args=(qi,))
        self.timer.daemon = True
        self.timer.start()

    def _timeout(self, qi):
        with cv:
            if self.state == "question" and self.qi == qi and not self.paused:
                self.end_question()

    def pause(self):
        """Freeze the question timer (the host needs a moment); answers wait until resume."""
        if self.state != "question" or self.paused or self.q["type"] == "slide" or self.reading() > 0:
            return False
        if self.timer:
            self.timer.cancel()
        self.paused, self.paused_at = True, time.time()
        self.pause_left = max(0.0, self.deadline - self.paused_at)
        self.bump()
        return True

    def resume(self):
        if not self.paused:
            return False
        now = time.time()
        self.start += now - self.paused_at  # the pause does not count as thinking time
        self.deadline = now + self.pause_left
        self.paused = False
        self.arm_timer(self.pause_left)
        self.bump()
        return True

    def remaining(self):
        return self.pause_left if self.paused else max(0.0, self.deadline - time.time())

    def end_question(self):
        if self.state not in ("question", "vote"):
            return
        if self.timer:
            self.timer.cancel()
        self.paused = False
        q = self.q
        if q["type"] == "brainstorm" and self.state == "question" and self.start_vote():
            return  # ideas are in: the class votes before the results
        self.state = "results"
        neutral = q["type"] in NEUTRAL
        for p in self.players.values():
            if p["answer"] is None:
                if not neutral:
                    p["streak"] = 0
                p["last"] = {"ok": False, "pts": 0, "timeout": True, "poll": neutral, "kind": q["type"]}
        for p in self.players.values():
            p.setdefault("trail", []).append(p["score"])  # score after each question, for a later ghost game
            p.setdefault("log", []).append(review_entry(q, p["answer"], self.perm, p["last"]["ok"], p["last"]["pts"]))
        answered = [p for p in self.players.values() if p["answer"] is not None]
        self.qstats.append({"q": q["q"], "type": q["type"], "players": len(self.players),
                            "answered": len(answered),
                            "correct": None if neutral else sum(1 for p in answered if p["last"]["ok"])})
        self.bump()

    # --- brainstorm voting round ---
    def start_vote(self):
        """Collect the ideas (same idea written twice counts once) and open the voting round."""
        ideas, seen = [], {}
        for pid, p in self.players.items():
            if p["answer"] is None:
                continue
            k = norm_text(p["answer"])
            if k in seen:
                ideas[seen[k]]["by"].append(pid)
            else:
                seen[k] = len(ideas)
                ideas.append({"text": p["answer"], "by": [pid], "votes": 0})
        if len(ideas) < 2:
            return False  # nothing to choose between: go straight to the results
        self.ideas, self.voted = ideas, {}
        self.state = "vote"
        self.start = time.time()
        self.deadline = self.start + VOTE_SECONDS
        self.arm_timer(VOTE_SECONDS)
        self.bump()
        return True

    def cast_vote(self, pid, choice):
        if pid not in self.players or pid in self.voted or not isinstance(choice, list) or time.time() > self.deadline + 0.5:
            return False
        picks = sorted({i for i in choice if isinstance(i, int) and not isinstance(i, bool)
                        and 0 <= i < len(self.ideas) and pid not in self.ideas[i]["by"]})[:MAX_VOTES]
        if not picks:
            return False
        for i in picks:
            self.ideas[i]["votes"] += 1
        self.voted[pid] = picks
        if all(k in self.voted for k in self.players):
            self.end_question()
        else:
            self.bump()
        return True

    def answer(self, pid, choice):
        if self.state == "vote":
            return self.cast_vote(pid, choice)
        p = self.players.get(pid)
        q = self.q
        if not p or self.state != "question" or p["answer"] is not None or q["type"] == "slide" or self.paused:
            return False
        elapsed = time.time() - self.start
        if elapsed < 0 or elapsed > q["t"] + 0.5:  # still reading, or too late
            return False
        res = evaluate(q, choice, self.perm)
        if res is None:
            return False
        ok, choice = res
        if q["type"] not in NEUTRAL:
            p["streak"] = p["streak"] + 1 if ok else 0
        if ok:
            p["correct"] = p.get("correct", 0) + 1
        pts = points(q, ok, elapsed, p["streak"], self.settings["accuracy"])
        p["score"] += pts
        p["answer"] = choice
        p["last"] = {"ok": ok, "pts": pts, "streak": p["streak"], "poll": q["type"] in NEUTRAL, "kind": q["type"]}
        if all(x["answer"] is not None for x in self.players.values()):
            self.end_question()
        else:
            self.bump()
        return True

    def host_next(self):
        if self.state == "lobby":
            if not self.players:
                return "no_players"
            self.apply_shuffle()
            self.assign_teams()
            self.start_question()
        elif self.state == "question":
            if self.q["type"] == "slide":
                self.start_question()  # slides have no results screen
            else:
                self.end_question()
        elif self.state == "vote":
            self.end_question()
        elif self.state == "results":
            if self.qi >= len(self.quiz["questions"]) - 1:
                self.finish()
            else:
                self.state = "board"
                self.bump()
        elif self.state == "board":
            self.start_question()
        return None

    def finish(self):
        """End the game and save the results to the host's history."""
        if self.state == "final":
            return
        self.state = "final"
        self.hist_id = secrets.token_hex(6)
        record_history(self.owner, {
            "id": self.hist_id, "title": self.quiz["title"], "date": time.time(), "quiz_id": self.quiz_id,
            "total": sum(1 for q in self.quiz["questions"] if q["type"] not in ("slide",) + NEUTRAL),
            "questions": self.qstats, "teams": self.team_board(), "ghost_of": self.ghost_of,
            "roster": {"id": self.settings["roster"], "name": self.roster["name"], "total": len(self.roster["students"]),
                       "absent": roster_absent(self.roster, [p["name"] for p in self.players.values()])} if self.roster else None,
            "board": [{"name": p["name"], "avatar": p["avatar"], "score": p["score"], "correct": p.get("correct", 0),
                       "team": TEAMS[p["team"]][0] if p.get("team") is not None else "", "trail": p.get("trail", [])}
                      for _, p in self.ranking()],
        })
        self.bump()

    def add_feedback(self, pid, fb):
        """A player rates the game after it ends; the host's saved report is updated too."""
        if self.state != "final" or pid not in self.players or pid in self.feedback:
            return False
        self.feedback[pid] = fb
        summary = fb_summary(self.feedback.values())
        with dlock:
            for e in history_db.get(self.owner, []):
                if e["id"] == self.hist_id:
                    e["feedback"] = summary
                    save("history", history_db)
                    break
        self.bump()
        return True

    def join(self, name, avatar):
        """Add a player; also allowed while the game is running (they start from 0 points)."""
        pid = secrets.token_hex(8)
        team = None
        if self.state != "lobby" and self.settings["teams"]:
            sizes = [sum(1 for p in self.players.values() if p.get("team") == i) for i in range(self.settings["teams"])]
            team = sizes.index(min(sizes))  # put latecomers in the smallest team
        self.players[pid] = {"name": name, "avatar": avatar, "score": 0, "streak": 0, "correct": 0,
                             "answer": None, "last": None, "team": team, "trail": [0] * len(self.qstats),
                             "log": [], "react_at": 0.0}
        self.bump()
        return pid

    def react(self, pid, idx):
        """A player sends an emoji that floats up on the big screen (rate-limited)."""
        p = self.players.get(pid)
        now = time.time()
        if (not p or not self.settings["react"] or self.state in ("question", "vote")
                or not isinstance(idx, int) or isinstance(idx, bool) or not 0 <= idx < len(EMOTES)
                or now - p.get("react_at", 0) < 1.5):
            return False
        p["react_at"] = now
        self.react_seq += 1
        self.reactions = (self.reactions + [{"id": self.react_seq, "e": EMOTES[idx], "name": p["name"]}])[-12:]
        self.bump()
        return True

    # --- views ---
    def results_data(self, q):
        """What the big screen shows after a question."""
        typ = q["type"]
        answered = [p for p in self.players.values() if p["answer"] is not None]
        r = {"answered": len(answered)}
        if typ in OPTION_TYPES:
            counts = [0] * len(q["a"])
            for p in answered:
                for i in (p["answer"] if typ == "multi" else [p["answer"]]):
                    counts[i] += 1
            r["counts"] = counts
            r["correct"] = q["cs"] if typ == "multi" else ([] if typ == "poll" else [q["c"]])
        elif typ == "wordcloud":
            words = {}
            for p in answered:
                words.setdefault(norm_text(p["answer"]), [p["answer"], 0])[1] += 1
            r["words"] = sorted(words.values(), key=lambda x: -x[1])[:40]
        elif typ == "open":
            r["texts"] = [p["answer"] for p in answered][-60:]
        elif typ == "brainstorm":
            ideas = self.ideas
            if not ideas:  # fewer than 2 ideas: no voting round happened
                ideas = [{"text": p["answer"], "votes": 0} for p in answered]
            r["ideas"] = [{"text": x["text"], "votes": x["votes"]} for x in sorted(ideas, key=lambda x: -x["votes"])][:40]
        elif typ == "slider":
            r["ok"] = sum(1 for p in answered if p["last"]["ok"])
            r["bad"] = len(answered) - r["ok"]
            r["values"] = [p["answer"] for p in answered][:300]
            r["solution"] = q["slider"]
        elif typ == "pin":
            r["ok"] = sum(1 for p in answered if p["last"]["ok"])
            r["bad"] = len(answered) - r["ok"]
            r["pins"] = [{**p["answer"], "ok": p["last"]["ok"]} for p in answered][:300]
            r["solution"] = q["pin"]
            r["ar"] = q["ar"]
        else:  # type / order: right vs wrong
            r["ok"] = sum(1 for p in answered if p["last"]["ok"])
            r["bad"] = len(answered) - r["ok"]
            r["solution"] = q["a"]  # accepted answers, or the right order
            if typ == "type":
                seen = {}
                for p in answered:
                    seen.setdefault(norm_text(p["answer"]), [p["answer"], 0])[1] += 1
                r["given"] = sorted(seen.values(), key=lambda x: -x[1])[:6]
        return r

    def host_view(self):
        q = self.q
        v = {
            "role": "host", "state": self.state, "pin": self.pin, "title": self.quiz["title"],
            "qi": self.qi, "total": len(self.quiz["questions"]),
            "players": [{"id": k, "name": p["name"], "avatar": p["avatar"]} for k, p in self.players.items()],
            "settings": self.settings, "paused": self.paused, "reactions": self.reactions,
        }
        if self.roster:
            v["roster"] = {"name": self.roster["name"], "total": len(self.roster["students"]),
                           "absent": roster_absent(self.roster, [p["name"] for p in self.players.values()])}
        if q and self.state in ("question", "vote", "results", "board"):
            v["question"] = {"type": q["type"], "q": q["q"], "img": q["img"], "video": q.get("video") or "",
                             "t": q["t"], "mult": q["pts"], "body": q.get("body", ""),
                             # never reveal accepted typed answers while the question is open
                             "a": [] if q["type"] == "type" else shown_items(q, self.perm), **input_info(q)}
            v["reading"] = self.reading()
            v["remaining"] = self.remaining() - v["reading"]
            v["answered"] = sum(1 for p in self.players.values() if p["answer"] is not None)
            if self.state in ("results", "board"):
                v["results"] = self.results_data(q)
                v["question"]["explain"] = q.get("explain", "")
            if self.state == "vote":
                v["vote"] = {"ideas": [x["text"] for x in self.ideas], "voted": len(self.voted)}
        rank = [{"name": p["name"], "avatar": p["avatar"], "score": p["score"], "correct": p.get("correct", 0)}
                for _, p in self.ranking()]
        if self.ghosts:
            # ghosts: last game's players, with the score they had after the same number of questions
            k = len(self.qstats)
            rank += [{"name": gh["name"], "avatar": "👻", "ghost": True, "correct": 0,
                      "score": gh["trail"][min(k, len(gh["trail"])) - 1] if k and gh["trail"] else 0}
                     for gh in self.ghosts]
            rank.sort(key=lambda r: -r["score"])
        v["board"] = rank if self.state == "final" else rank[:5]
        if self.ghost_of:
            v["ghosts"] = len(self.ghosts)
        if self.state in ("board", "final"):
            v["teams"] = self.team_board()
        if self.state == "final":
            v["feedback"] = fb_summary(self.feedback.values())
        return v

    def player_view(self, pid):
        p = self.players.get(pid)
        if not p:
            return {"role": "player", "state": "gone"}
        order = [k for k, _ in self.ranking()]
        v = {
            "role": "player", "state": self.state, "name": p["name"], "avatar": p["avatar"], "score": p["score"],
            "rank": order.index(pid) + 1, "nplayers": len(order), "qi": self.qi,
            "total": len(self.quiz["questions"]), "title": self.quiz["title"],
        }
        if p.get("team") is not None:
            v["team"] = {"name": TEAMS[p["team"]][0], "color": TEAMS[p["team"]][1]}
            if self.state in ("board", "final"):
                tb = self.team_board()
                v["team"]["rank"] = [t["name"] for t in tb].index(v["team"]["name"]) + 1
        q = self.q
        if q and self.state == "question":
            v["type"] = q["type"]
            v["answers"] = shown_items(q, self.perm)
            v["img"] = q["img"]
            v["mult"] = q["pts"]
            v.update(input_info(q))
            # questions answered by typing or tapping a picture also show their text on the phone
            if self.settings["showQ"] or q["type"] in ("type", "order", "wordcloud", "open", "slider", "pin", "brainstorm"):
                v["qtext"] = q["q"]
            v["answered"] = p["answer"] is not None
            v["reading"] = self.reading()
            v["remaining"] = self.remaining() - v["reading"]
            v["paused"] = self.paused
        if self.state == "vote":
            v["ideas"] = [{"i": i, "text": x["text"]} for i, x in enumerate(self.ideas) if pid not in x["by"]]
            v["voted"] = pid in self.voted
            v["remaining"] = self.remaining()
            v["maxVotes"] = MAX_VOTES
        if self.state in ("results", "board"):
            v["last"] = p["last"]
            if q and q["type"] not in NEUTRAL and q["type"] != "slide":
                v["right"] = right_text(q)
                v["explain"] = q.get("explain", "")
        if self.state == "final":
            v["feedback_sent"] = pid in self.feedback
            v["review"] = p.get("log", [])
        if self.settings["react"] and self.state not in ("question", "vote"):
            v["emotes"] = EMOTES
        return v


# ---------------- Assignments (self-paced challenges) ----------------
# A host gives a quiz as homework with a deadline. Each player plays alone on their own
# phone, question by question; the timer runs per player. Stored in data/challenges.json:
#   pin -> {owner, title, quiz, created, deadline, players: {pid: {name, avatar, score, streak,
#           correct, qi, phase, q_started, perm, last, answers: {qi: {answered, ok}}}}}
# phase: intro -> question -> feedback -> question ... -> done

def ch_expired(ch):
    return time.time() > ch["deadline"]


def ch_close_timeout(ch, p):
    """If the player let the timer run out, record the question as missed."""
    if p["phase"] != "question" or p["qi"] < 0:
        return
    q = ch["quiz"]["questions"][p["qi"]]
    if q["type"] != "slide" and time.time() > p["q_started"] + q["t"] + 2:
        neutral = q["type"] in NEUTRAL
        if not neutral:
            p["streak"] = 0
        p["answers"][str(p["qi"])] = {"answered": False, "ok": None if neutral else False,
                                      "rev": review_entry(q, None, [], False, 0)}
        p["last"] = {"ok": False, "pts": 0, "timeout": True, "poll": neutral, "kind": q["type"]}
        p["phase"] = "feedback"


def ch_view(ch, pid):
    p = ch["players"].get(pid)
    if not p:
        return {"mode": "challenge", "phase": "gone"}
    ch_close_timeout(ch, p)
    qs = ch["quiz"]["questions"]
    ranked = sorted(ch["players"], key=lambda k: -ch["players"][k]["score"])
    v = {"mode": "challenge", "phase": p["phase"], "title": ch["title"], "name": p["name"], "avatar": p["avatar"],
         "score": p["score"], "qi": p["qi"], "total": len(qs), "deadline": ch["deadline"],
         "expired": ch_expired(ch), "rank": ranked.index(pid) + 1, "nplayers": len(ranked),
         "description": ch["quiz"].get("description", "")}
    if p["phase"] == "question":
        q = qs[p["qi"]]
        v["question"] = public_question(q, p.get("perm") or [])
        v["remaining"] = max(0.0, p["q_started"] + q["t"] - time.time()) if q["type"] != "slide" else 0
    if p["phase"] in ("feedback", "done"):
        v["last"] = p.get("last")
    if p["phase"] == "feedback" and 0 <= p["qi"] < len(qs):
        q = qs[p["qi"]]
        if q["type"] not in NEUTRAL and q["type"] != "slide":
            v["right"] = right_text(q)
            v["explain"] = q.get("explain", "")
    if p["phase"] == "done":
        v["feedback_sent"] = pid in ch.get("feedback", {})
        v["correct"] = p.get("correct", 0)
        v["scored"] = sum(1 for q in qs if q["type"] not in ("slide",) + NEUTRAL)
        v["review"] = [p["answers"][str(i)]["rev"] for i in range(len(qs))
                       if p["answers"].get(str(i), {}).get("rev")]
    return v


def ch_report(pin, ch):
    """Same shape as a live-game history entry, so the host's report screen can show it."""
    qs = ch["quiz"]["questions"]
    players = list(ch["players"].values())
    qstats = []
    for i, q in enumerate(qs):
        if q["type"] == "slide":
            continue
        recs = [p["answers"][str(i)] for p in players if str(i) in p["answers"]]
        qstats.append({"q": q["q"], "type": q["type"], "players": len(recs),
                       "answered": sum(1 for r in recs if r["answered"]),
                       "correct": None if q["type"] in NEUTRAL else sum(1 for r in recs if r["ok"])})
    board = sorted(({"name": p["name"], "avatar": p["avatar"], "score": p["score"], "correct": p.get("correct", 0),
                     "done": p["phase"] == "done"} for p in players), key=lambda x: -x["score"])
    return {"id": pin, "pin": pin, "title": ch["title"], "date": ch["created"], "deadline": ch["deadline"],
            "expired": ch_expired(ch), "total": sum(1 for q in qs if q["type"] not in ("slide",) + NEUTRAL),
            "questions": qstats, "board": board, "finished": sum(1 for p in players if p["phase"] == "done"),
            "feedback": fb_summary(ch.get("feedback", {}).values()),
            "roster": {"id": ch["roster"].get("id", ""), "name": ch["roster"]["name"], "total": len(ch["roster"]["students"]),
                       "absent": roster_absent(ch["roster"], [p["name"] for p in players])} if ch.get("roster") else None}


class Handler(BaseHTTPRequestHandler):
    server_version = "Bilimdon/1.0"

    def log_message(self, fmt, *args):
        pass  # keep the console quiet

    # ---------- utils ----------
    def send_json(self, obj, code=200, cookie=None):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if cookie is not None:
            age = SESSION_DAYS * 86400 if cookie else 0
            secure = "; Secure" if self.is_https() else ""
            self.send_header("Set-Cookie", f"bsid={cookie}; Path=/; HttpOnly; SameSite=Lax; Max-Age={age}{secure}")
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > (MAX_UPLOAD_BODY if self.path == "/api/upload" else MAX_BODY):
            raise ValueError("too big")
        return json.loads(self.rfile.read(n) or b"{}")

    def client_ip(self):
        """The visitor's address. Behind a proxy (TRUST_PROXY=1) it is the first X-Forwarded-For entry."""
        if TRUST_PROXY:
            fwd = self.headers.get("X-Forwarded-For", "").split(",")[0].strip() or self.headers.get("X-Real-IP", "").strip()
            if fwd:
                return fwd[:64]
        return self.client_address[0]

    def is_https(self):
        return TRUST_PROXY and self.headers.get("X-Forwarded-Proto", "").lower() == "https" or PUBLIC_URL.startswith("https://")

    def session_token(self):
        c = SimpleCookie()
        try:
            c.load(self.headers.get("Cookie", ""))
        except Exception:
            return None
        return c["bsid"].value if "bsid" in c else None

    def current_user(self):
        """Login name of the signed-in host, or None."""
        tok = self.session_token()
        with dlock:
            s = sessions.get(tok) if tok else None
            if not s or s["exp"] < time.time() or s["user"] not in users:
                return None
            return s["user"]

    # ---------- accounts, quizzes, assignments ----------
    def auth_api(self, path, body):
        if path == "/api/auth/register":
            name = str(body.get("username", "")).strip()
            pw = str(body.get("password", ""))
            if not USERNAME_RE.match(name):
                return self.send_json({"error": "bad_username"}, 400)
            if len(pw) < 6:
                return self.send_json({"error": "short_password"}, 400)
            login = name.lower()
            with dlock:
                if login in users:
                    return self.send_json({"error": "taken"}, 409)
                salt = secrets.token_hex(16)
                users[login] = {"name": name, "salt": salt, "hash": hash_pw(pw, salt), "created": time.time()}
                code = new_recovery_code(users[login])
                save("users", users)
            # the recovery code is shown once, right now: it is how a forgotten password is reset
            return self.send_json({"user": name, "recovery": code}, cookie=new_session(login))

        if path == "/api/auth/recover":
            # forgotten password: the one-time recovery code sets a new password (and a new code)
            login = str(body.get("username", "")).strip().lower()
            code, new = norm_rc(body.get("code", "")), str(body.get("password", ""))
            with dlock:
                u = users.get(login)
                ok = bool(u and u.get("rc_hash") and hmac.compare_digest(u["rc_hash"], hash_pw(code, u["rc_salt"])))
            if not ok:
                time.sleep(1.0)  # slow down guessing
                return self.send_json({"error": "bad_code"}, 403)
            if len(new) < 6:
                return self.send_json({"error": "short_password"}, 400)
            with dlock:
                u["salt"] = secrets.token_hex(16)
                u["hash"] = hash_pw(new, u["salt"])
                fresh = new_recovery_code(u)  # the used code stops working
                save("users", users)
                for t in [t for t, s in sessions.items() if s["user"] == login]:
                    del sessions[t]  # sign out every device that knew the old password
                save("sessions", sessions)
            return self.send_json({"user": u["name"], "recovery": fresh}, cookie=new_session(login))

        if path == "/api/auth/login":
            login = str(body.get("username", "")).strip().lower()
            pw = str(body.get("password", ""))
            with dlock:
                u = users.get(login)
            if not u or not hmac.compare_digest(u["hash"], hash_pw(pw, u["salt"])):
                time.sleep(0.5)  # slow down password guessing
                return self.send_json({"error": "bad_login"}, 401)
            return self.send_json({"user": u["name"]}, cookie=new_session(login))

        if path == "/api/auth/logout":
            tok = self.session_token()
            with dlock:
                if tok and sessions.pop(tok, None):
                    save("sessions", sessions)
            return self.send_json({"ok": True}, cookie="")

        # everything below needs a signed-in host
        login = self.current_user()
        if not login:
            return self.send_json({"error": "auth"}, 401)

        if path == "/api/auth/password":
            old, new = str(body.get("old", "")), str(body.get("new", ""))
            with dlock:
                u = users[login]
                if not hmac.compare_digest(u["hash"], hash_pw(old, u["salt"])):
                    time.sleep(0.5)
                    return self.send_json({"error": "bad_password"}, 403)
                if len(new) < 6:
                    return self.send_json({"error": "short_password"}, 400)
                u["salt"] = secrets.token_hex(16)
                u["hash"] = hash_pw(new, u["salt"])
                save("users", users)
                # sign out every other device that used the old password
                tok = self.session_token()
                for t in [t for t, s in sessions.items() if s["user"] == login and t != tok]:
                    del sessions[t]
                save("sessions", sessions)
            return self.send_json({"ok": True})

        if path == "/api/auth/recovery-code":
            # a new recovery code (the old one stops working); asks for the password first
            with dlock:
                u = users[login]
                if not hmac.compare_digest(u["hash"], hash_pw(str(body.get("password", "")), u["salt"])):
                    time.sleep(0.5)
                    return self.send_json({"error": "bad_password"}, 403)
                code = new_recovery_code(u)
                save("users", users)
            return self.send_json({"recovery": code})

        if path == "/api/upload":
            raw = str(body.get("data", ""))
            if "," in raw:
                raw = raw.split(",", 1)[1]  # strip "data:image/...;base64,"
            try:
                data = base64.b64decode(raw, validate=True)
            except Exception:
                return self.send_json({"error": "bad_image"}, 400)
            ext = image_ext(data)
            limit = MAX_IMAGE
            if not ext:
                ext, limit = audio_ext(data), MAX_AUDIO
            if not ext:
                return self.send_json({"error": "bad_image"}, 400)
            if len(data) > limit:
                return self.send_json({"error": "too_big"}, 413)
            os.makedirs(UPLOADS, exist_ok=True)
            name = secrets.token_hex(12) + ext
            with open(os.path.join(UPLOADS, name), "wb") as f:
                f.write(data)
            return self.send_json({"url": "/uploads/" + name})

        if path == "/api/ai/generate":
            if not AI_ON:
                return self.send_json({"error": "off"}, 404)
            topic = " ".join(str(body.get("topic", "")).split())[:500]
            if len(topic) < 3:
                return self.send_json({"error": "no_topic"}, 400)
            count = max(1, min(int(body.get("count") or 5), 20))
            lang = body.get("lang") if body.get("lang") in AI_LANGS else "uz"
            grade = " ".join(str(body.get("grade", "")).split())[:40]
            types = [t for t in (body.get("types") or []) if t in ("quiz", "multi", "tf", "type")] or ["quiz"]
            sdk = load_anthropic()
            try:
                qs = ai_generate(topic, count, lang, grade, types)
            except sdk.RateLimitError:
                return self.send_json({"error": "busy"}, 429)
            except (sdk.AuthenticationError, sdk.PermissionDeniedError):
                return self.send_json({"error": "key"}, 502)
            except sdk.APIConnectionError:
                return self.send_json({"error": "network"}, 502)
            except sdk.APIStatusError as e:
                print("AI xatosi:", e.status_code, getattr(e, "message", ""))
                return self.send_json({"error": "api"}, 502)
            except ValueError:  # refusal or unreadable answer
                return self.send_json({"error": "no_result"}, 502)
            return self.send_json({"questions": qs})

        if path == "/api/images/search":
            # picture search (Pixabay); the key stays on the server
            if not PIXABAY_KEY:
                return self.send_json({"error": "off"}, 404)
            q = " ".join(str(body.get("q", "")).split())[:80]
            if not q:
                return self.send_json({"hits": []})
            lang = body.get("lang") if body.get("lang") in ("ru", "en", "tr") else "en"
            page = max(1, min(int(body.get("page") or 1), 10))
            url = "https://pixabay.com/api/?" + urlencode({"key": PIXABAY_KEY, "q": q, "lang": lang, "image_type": "photo",
                                                          "safesearch": "true", "per_page": 24, "page": page})
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Bilimdon"}), timeout=10) as r:
                    data = json.loads(r.read(2_000_000))
            except Exception:
                return self.send_json({"error": "unavailable"}, 502)
            hits = [{"preview": h.get("previewURL", ""), "web": h.get("webformatURL", ""), "w": h.get("webformatWidth"),
                     "h": h.get("webformatHeight"), "user": h.get("user", ""), "page": h.get("pageURL", "")}
                    for h in data.get("hits", []) if str(h.get("webformatURL", "")).startswith("https://")]
            return self.send_json({"hits": hits, "total": data.get("totalHits", 0)})

        if path == "/api/images/save":
            # the chosen picture is copied to this server (Pixabay asks sites not to hotlink)
            src = str(body.get("url", ""))
            host = urlparse(src).hostname or ""
            if not PIXABAY_KEY or not src.startswith("https://") or not (host == "pixabay.com" or host.endswith(".pixabay.com")):
                return self.send_json({"error": "bad_url"}, 400)
            try:
                with urllib.request.urlopen(urllib.request.Request(src, headers={"User-Agent": "Bilimdon"}), timeout=15) as r:
                    data = r.read(MAX_IMAGE + 1)
            except Exception:
                return self.send_json({"error": "unavailable"}, 502)
            ext = image_ext(data)
            if not ext or len(data) > MAX_IMAGE:
                return self.send_json({"error": "bad_image"}, 400)
            os.makedirs(UPLOADS, exist_ok=True)
            name = secrets.token_hex(12) + ext
            with open(os.path.join(UPLOADS, name), "wb") as f:
                f.write(data)
            return self.send_json({"url": "/uploads/" + name})

        if path == "/api/quizzes/save":
            try:
                quiz = clean_quiz(body.get("quiz"))
            except Exception as e:
                return self.send_json({"error": "bad_quiz", "detail": str(e)}, 400)
            owner = str(body.get("owner") or "").strip().lower() or login
            with dlock:
                qid = str(body.get("id") or "")
                if owner != login:
                    # a co-author saves into the owner's library
                    old = quizzes_db.get(owner, {}).get(qid)
                    if not old or login not in old.get("editors", []):
                        return self.send_json({"error": "not_found"}, 404)
                    target = quizzes_db[owner]
                else:
                    target = quizzes_db.setdefault(login, {})
                    if qid not in target:
                        if len(target) >= 200:
                            return self.send_json({"error": "too_many"}, 409)
                        qid = secrets.token_hex(6)
                    old = target.get(qid)
                    if quiz["group"] and login not in groups.get(quiz["group"], {}).get("members", []):
                        quiz["group"] = ""  # can only share with a group you belong to
                base = body.get("base")
                if (old and isinstance(base, (int, float)) and not isinstance(base, bool)
                        and old.get("updated", 0) > base + 0.001 and not body.get("force")):
                    # someone else saved this quiz after it was opened: don't silently overwrite their work
                    return self.send_json({"error": "conflict", "by": old.get("edited_by", "")}, 409)
                if old:
                    for k in ("study", "editors"):  # editing keeps the practice link and the co-authors
                        if old.get(k):
                            quiz[k] = old[k]
                    if owner != login:  # where the quiz lives and who sees it stays the owner's choice
                        for k in ("folder", "group", "public"):
                            quiz[k] = old.get(k, quiz[k])
                quiz["updated"] = time.time()
                quiz["edited_by"] = users[login]["name"]
                target[qid] = quiz
                save("quizzes", quizzes_db)
            return self.send_json({"id": qid, "updated": quiz["updated"]})

        if path == "/api/quizzes/editors":
            # the owner adds or removes co-authors; a co-author may leave
            qid = str(body.get("id", ""))
            with dlock:
                if body.get("leave"):
                    owner = str(body.get("owner", "")).lower()
                    q = quizzes_db.get(owner, {}).get(qid)
                    if q and login in q.get("editors", []):
                        q["editors"].remove(login)
                        save("quizzes", quizzes_db)
                    return self.send_json({"ok": True})
                q = quizzes_db.get(login, {}).get(qid)
                if not q:
                    return self.send_json({"error": "not_found"}, 404)
                eds = q.setdefault("editors", [])
                if body.get("add"):
                    who = str(body["add"]).strip().lower()
                    if who not in users:
                        return self.send_json({"error": "no_user"}, 404)
                    if who == login:
                        return self.send_json({"error": "self"}, 400)
                    if who not in eds:
                        if len(eds) >= 10:
                            return self.send_json({"error": "too_many"}, 409)
                        eds.append(who)
                if body.get("remove"):
                    who = str(body["remove"]).strip().lower()
                    if who in eds:
                        eds.remove(who)
                save("quizzes", quizzes_db)
                return self.send_json({"editors": [{"login": e, "name": users[e]["name"]} for e in eds if e in users]})

        if path.startswith("/api/groups/"):
            return self.groups_api(path, body, login)

        if path == "/api/quizzes/study":
            # turn the student practice link (flashcards + self-test) on or off
            qid = str(body.get("id", ""))
            with dlock:
                q = quizzes_db.get(login, {}).get(qid)
                if not q:
                    return self.send_json({"error": "not_found"}, 404)
                if body.get("on"):
                    if not q.get("study"):
                        taken = {x.get("study") for qz in quizzes_db.values() for x in qz.values()}
                        code = secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZ")
                        while code in taken or len(code) < 7:
                            code = "".join(secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(7))
                        q["study"] = code
                else:
                    q.pop("study", None)
                save("quizzes", quizzes_db)
                return self.send_json({"study": q.get("study")})

        if path == "/api/quizzes/share":
            # send a copy of my quiz to another host's library
            to = str(body.get("to", "")).strip().lower()
            with dlock:
                q = quizzes_db.get(login, {}).get(str(body.get("id", "")))
                if not q:
                    return self.send_json({"error": "not_found"}, 404)
                if to not in users:
                    return self.send_json({"error": "no_user"}, 404)
                if to == login:
                    return self.send_json({"error": "self"}, 400)
                theirs = quizzes_db.setdefault(to, {})
                if len(theirs) >= 200:
                    return self.send_json({"error": "too_many"}, 409)
                copy = {k: v for k, v in json.loads(json.dumps(q)).items() if k not in ("study", "public", "folder", "group", "editors")}
                copy["title"] = (q["title"] + f" ({users[login]['name']})")[:80]
                copy["updated"] = time.time()
                theirs[secrets.token_hex(6)] = copy
                save("quizzes", quizzes_db)
            return self.send_json({"ok": True, "to": users[to]["name"]})

        if path == "/api/quizzes/delete":
            with dlock:
                if quizzes_db.get(login, {}).pop(str(body.get("id", "")), None) is not None:
                    save("quizzes", quizzes_db)
            return self.send_json({"ok": True})

        if path == "/api/history/delete":
            with dlock:
                h = history_db.get(login, [])
                history_db[login] = [e for e in h if e["id"] != body.get("id")]
                save("history", history_db)
            return self.send_json({"ok": True})

        if path == "/api/challenges/create":
            try:
                quiz = clean_quiz(body.get("quiz"))
            except Exception:
                return self.send_json({"error": "bad_quiz"}, 400)
            hours = max(1, min(int(body.get("hours", 24) or 24), 24 * 30))
            with cv, dlock:
                if sum(1 for c in challenges.values() if c["owner"] == login) >= 100:
                    return self.send_json({"error": "too_many"}, 409)
                pin = new_pin()
                now = time.time()
                r = rosters.get(login, {}).get(str(body.get("roster") or ""))
                challenges[pin] = {"owner": login, "title": quiz["title"], "quiz": quiz, "created": now,
                                   "deadline": now + hours * 3600, "players": {},
                                   # a copy of the class list: later edits to the list don't change this assignment
                                   "roster": {"id": str(body.get("roster")), "name": r["name"],
                                              "students": list(r["students"])} if r else None}
                save("challenges", challenges)
            return self.send_json({"pin": pin})

        if path == "/api/rosters/save":
            name, students = clean_roster(body)
            if not name or not students:
                return self.send_json({"error": "empty"}, 400)
            with dlock:
                mine = rosters.setdefault(login, {})
                rid = str(body.get("id") or "")
                if rid not in mine:
                    if len(mine) >= 50:
                        return self.send_json({"error": "too_many"}, 409)
                    rid = secrets.token_hex(6)
                mine[rid] = {"name": name, "students": students}
                save("rosters", rosters)
            return self.send_json({"id": rid, "count": len(students)})

        if path == "/api/rosters/delete":
            with dlock:
                if rosters.get(login, {}).pop(str(body.get("id", "")), None) is not None:
                    save("rosters", rosters)
            return self.send_json({"ok": True})

        if path == "/api/preview":
            # the editor's "try it" button: validate the draft the same way a saved quiz is validated
            try:
                quiz = clean_quiz(body.get("quiz"))
            except Exception:
                return self.send_json({"error": "bad_quiz"}, 400)
            usable = [q for q in quiz["questions"] if q["type"] not in NEUTRAL]
            if not usable:
                return self.send_json({"error": "nothing_to_practice"}, 400)
            return self.send_json({"title": quiz["title"], "description": quiz["description"], "questions": usable})

        if path == "/api/import":
            # restore from a backup file made with /api/export: adds quizzes and class lists, never deletes
            data = body.get("data")
            if not isinstance(data, dict) or data.get("app") != "bilimdon":
                return self.send_json({"error": "bad_file"}, 400)
            added_q = added_r = skipped = 0
            with dlock:
                mine = quizzes_db.setdefault(login, {})
                for q in (data.get("quizzes") or [])[:200]:
                    if len(mine) >= 200:
                        skipped += 1
                        continue
                    try:
                        clean = clean_quiz(q)
                    except Exception:
                        skipped += 1
                        continue
                    clean["group"] = ""  # group membership is not part of a backup
                    clean["updated"] = time.time()
                    mine[secrets.token_hex(6)] = clean
                    added_q += 1
                rs = rosters.setdefault(login, {})
                for r in (data.get("rosters") or [])[:50]:
                    name, students = clean_roster(r if isinstance(r, dict) else {})
                    if name and students and len(rs) < 50:
                        rs[secrets.token_hex(6)] = {"name": name, "students": students}
                        added_r += 1
                save("quizzes", quizzes_db)
                save("rosters", rosters)
            return self.send_json({"quizzes": added_q, "rosters": added_r, "skipped": skipped})

        if path in ("/api/challenges/delete", "/api/challenges/close"):
            pin = str(body.get("pin", ""))
            with dlock:
                ch = challenges.get(pin)
                if ch and ch["owner"] == login:
                    if path.endswith("delete"):
                        del challenges[pin]
                    else:
                        ch["deadline"] = min(ch["deadline"], time.time())
                    save("challenges", challenges)
            return self.send_json({"ok": True})

        return self.send_json({"error": "not_found"}, 404)

    def groups_api(self, path, body, login):
        """Groups of hosts (e.g. a school's teachers) who share quizzes with each other."""
        gid = str(body.get("id", ""))
        with dlock:
            if path == "/api/groups/create":
                name = " ".join(str(body.get("name", "")).split())[:40]
                if not name:
                    return self.send_json({"error": "no_name"}, 400)
                if sum(1 for gr in groups.values() if gr["owner"] == login) >= 20:
                    return self.send_json({"error": "too_many"}, 409)
                gid = secrets.token_hex(6)
                groups[gid] = {"name": name, "owner": login, "members": [login], "created": time.time()}
                save("groups", groups)
                return self.send_json({"id": gid})
            gr = groups.get(gid)
            if not gr or login not in gr["members"]:
                return self.send_json({"error": "not_found"}, 404)
            who = str(body.get("login", "")).strip().lower()
            if path == "/api/groups/add":
                if gr["owner"] != login:
                    return self.send_json({"error": "forbidden"}, 403)
                if who not in users:
                    return self.send_json({"error": "no_user"}, 404)
                if who in gr["members"]:
                    return self.send_json({"error": "already"}, 409)
                if len(gr["members"]) >= 50:
                    return self.send_json({"error": "full"}, 409)
                gr["members"].append(who)
                save("groups", groups)
                return self.send_json({"ok": True, "name": users[who]["name"]})
            if path == "/api/groups/remove":
                # the owner removes members; anyone else may only leave
                if who == gr["owner"]:
                    return self.send_json({"error": "owner"}, 400)
                if who != login and gr["owner"] != login:
                    return self.send_json({"error": "forbidden"}, 403)
                if who in gr["members"]:
                    gr["members"].remove(who)
                    save("groups", groups)
                return self.send_json({"ok": True})
            if path == "/api/groups/delete":
                if gr["owner"] != login:
                    return self.send_json({"error": "forbidden"}, 403)
                del groups[gid]
                for qz in quizzes_db.values():
                    for q in qz.values():
                        if q.get("group") == gid:
                            q["group"] = ""
                save("groups", groups)
                save("quizzes", quizzes_db)
                return self.send_json({"ok": True})
        return self.send_json({"error": "not_found"}, 404)

    def challenge_api(self, path, body):
        """Players taking an assignment (no login)."""
        pin = str(body.get("pin", "")).replace(" ", "")
        with dlock:
            ch = challenges.get(pin)
            if not ch:
                return self.send_json({"error": "no_game"}, 404)
            if path == "/api/join":
                if ch_expired(ch):
                    return self.send_json({"error": "expired"}, 409)
                name = " ".join(str(body.get("name", "")).split())[:16]
                if not name:
                    return self.send_json({"error": "no_name"}, 400)
                if bad_name(name):
                    return self.send_json({"error": "bad_name"}, 400)
                if ch.get("roster"):
                    name = roster_match(ch["roster"], name)
                    if not name:
                        return self.send_json({"error": "not_in_roster"}, 403)
                if any(p["name"].lower() == name.lower() for p in ch["players"].values()):
                    return self.send_json({"error": "name_taken"}, 409)
                if len(ch["players"]) >= 500:
                    return self.send_json({"error": "full"}, 409)
                pid = secrets.token_hex(8)
                ch["players"][pid] = {"name": name, "score": 0, "streak": 0, "correct": 0, "qi": -1,
                                      "avatar": pick_avatar(body.get("avatar")),
                                      "phase": "intro", "q_started": 0, "perm": [], "last": None, "answers": {}}
                save("challenges", challenges)
                return self.send_json({"pid": pid, "mode": "challenge"})

            pid = str(body.get("pid", ""))
            p = ch["players"].get(pid)
            if not p:
                return self.send_json({"mode": "challenge", "phase": "gone"})
            if path == "/api/ch/state":
                return self.send_json(ch_view(ch, pid))
            if path == "/api/ch/feedback":
                fb = clean_feedback(body)
                if fb is None or p["phase"] != "done":
                    return self.send_json({"error": "bad_feedback"}, 400)
                ch.setdefault("feedback", {}).setdefault(pid, fb)
                save("challenges", challenges)
                return self.send_json(ch_view(ch, pid))
            if ch_expired(ch) and p["phase"] != "done":
                return self.send_json(ch_view(ch, pid))
            qs = ch["quiz"]["questions"]
            if path == "/api/ch/next":
                ch_close_timeout(ch, p)
                cur = qs[p["qi"]] if 0 <= p["qi"] < len(qs) else None
                if p["phase"] in ("intro", "feedback") or (p["phase"] == "question" and cur and cur["type"] == "slide"):
                    p["qi"] += 1
                    if p["qi"] >= len(qs):
                        p["phase"] = "done"
                    else:
                        q = qs[p["qi"]]
                        p["phase"], p["q_started"], p["last"] = "question", time.time(), None
                        p["perm"] = make_perm(len(q["a"])) if q["type"] == "order" else []
                    save("challenges", challenges)
                return self.send_json(ch_view(ch, pid))
            if path == "/api/ch/answer":
                ch_close_timeout(ch, p)
                if p["phase"] != "question":
                    return self.send_json(ch_view(ch, pid))
                q = qs[p["qi"]]
                res = evaluate(q, body.get("choice"), p["perm"]) if q["type"] != "slide" else None
                if res is None:
                    return self.send_json({"error": "bad_answer"}, 400)
                ok, choice = res
                neutral = q["type"] in NEUTRAL
                if not neutral:
                    p["streak"] = p["streak"] + 1 if ok else 0
                if ok:
                    p["correct"] += 1
                pts = points(q, ok, time.time() - p["q_started"], p["streak"])
                p["score"] += pts
                p["answers"][str(p["qi"])] = {"answered": True, "ok": None if neutral else ok,
                                              "rev": review_entry(q, choice, p["perm"], ok, pts)}
                p["last"] = {"ok": ok, "pts": pts, "streak": p["streak"], "poll": neutral, "kind": q["type"]}
                p["phase"] = "feedback"
                save("challenges", challenges)
                return self.send_json(ch_view(ch, pid))
        return self.send_json({"error": "not_found"}, 404)

    # ---------- GET ----------
    def do_GET(self):
        url = urlparse(self.path)
        path = url.path
        if path == "/api/info":
            # base: the address players should open (the public site, or this computer on the school Wi-Fi)
            return self.send_json({"ip": lan_ip(), "port": PORT, "avatars": AVATARS,
                                   "base": PUBLIC_URL or f"http://{lan_ip()}:{PORT}",
                                   # which optional services are switched on (keys set on the server)
                                   "features": {"images": bool(PIXABAY_KEY), "ai": AI_ON}})
        if path == "/api/events":
            return self.events(parse_qs(url.query))
        if path == "/api/auth/me":
            login = self.current_user()
            with dlock:
                return self.send_json({"user": users[login]["name"] if login else None})
        if path == "/api/study":
            # practice mode for students: no login, only quizzes whose host turned the link on
            code = (parse_qs(url.query).get("code") or [""])[0].strip().upper()
            with dlock:
                found = next((q for qz in quizzes_db.values() for q in qz.values() if code and q.get("study") == code), None)
                if not found:
                    return self.send_json({"error": "not_found"}, 404)
                usable = [q for q in found["questions"] if q["type"] not in NEUTRAL]
                return self.send_json({"title": found["title"], "description": found.get("description", ""),
                                       "cover": found.get("cover", ""), "questions": usable})
        if path in ("/api/rosters", "/api/export"):
            login = self.current_user()
            if not login:
                return self.send_json({"error": "auth"}, 401)
            with dlock:
                if path == "/api/rosters":
                    return self.send_json([{"id": rid, **r} for rid, r in sorted(rosters.get(login, {}).items(), key=lambda kv: kv[1]["name"].lower())])
                # one host's own data, for keeping a copy at home or moving to another server
                data = {"app": "bilimdon", "version": 1, "user": users[login]["name"], "exported": time.time(),
                        "quizzes": [{k: v for k, v in q.items() if k not in ("study", "group", "updated")}
                                    for q in quizzes_db.get(login, {}).values()],
                        "rosters": list(rosters.get(login, {}).values()),
                        "history": history_db.get(login, []),
                        "assignments": [ch_report(pin, c) for pin, c in challenges.items() if c["owner"] == login]}
            body = json.dumps(data, ensure_ascii=False, indent=1).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Disposition", f'attachment; filename="bilimdon_{login}_{time.strftime("%Y-%m-%d")}.json"')
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
            return
        if path in ("/api/groups", "/api/groups/quizzes"):
            login = self.current_user()
            if not login:
                return self.send_json({"error": "auth"}, 401)
            with dlock:
                if path == "/api/groups":
                    mine = [{"id": gid, "name": gr["name"], "owner": users[gr["owner"]]["name"], "is_owner": gr["owner"] == login,
                             "members": [{"login": m, "name": users[m]["name"]} for m in gr["members"] if m in users],
                             "quizzes": sum(1 for m in gr["members"] for q in quizzes_db.get(m, {}).values() if q.get("group") == gid)}
                            for gid, gr in groups.items() if login in gr["members"]]
                    return self.send_json(sorted(mine, key=lambda g: g["name"].lower()))
                gid = (parse_qs(url.query).get("id") or [""])[0]
                gr = groups.get(gid)
                if not gr or login not in gr["members"]:
                    return self.send_json({"error": "not_found"}, 404)
                # only quizzes of current members count: someone who left takes their quizzes along
                out = [{"id": qid, "owner": users[m]["name"], "mine": m == login, **q}
                       for m in gr["members"] if m in users for qid, q in quizzes_db.get(m, {}).items() if q.get("group") == gid]
                return self.send_json(sorted(out, key=lambda q: -q.get("updated", 0)))
        if path in ("/api/quizzes", "/api/history", "/api/challenges", "/api/discover"):
            login = self.current_user()
            if not login:
                return self.send_json({"error": "auth"}, 401)
            with dlock:
                if path == "/api/quizzes":
                    own = [{"id": k, **q, "editors": [{"login": e, "name": users[e]["name"]} for e in q.get("editors", []) if e in users]}
                           for k, q in quizzes_db.get(login, {}).items()]
                    # quizzes other hosts invited me to edit with them
                    shared = [{"id": k, **{x: y for x, y in q.items() if x not in ("editors", "study")},
                               "owner": users[o]["name"], "owner_login": o, "shared": True}
                              for o, qz in quizzes_db.items() if o != login and o in users
                              for k, q in qz.items() if login in q.get("editors", [])]
                    return self.send_json(sorted(own + shared, key=lambda q: -q.get("updated", 0)))
                if path == "/api/challenges":
                    mine = [ch_report(pin, c) for pin, c in challenges.items() if c["owner"] == login]
                    return self.send_json(sorted(mine, key=lambda c: -c["date"]))
                if path == "/api/discover":
                    out = [{"id": qid, "owner": users[o]["name"], "mine": o == login, **q}
                           for o, qz in quizzes_db.items() if o in users for qid, q in qz.items() if q.get("public")]
                    return self.send_json(sorted(out, key=lambda q: -q.get("updated", 0))[:200])
                return self.send_json(history_db.get(login, []))
        if UPLOAD_RE.match(path):  # pictures uploaded by hosts
            full = os.path.join(UPLOADS, path.rsplit("/", 1)[1])
            if not os.path.isfile(full):
                return self.send_error(404)
            with open(full, "rb") as f:
                data = f.read()
            self.send_response(200)
            self.send_header("Content-Type", MEDIA_TYPES[os.path.splitext(full)[1]])
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            self.wfile.write(data)
            return
        if path in ("/", ""):
            path = "/index.html"
        elif path in ("/host", "/privacy", "/terms", "/help"):
            path += ".html"
        full = os.path.normpath(os.path.join(ROOT, path.lstrip("/")))
        if not full.startswith(ROOT) or not os.path.isfile(full):
            self.send_error(404)
            return
        st = os.stat(full)
        # weak school Wi-Fi: phones re-check files cheaply (304) and get text files gzip-compressed
        etag = f'"{st.st_mtime_ns:x}-{st.st_size:x}"'
        if self.headers.get("If-None-Match") == etag:
            self.send_response(304)
            self.send_header("ETag", etag)
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            return
        ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
        text = ctype.startswith("text/") or ctype.endswith("javascript") or ctype.endswith("json")
        if text:
            ctype += "; charset=utf-8"
        gz = text and "gzip" in self.headers.get("Accept-Encoding", "")
        data = static_bytes(full, st.st_mtime_ns, gz)
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.send_header("ETag", etag)
        if text:
            self.send_header("Vary", "Accept-Encoding")
        if gz:
            self.send_header("Content-Encoding", "gzip")
        self.end_headers()
        self.wfile.write(data)

    def do_HEAD(self):
        """Lets clients check whether their game/session still exists."""
        url = urlparse(self.path)
        qs = parse_qs(url.query)
        pin, key, pid = ((qs.get(k) or [""])[0] for k in ("pin", "key", "pid"))
        with cv:
            g = games.get(pin)
            ok = g and ((key and key == g.key) or (pid and pid in g.players))
        self.send_response(200 if ok else 404)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def events(self, qs):
        pin = (qs.get("pin") or [""])[0]
        key = (qs.get("key") or [""])[0]
        pid = (qs.get("pid") or [""])[0]
        with cv:
            g = games.get(pin)
            ok = g and ((key and key == g.key) or (pid and pid in g.players))
        if not ok:
            return self.send_json({"error": "not_found"}, 404)
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()
        last = -1
        try:
            while True:
                with cv:
                    g = games.get(pin)
                    if g is not None and g.version == last:
                        cv.wait(15)
                    g = games.get(pin)
                    if g is None:
                        data = {"state": "gone"}
                    elif g.version != last:
                        last = g.version
                        data = g.host_view() if key else g.player_view(pid)
                    else:
                        data = None
                if data is None:
                    self.wfile.write(b": ping\n\n")
                else:
                    self.wfile.write(b"data: " + json.dumps(data).encode() + b"\n\n")
                self.wfile.flush()
                if data and data.get("state") == "gone":
                    return
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, OSError):
            return

    # ---------- POST ----------
    def do_POST(self):
        try:
            body = self.read_json()
        except Exception:
            return self.send_json({"error": "bad_json"}, 400)
        path = urlparse(self.path).path
        if not rate_ok(self.client_ip(), path):
            return self.send_json({"error": "too_many_requests"}, 429)
        if path.startswith(("/api/auth/", "/api/quizzes/", "/api/history/", "/api/challenges/", "/api/groups/", "/api/rosters/")) \
                or path in ("/api/upload", "/api/import", "/api/preview", "/api/images/search", "/api/images/save", "/api/ai/generate"):
            return self.auth_api(path, body)
        if path.startswith("/api/ch/"):
            return self.challenge_api(path, body)
        pin = str(body.get("pin", "")).replace(" ", "")
        if path == "/api/pin":
            # step 1 of joining: is there a game behind this PIN, and what will step 2 need?
            with dlock:
                ch = challenges.get(pin)
                if ch:
                    if ch_expired(ch):
                        return self.send_json({"error": "expired"}, 409)
                    return self.send_json({"ok": True, "mode": "challenge", "title": ch["title"],
                                           "nick": False, "roster": bool(ch.get("roster"))})
            with cv:
                g = games.get(pin)
                if not g:
                    return self.send_json({"error": "no_game"}, 404)
                if g.state == "final":
                    return self.send_json({"error": "finished"}, 409)
                if g.settings["lock"]:
                    return self.send_json({"error": "locked"}, 423)
                return self.send_json({"ok": True, "mode": "live", "title": g.quiz["title"],
                                       "nick": bool(g.settings["nick"] and not g.roster), "roster": bool(g.roster)})
        if path == "/api/join":
            with dlock:
                is_challenge = pin in challenges
            if is_challenge:
                return self.challenge_api(path, body)
        owner = self.current_user() if path == "/api/host/create" else None
        with cv:
            if path == "/api/host/create":
                if not owner:
                    return self.send_json({"error": "auth"}, 401)
                try:
                    quiz = clean_quiz(body.get("quiz"))
                except Exception:
                    return self.send_json({"error": "bad_quiz"}, 400)
                for old in [p for p, g in games.items() if time.time() - g.created > 6 * 3600]:
                    del games[old]
                ghosts, ghost_of = [], ""
                if body.get("ghost"):
                    with dlock:
                        past = next((e for e in history_db.get(owner, []) if e["id"] == body["ghost"]), None)
                    if not past or not any(b.get("trail") for b in past["board"]):
                        return self.send_json({"error": "no_ghosts"}, 404)
                    ghosts = [{"name": b["name"], "trail": b["trail"]} for b in past["board"][:10] if b.get("trail")]
                    ghost_of = past["id"]
                g = Game(quiz, owner, str(body.get("quiz_id") or "")[:16], ghosts, ghost_of)
                games[g.pin] = g
                return self.send_json({"pin": g.pin, "key": g.key})

            g = games.get(pin)
            if not g:
                return self.send_json({"error": "no_game"}, 404)

            if path == "/api/feedback":
                fb = clean_feedback(body)
                if fb is None or not g.add_feedback(str(body.get("pid", "")), fb):
                    return self.send_json({"error": "bad_feedback"}, 400)
                return self.send_json({"ok": True})

            if path == "/api/join":
                if g.state == "final":
                    return self.send_json({"error": "finished"}, 409)
                if g.settings["lock"]:
                    return self.send_json({"error": "locked"}, 423)
                if len(g.players) >= 200:
                    return self.send_json({"error": "full"}, 409)
                if g.settings["nick"] and not g.roster:
                    name = g.nickname()
                else:
                    name = " ".join(str(body.get("name", "")).split())[:16]
                    if not name:
                        return self.send_json({"error": "no_name"}, 400)
                    if g.roster:  # class-list game: only students on the list, with their listed name
                        name = roster_match(g.roster, name)
                        if not name:
                            return self.send_json({"error": "not_in_roster"}, 403)
                    elif bad_name(name):
                        return self.send_json({"error": "bad_name"}, 400)
                    if name.lower() in g.banned:
                        return self.send_json({"error": "banned"}, 403)
                    if any(p["name"].lower() == name.lower() for p in g.players.values()):
                        return self.send_json({"error": "name_taken"}, 409)
                pid = g.join(name, pick_avatar(body.get("avatar")))
                return self.send_json({"pid": pid, "name": name})

            if path == "/api/answer":
                ok = g.answer(str(body.get("pid", "")), body.get("choice"))
                return self.send_json({"ok": ok})

            if path == "/api/react":
                return self.send_json({"ok": g.react(str(body.get("pid", "")), body.get("e"))})

            if path == "/api/host/action":
                if body.get("key") != g.key:
                    return self.send_json({"error": "forbidden"}, 403)
                act = body.get("action")
                if act == "next":
                    err = g.host_next()
                    return self.send_json({"error": err} if err else {"ok": True}, 409 if err else 200)
                if act == "settings":
                    s = body.get("settings", {})
                    for k in ("lock", "react"):  # can be toggled at any time
                        if k in s:
                            g.settings[k] = bool(s[k])
                    if g.state == "lobby":
                        for k in ("shuffleQ", "shuffleA", "showQ", "nick", "accuracy"):
                            if k in s:
                                g.settings[k] = bool(s[k])
                        if s.get("teams") in (0, 2, 3, 4):
                            g.settings["teams"] = s["teams"]
                        if s.get("read") in (0, 3, 5, 10):
                            g.settings["read"] = s["read"]
                        if s.get("limit") in (0, 5, 10, 15, 20, 30):
                            g.settings["limit"] = s["limit"]
                        if "roster" in s:
                            rid = str(s["roster"] or "")
                            with dlock:
                                r = rosters.get(g.owner, {}).get(rid)
                            g.roster = {"name": r["name"], "students": list(r["students"])} if r else None
                            g.settings["roster"] = rid if r else ""
                    g.bump()
                    return self.send_json({"ok": True})
                if act in ("pause", "resume"):
                    ok = g.pause() if act == "pause" else g.resume()
                    return self.send_json({"ok": ok})
                if act == "kick":
                    gone = g.players.pop(str(body.get("pid", "")), None)
                    if gone is not None and body.get("ban"):
                        g.banned.add(gone["name"].lower())  # this name may not join this game again
                    if gone is not None:
                        if (g.state == "question" and g.q["type"] != "slide" and g.players
                                and all(p["answer"] is not None for p in g.players.values())):
                            g.end_question()
                        g.bump()
                    return self.send_json({"ok": True})
                if act == "end":
                    if g.timer:
                        g.timer.cancel()
                    del games[g.pin]
                    cv.notify_all()
                    return self.send_json({"ok": True})
                return self.send_json({"error": "bad_action"}, 400)

        self.send_json({"error": "not_found"}, 404)


class DualStackServer(ThreadingHTTPServer):
    """Listens on IPv6 and IPv4 so `localhost` (often ::1 on Windows) answers instantly."""
    address_family = socket.AF_INET6

    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        super().server_bind()


def reset_password(login):
    """Command line: python server.py reset-password <login>  (when a host forgot the password)."""
    login = login.lower()
    probe = socket.socket()
    probe.settimeout(0.5)
    running = probe.connect_ex(("127.0.0.1", PORT)) == 0
    probe.close()
    if running:
        # the running server keeps users in memory and would overwrite this change
        print("Avval serverni to'xtating (server oynasida Ctrl+C), keyin bu buyruqni qayta ishga tushiring.")
        return
    if login not in users:
        print(f"'{login}' degan foydalanuvchi topilmadi. Mavjudlar: {', '.join(sorted(users)) or '—'}")
        return
    temp = secrets.token_urlsafe(6)
    u = users[login]
    u["salt"] = secrets.token_hex(16)
    u["hash"] = hash_pw(temp, u["salt"])
    save("users", users)
    for t in [t for t, s in sessions.items() if s["user"] == login]:
        del sessions[t]
    save("sessions", sessions)
    print(f"{u['name']} uchun vaqtinchalik parol: {temp}")
    print("Kirgandan keyin profil menyusidan parolni o'zgartirishni ayting.")


def main():
    import sys
    if len(sys.argv) == 3 and sys.argv[1] == "reset-password":
        return reset_password(sys.argv[2])
    try:
        srv = DualStackServer(("::", PORT), Handler)
    except OSError:
        srv = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    srv.daemon_threads = True
    threading.Thread(target=backup_loop, daemon=True).start()
    ip = lan_ip()
    print("Bilimdon server ishga tushdi")
    print(f"  Zaxira nusxalar: {BACKUPS} (har kuni, oxirgi {KEEP_BACKUPS} kun saqlanadi)")
    print(f"  Sayt:                     http://localhost:{PORT}/   (o'ng yuqorida 'Login' - hostlar uchun)")
    print(f"  O'yinchilar (telefon):    http://{ip}:{PORT}/")
    print("To'xtatish uchun: Ctrl+C")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
