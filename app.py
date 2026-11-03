#!/usr/bin/env python3
"""Freelearn: открытые материалы и потоковое видео, без аккаунтов и базы данных."""
from __future__ import annotations
import json
import mimetypes
import os
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"
CATALOG = Path(os.environ.get("FREELEARN_CATALOG", str(ROOT / "catalog.json")))
DIRECTIONS_FILE = Path(os.environ.get("FREELEARN_DIRECTIONS", str(ROOT / "directions.json")))
MEDIA_MANIFEST = ROOT / "media.json"
# Готовые видео по указанию Романа (2026-10-29) лежат прямо в «Проекты/Создание видео»; раздаются только файлы из media.json.
EXPORTS = (ROOT.parent.parent / "Создание видео").resolve()
HOST = os.environ.get("FREELEARN_HOST", "127.0.0.1")
PORT = int(os.environ.get("FREELEARN_PORT", "8000"))
RETIRED_PAGES = {"/register", "/login", "/recover", "/progress", "/account", "/consent"}
RETIRED_API = {"/api/me", "/api/register", "/api/login", "/api/recover", "/api/logout", "/api/progress", "/api/account/export", "/api/account/delete"}
CSP = "default-src 'self'; media-src 'self' blob:; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'"


def _is_text_list(value):
    return isinstance(value, list) and all(isinstance(x, str) for x in value)


def _is_card_list(value):
    return isinstance(value, list) and all(isinstance(x, dict) and isinstance(x.get("title", ""), str) and isinstance(x.get("text", ""), str) for x in value)


def _is_link_list(value):
    return isinstance(value, list) and all(
        isinstance(x, dict) and isinstance(x.get("title"), str) and isinstance(x.get("url"), str)
        and re.match(r"^(https?://|/)", x["url"]) for x in value)


def directions():
    """Направления и их общий шаблон страницы — из directions.json."""
    entries = json.loads(DIRECTIONS_FILE.read_text(encoding="utf-8"))
    seen = set()
    for entry in entries:
        did = entry.get("id")
        if not isinstance(did, str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,31}", did) or did in seen:
            raise ValueError("В directions.json id должен быть уникальным латинским идентификатором")
        if any(not isinstance(entry.get(key), str) or not entry.get(key) for key in ("title", "short", "item", "description")):
            raise ValueError(f"В directions.json у направления {did} нет названия, подписи или описания")
        if not _is_text_list(entry.get("plural", [])) or len(entry.get("plural", [])) != 3:
            raise ValueError(f"В directions.json у направления {did} поле plural — три формы слова")
        if not _is_card_list(entry.get("how", [])) or not isinstance(entry.get("intro", ""), str) or not isinstance(entry.get("notice", ""), str):
            raise ValueError(f"В directions.json у направления {did} неверные поля intro, how или notice")
        guide = entry.get("guide", [])
        if not _is_card_list(guide) or any(not _is_text_list(g.get("materials", [])) for g in guide):
            raise ValueError(f"В directions.json у направления {did} неверное поле guide")
        if not isinstance(entry.get("labels", {}), dict):
            raise ValueError(f"В directions.json у направления {did} неверное поле labels")
        seen.add(did)
    return entries


def catalog():
    entries = json.loads(CATALOG.read_text(encoding="utf-8"))
    direction_ids = [d["id"] for d in directions()]
    seen = set()
    for entry in entries:
        mid = entry.get("id")
        required = ("title", "description", "exercise", "status")
        if not isinstance(mid, str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,63}", mid) or mid in seen:
            raise ValueError("В catalog.json id должен быть уникальным латинским идентификатором")
        if entry.get("direction") not in direction_ids or not isinstance(entry.get("order"), int):
            raise ValueError(f"В catalog.json у материала {mid} неверное направление или порядок")
        if any(not isinstance(entry.get(key), str) for key in required):
            raise ValueError(f"В catalog.json у материала {mid} отсутствует текстовое поле")
        if entry.get("status") not in {"демонстрационный", "готовится", "опубликован"}:
            raise ValueError(f"В catalog.json у материала {mid} неверный статус")
        if not isinstance(entry.get("video", ""), str) or not isinstance(entry.get("cover", ""), str):
            raise ValueError(f"В catalog.json у материала {mid} неверный путь к файлу")
        # Необязательные блоки шаблона: пустые или отсутствующие не показываются на странице.
        text_fields = ("when", "example", "fit", "note")
        if any(not isinstance(entry.get(key, ""), str) for key in text_fields) \
                or not _is_text_list(entry.get("steps", [])) or not _is_text_list(entry.get("scheme", [])) \
                or not _is_card_list(entry.get("examples", [])) or not _is_card_list(entry.get("benefits", [])) \
                or not _is_card_list(entry.get("mistakes", [])) or not _is_link_list(entry.get("links", [])):
            raise ValueError(f"В catalog.json у материала {mid} неверно заполнен необязательный блок")
        source = entry.get("source")
        if source is not None and not (_is_link_list([source])):
            raise ValueError(f"В catalog.json у материала {mid} поле source — объект с title и url")
        seen.add(mid)
    return sorted(entries, key=lambda item: (direction_ids.index(item["direction"]), item.get("order", 0), item["id"]))


