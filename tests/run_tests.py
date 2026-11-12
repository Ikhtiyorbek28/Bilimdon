"""Bilimdon automatic tests.

    python tests/run_tests.py

Starts its own server on a free port with a throwaway data folder (BILIMDON_DATA), so the real
data in ./data is never read or changed. Prints one line per check and exits with 1 if any failed.
"""
import http.cookiejar
import json
import os
import secrets
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SERVER = os.path.join(os.path.dirname(HERE), "server.py")
results = []


def check(name, ok, detail=""):
    results.append(bool(ok))
    print(("  OK   " if ok else "  FAIL ") + name + ("" if ok else f"   -> {detail}"))


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


class Server:
    def __init__(self, data, port):
        env = {**os.environ, "BILIMDON_DATA": data, "PORT": str(port), "PYTHONIOENCODING": "utf-8"}
        for k in ("PIXABAY_KEY", "ANTHROPIC_API_KEY", "PUBLIC_URL", "TRUST_PROXY"):
            env.pop(k, None)
        self.proc = subprocess.Popen([sys.executable, "-I", SERVER], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        self.base = f"http://127.0.0.1:{port}"
        for _ in range(100):
            try:
                urllib.request.urlopen(self.base + "/api/info", timeout=1)
                return
            except Exception:
                time.sleep(0.1)
        raise RuntimeError("server did not start: " + self.proc.stderr.read().decode(errors="replace"))

    def stop(self):
        self.proc.terminate()
        self.proc.wait(5)


def client(base):
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def call(path, body=None):
        data = None if body is None else json.dumps(body).encode()
        req = urllib.request.Request(base + path, data, {"Content-Type": "application/json"})
        try:
            with op.open(req, timeout=15) as r:
                raw = r.read()
                return json.loads(raw) if r.headers.get("Content-Type", "").startswith("application/json") else {"_text": raw.decode()}
        except urllib.error.HTTPError as e:
            return {"status": e.code, **json.loads(e.read() or b"{}")}
    return call


def view(base, pin, **kw):
    q = "&".join(f"{k}={v}" for k, v in kw.items())
    with urllib.request.urlopen(f"{base}/api/events?pin={pin}&{q}", timeout=10) as r:
        for line in r:
            if line.startswith(b"data:"):
                return json.loads(line[5:])


def advance_to(base, act, pin, key, state):
    for _ in range(10):
        if view(base, pin, key=key)["state"] == state:
            return True
        act(action="next")
    return False


QUIZ = {"title": "Test", "questions": [
    {"type": "quiz", "q": "2+2?", "a": ["3", "4"], "c": 1, "t": 20, "explain": "2+2=4"},
    {"type": "tf", "q": "Yer dumaloq", "a": ["To'g'ri", "Noto'g'ri"], "c": 0, "t": 20},
    {"type": "brainstorm", "q": "G'oyalar?", "t": 60},
]}


def main():
    data = tempfile.mkdtemp(prefix="bilimdon-test-")
    port = free_port()
    print("Test data folder:", data)
    srv = Server(data, port)
    B = srv.base
    try:
        # ---- accounts ----
        print("Accounts")
        a, b, anon = client(B), client(B), client(B)
        r = a("/api/auth/register", {"username": "teacher_a", "password": "secret123"})
        check("register gives a recovery code", r.get("user") == "teacher_a" and len(r.get("recovery", "")) == 19, r)
        code = r.get("recovery", "")
        check("short password rejected", b("/api/auth/register", {"username": "teacher_b", "password": "123"}).get("error") == "short_password")
        b("/api/auth/register", {"username": "teacher_b", "password": "secret456"})
        check("name already taken", anon("/api/auth/register", {"username": "TEACHER_A", "password": "secret123"}).get("error") == "taken")
        check("wrong password", anon("/api/auth/login", {"username": "teacher_a", "password": "nope"}).get("error") == "bad_login")
        r = anon("/api/auth/recover", {"username": "teacher_a", "code": code.lower().replace("-", " "), "password": "newpass1"})
        check("recovery code sets a new password", r.get("user") == "teacher_a" and r.get("recovery") not in (None, code), r)
        check("used code no longer works", client(B)("/api/auth/recover", {"username": "teacher_a", "code": code, "password": "x1234567"}).get("error") == "bad_code")
        check("old session signed out after recovery", a("/api/quizzes").get("error") == "auth")
        a = client(B)
        check("login with the new password", a("/api/auth/login", {"username": "teacher_a", "password": "newpass1"}).get("user") == "teacher_a")
        r = client(B)("/api/quizzes")  # a fresh visitor (anon signed in through the recovery above)
        check("API needs sign-in", isinstance(r, dict) and r.get("error") == "auth", r)

        # ---- quizzes and co-authors ----
        print("Quizzes")
        s = a("/api/quizzes/save", {"quiz": QUIZ})
        qid = s.get("id")
        check("save quiz", bool(qid), s)
        check("bad quiz rejected", a("/api/quizzes/save", {"quiz": {"title": "x", "questions": []}}).get("error") == "bad_quiz")
        check("add co-author", a("/api/quizzes/editors", {"id": qid, "add": "teacher_b"}).get("editors", [{}])[0].get("login") == "teacher_b")
        shared = [q for q in b("/api/quizzes") if q.get("shared")]
        check("co-author sees the quiz", len(shared) == 1 and shared[0]["owner_login"] == "teacher_a", shared)
        base = shared[0]["updated"] if shared else 0
        r = b("/api/quizzes/save", {"id": qid, "owner": "teacher_a", "base": base, "quiz": {**QUIZ, "title": "Test (B)"}})
        check("co-author can save", "id" in r, r)
        check("stale save gives a conflict", a("/api/quizzes/save", {"id": qid, "base": base, "quiz": QUIZ}).get("error") == "conflict")
        check("co-author can't delete", b("/api/quizzes/delete", {"id": qid}) and len([q for q in a("/api/quizzes") if q["id"] == qid]) == 1)
        r = a("/api/preview", {"quiz": QUIZ})
        check("preview drops no-answer types", [q["type"] for q in r.get("questions", [])] == ["quiz", "tf"], r)

        # ---- class list ----
        rid = a("/api/rosters/save", {"name": "5-A", "students": ["Ali", "Vali", "ali"]}).get("id")
        check("class list saved without duplicates", rid and a("/api/rosters")[0]["students"] == ["Ali", "Vali"])

        # ---- live game ----
        print("Live game")
        g = a("/api/host/create", {"quiz": QUIZ, "quiz_id": qid})
        pin, key = g["pin"], g["key"]
        act = lambda **x: a("/api/host/action", {"pin": pin, "key": key, **x})
        act(action="settings", settings={"roster": rid, "read": 3})
        p = client(B)
        r = p("/api/pin", {"pin": pin})
        check("PIN step: game found, class list flagged", r.get("ok") and r.get("mode") == "live" and r.get("roster") is True, r)
        check("PIN step: wrong PIN", p("/api/pin", {"pin": "000000"}).get("error") == "no_game")
        check("name not on the class list refused", p("/api/join", {"pin": pin, "name": "Begona"}).get("error") == "not_in_roster")
        ali = p("/api/join", {"pin": pin, "name": "ali"})
        vali = p("/api/join", {"pin": pin, "name": "Vali"})
        check("listed name joins with the listed spelling", ali.get("name") == "Ali", ali)
        check("reaction in the lobby", p("/api/react", {"pin": pin, "pid": ali["pid"], "e": 0}).get("ok") is True)
        act(action="next")
        hv = view(B, pin, key=key)
        check("reading time before answers", hv["state"] == "question" and hv["reading"] > 2, hv.get("reading"))
        check("no answers while reading", p("/api/answer", {"pin": pin, "pid": ali["pid"], "choice": 1}).get("ok") is False)
        time.sleep(3.2)
        p("/api/answer", {"pin": pin, "pid": ali["pid"], "choice": 1})
        p("/api/answer", {"pin": pin, "pid": vali["pid"], "choice": 0})
        pv = view(B, pin, pid=vali["pid"])
        check("wrong player sees the right answer and explanation", pv.get("right") == "4" and pv.get("explain") == "2+2=4", pv)
        advance_to(B, act, pin, key, "question")
        time.sleep(3.2)
        for pl in (ali, vali):
            p("/api/answer", {"pin": pin, "pid": pl["pid"], "choice": 0})
        advance_to(B, act, pin, key, "question")
        time.sleep(3.2)
        p("/api/answer", {"pin": pin, "pid": ali["pid"], "choice": "Daraxt ekish"})
        p("/api/answer", {"pin": pin, "pid": vali["pid"], "choice": "Kitob burchagi"})
        hv = view(B, pin, key=key)
        check("brainstorm goes to voting", hv["state"] == "vote" and len(hv["vote"]["ideas"]) == 2, hv.get("state"))
        check("can't vote for own idea", p("/api/answer", {"pin": pin, "pid": ali["pid"], "choice": [0]}).get("ok") is False)
        p("/api/answer", {"pin": pin, "pid": ali["pid"], "choice": [1]})
        p("/api/answer", {"pin": pin, "pid": vali["pid"], "choice": [0]})
        hv = view(B, pin, key=key)
        check("voting results", hv["state"] == "results" and sorted(x["votes"] for x in hv["results"]["ideas"]) == [1, 1], hv.get("results"))
        advance_to(B, act, pin, key, "final")
        pv = view(B, pin, pid=ali["pid"])
        check("answer review at the end", len(pv.get("review", [])) == 3 and pv["review"][0]["ok"] is True, pv.get("review"))
        h = a("/api/history")
        check("game saved to history with the class list", h and h[0]["roster"]["total"] == 2 and h[0]["roster"]["absent"] == [], h[:1])
        act(action="end")

        # ---- assignment ----
        print("Assignment")
        c = a("/api/challenges/create", {"quiz": QUIZ, "hours": 24, "roster": rid}).get("pin")
        st = p("/api/join", {"pin": c, "name": "vali"})
        check("assignment join", st.get("mode") == "challenge", st)
        cp = st["pid"]
        p("/api/ch/next", {"pin": c, "pid": cp})
        st = p("/api/ch/answer", {"pin": c, "pid": cp, "choice": 0})
        check("assignment feedback", st.get("phase") == "feedback" and st.get("right") == "4", st)
        rep = a("/api/challenges")
        check("assignment report", rep and rep[0]["board"][0]["name"] == "Vali", rep[:1])

        # ---- 3D avatars ("3d:<character>.<accessory>.<colour>") ----
        print("Avatars")
        g = a("/api/host/create", {"quiz": QUIZ, "quiz_id": qid})
        apin, akey = g["pin"], g["key"]
        joins = {"Lola": "3d:star.tophat.galaxy", "Bek": "3d:fire.none.ff4d5e", "Sardor": "3d:robot.none.x",
                 "Nodir": "3d:dragon.none.x", "Olim": "3d:robot.crown.x", "Aziz": "3d:robot.none.<b>", "Kamol": 3,
                 "Dilya": True}
        for nm, av in joins.items():
            client(B)("/api/join", {"pin": apin, "name": nm, "avatar": av})
        got = {p["name"]: p["avatar"] for p in view(B, apin, key=akey).get("players", [])}
        check("3D avatar tokens kept", [got.get(n) for n in ("Lola", "Bek", "Sardor")] == [joins["Lola"], joins["Bek"], joins["Sardor"]], got)
        check("unknown 3D avatars replaced", all(got.get(n, "").startswith("c") for n in ("Nodir", "Olim", "Aziz")), got)
        check("SVG avatar by number still works", got.get("Kamol") == "c3" and got.get("Dilya", "").startswith("c"), got)
        a("/api/host/action", {"pin": apin, "key": akey, "action": "end"})

        # ---- export / import ----
        print("Backup")
        exp = a("/api/export")
        check("export has quizzes and class lists", exp.get("app") == "bilimdon" and exp.get("quizzes") and exp.get("rosters"), list(exp))
        r = b("/api/import", {"data": exp})
        check("import adds to another account", r.get("quizzes", 0) >= 1, r)
        check("import rejects other files", b("/api/import", {"data": {"x": 1}}).get("error") is not None)

        # ---- pages, limits, optional services ----
        print("Pages and limits")
        info = anon("/api/info")
        check("optional services off without keys", info.get("features") == {"images": False, "ai": False}, info.get("features"))
        for path in ("/", "/host", "/privacy", "/terms", "/help"):
            with urllib.request.urlopen(B + path, timeout=5) as r:
                check(f"page {path}", r.status == 200)
        req = urllib.request.Request(B + "/", headers={"Accept-Encoding": "gzip"})
        with urllib.request.urlopen(req, timeout=5) as r:
            zipped, etag = r.headers.get("Content-Encoding"), r.headers.get("ETag")
            size = len(r.read())
        with urllib.request.urlopen(B + "/", timeout=5) as r:
            plain = len(r.read())
        check("pages are gzip-compressed", zipped == "gzip" and size < plain / 2, (zipped, size, plain))
        try:
            urllib.request.urlopen(urllib.request.Request(B + "/", headers={"If-None-Match": etag}), timeout=5)
            not_modified = False
        except urllib.error.HTTPError as e:
            not_modified = e.code == 304
        check("unchanged page answers 304", not_modified)
        check("picture save accepts only Pixabay", a("/api/images/save", {"url": "https://example.com/a.jpg"}).get("error") == "bad_url")
        guess = client(B)
        errs = [guess("/api/auth/login", {"username": "nobody", "password": "x"}).get("error") for _ in range(12)]
        check("password guessing is slowed down", errs[-1] == "too_many_requests", errs)
    finally:
        srv.stop()

    # ---- data survives a restart (SQLite) ----
    print("Restart")
    srv = Server(data, port)
    try:
        a = client(srv.base)
        check("login after restart", a("/api/auth/login", {"username": "teacher_a", "password": "newpass1"}).get("user") == "teacher_a")
        titles = [q["title"] for q in a("/api/quizzes")]
        check("quizzes after restart (co-author's save kept)", titles == ["Test (B)"], titles)
        check("history after restart", len(a("/api/history")) == 1)
        check("database file used", os.path.isfile(os.path.join(data, "bilimdon.db")))
    finally:
        srv.stop()
        shutil.rmtree(data, ignore_errors=True)

    failed = results.count(False)
    print(f"\n{len(results) - failed}/{len(results)} checks passed" + (f", {failed} FAILED" if failed else " ✔"))
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