def safe_material_path(relative: str):
    if not relative:
        return None
    candidate = (PUBLIC / relative).resolve()
    return candidate if candidate.is_relative_to(PUBLIC.resolve()) and candidate.is_file() else None


def exported_video_path(name: str):
    # Раздаются только явно перечисленные MP4, не вся папка экспортов.
    if not re.fullmatch(r"[a-z0-9-]+\.mp4", name) or not MEDIA_MANIFEST.is_file():
        return None
    record = json.loads(MEDIA_MANIFEST.read_text(encoding="utf-8")).get(name)
    if not isinstance(record, dict) or not isinstance(record.get("path"), str):
        return None
    candidate = (ROOT / record["path"]).resolve()
    return candidate if candidate.is_relative_to(EXPORTS) and candidate.suffix == ".mp4" and candidate.is_file() else None


class Handler(BaseHTTPRequestHandler):
    server_version = "FreelearnLocal/2.0"

    def log_message(self, fmt, *args):
        return

    def security_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Content-Security-Policy", CSP)
        # Удаляем лишь прежнюю cookie, если браузер ещё прислал её. Новых нет.
        if any(part.strip().startswith("freelearn_session=") for part in self.headers.get("Cookie", "").split(";")):
            self.send_header("Set-Cookie", "freelearn_session=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; HttpOnly; SameSite=Strict")

    def send_json(self, status, payload, head=False):
        raw = json.dumps(payload, ensure_ascii=False, allow_nan=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.security_headers()
        self.end_headers()
        if not head:
            self.wfile.write(raw)

    def serve_file(self, file, head=False):
        size = file.stat().st_size
        start, end, status = 0, size - 1, 200
        requested = self.headers.get("Range", "") if not head else ""
        if requested.startswith("bytes="):
            match = re.fullmatch(r"bytes=(\d*)-(\d*)", requested)
            try:
                if not match or not any(match.groups()):
                    raise ValueError
                left, right = match.groups()
                if left:
                    start = int(left)
                    end = min(int(right), size - 1) if right else size - 1
                else:
                    suffix = int(right)
                    if suffix <= 0:
                        raise ValueError
                    start = max(0, size - suffix)
                if start >= size or end < start:
                    raise ValueError
                status = 206
            except ValueError:
                self.send_response(416)
                self.send_header("Content-Range", f"bytes */{size}")
                self.send_header("Content-Length", "0")
                self.security_headers()
                self.end_headers()
                return
        length = max(0, end - start + 1)
        mime = "text/vtt; charset=utf-8" if file.suffix == ".vtt" else mimetypes.guess_type(str(file))[0] or "application/octet-stream"
        if file.suffix == ".txt":
            mime = "text/plain; charset=utf-8"
        self.send_response(status)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(length))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Cache-Control", "no-cache")
        if status == 206:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.security_headers()
        self.end_headers()
        if head:
            return
        # Большие видео не загружаются целиком в память; перемотка использует Range.
        try:
            with file.open("rb") as stream:
                stream.seek(start)
                remaining = length
                while remaining:
                    chunk = stream.read(min(65536, remaining))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            return

    def route(self, head=False):
        path = unquote(urlparse(self.path).path)
        if path in RETIRED_API:
            self.send_json(410, {"error": "Аккаунты отключены. Все материалы открыты без регистрации."}, head)
            return
        if path in RETIRED_PAGES or path == "/material/first-breath":
            self.send_response(302)
            self.send_header("Location", "/material/meditation-01" if path.endswith("first-breath") else "/")
            self.send_header("Content-Length", "0")
            self.security_headers()
            self.end_headers()
            return
        if path == "/api/catalog":
            self.send_json(200, {"directions": directions(), "materials": catalog()}, head)
            return
        if path.startswith("/api/material/"):
            item = next((x for x in catalog() if x["id"] == path.removeprefix("/api/material/")), None)
            self.send_json(200 if item else 404, {"material": item} if item else {"error": "Материал не найден"}, head)
            return
        if path.startswith("/api/"):
            self.send_json(404, {"error": "Адрес не найден"}, head)
            return
        prefix = "/media/meditations/"
        if path.startswith(prefix) and path.endswith(".mp4"):
            file = exported_video_path(path.removeprefix(prefix))
        else:
            relative = "index.html" if path == "/" or not Path(path).suffix else path.lstrip("/")
            file = safe_material_path(relative)
        if file:
            self.serve_file(file, head)
        else:
            self.send_error(404)

    def do_GET(self):
        try:
            self.route()
        except (ValueError, OSError):
            self.send_json(500, {"error": "Не удалось открыть материал"})

    def do_HEAD(self):
        self.route(head=True)

    def do_POST(self):
        self.close_connection = True
        path = urlparse(self.path).path
        self.send_json(410 if path in RETIRED_API else 405, {"error": "Аккаунты отключены. На сайте нет регистрации и сохранения данных аккаунтов."})


def main():
    directions()
    catalog()
    if MEDIA_MANIFEST.is_file():
        for name in json.loads(MEDIA_MANIFEST.read_text(encoding="utf-8")):
            if not exported_video_path(name):
                raise ValueError(f"Не найден разрешённый видеофайл: {name}")
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Freelearn работает: http://{HOST}:{PORT}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nFreelearn остановлен.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
