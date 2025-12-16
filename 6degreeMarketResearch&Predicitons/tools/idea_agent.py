"""
Idea Agent (local, no pipeline):
- Fetch daily RSS from Inc42 + Entrackr
- Ask Gemini to output 1 Market Research topic + 1 Market Gap category as JSON
- Print JSON to stdout and save run artifacts under tools/idea_agent_runs/

Run:
  cd 6degreeMarketResearch&Predicitons
  python tools/idea_agent.py --limit 40

Env:
  GEMINI_API_KEY (required)
  GEMINI_MODEL (optional; default: models/gemini-3-pro-preview)
"""

from __future__ import annotations

import argparse
import datetime as _dt
import json
import os
import re
import textwrap
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests

# Gemini client compatibility:
# - Preferred: google-genai (import path: from google import genai)
# - Fallback: google-generativeai (import path: import google.generativeai as genai)
try:
    from google import genai as _genai  # type: ignore

    _GEMINI_BACKEND = "google-genai"
except Exception:
    _GEMINI_BACKEND = "google-generativeai"
    import google.generativeai as _genai_fallback  # type: ignore


INC42_RSS = "https://inc42.com/feed/"
ENTRACKR_RSS = "https://entrackr.com/rss"


def _load_dotenv_candidates() -> None:
    """
    Lightweight .env loader so you can run from this directory without extra deps.
    Looks for:
      - 6degreeMarketResearch&Predicitons/.env
      - 6degreeMarketResearch&Predicitons/tools/.env
    """
    here = Path(__file__).resolve()
    candidates = [here.parent / ".env", here.parent.parent / ".env"]
    for p in candidates:
        if not p.exists():
            continue
        try:
            for line in p.read_text(encoding="utf-8").splitlines():
                s = line.strip()
                if not s or s.startswith("#") or "=" not in s:
                    continue
                k, v = s.split("=", 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k and k not in os.environ:
                    os.environ[k] = v
        except Exception:
            # Best-effort; ignore malformed lines
            pass


def _make_run_id(prefix: str) -> str:
    ts = _dt.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    rand = os.urandom(3).hex()
    return f"{prefix}_{ts}_{rand}"


def _ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)


def _write_json(path: Path, data: Any) -> None:
    _ensure_dir(path.parent)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _write_text(path: Path, text: str) -> None:
    _ensure_dir(path.parent)
    path.write_text(text or "", encoding="utf-8")


def _strip_html(s: str) -> str:
    if not s:
        return ""
    # crude but good enough for RSS excerpts
    s = re.sub(r"<img[^>]*>", "", s, flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = (
        s.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&#8217;", "'")
        .replace("&#8220;", '"')
        .replace("&#8221;", '"')
        .replace("&#8230;", "...")
    )
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _parse_rss_items(xml_text: str, source: str) -> List[Dict[str, str]]:
    """
    Minimal RSS parser that extracts title/link/pubDate/description.
    Avoids extra dependencies (feedparser).
    """
    import xml.etree.ElementTree as ET

    # Normalize XML (some feeds include invalid control chars)
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", xml_text)
    root = ET.fromstring(cleaned)

    # RSS2: channel/item
    items = []
    for item in root.findall(".//item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub = (item.findtext("pubDate") or item.findtext("{http://purl.org/dc/elements/1.1/}date") or "").strip()
        desc = (item.findtext("description") or "").strip()
        # content:encoded (namespaced)
        content = ""
        for child in list(item):
            if child.tag.endswith("}encoded"):
                content = (child.text or "").strip()
                break
        excerpt = _strip_html(content or desc)[:320]

        if not title or not link:
            continue
        items.append(
            {
                "title": title,
                "url": link,
                "date": pub or "",
                "source": source,
                "excerpt": excerpt,
            }
        )
    return items


def _fetch_rss(url: str) -> str:
    r = requests.get(url, timeout=25, headers={"User-Agent": "6DegreesIdeaAgent/1.0"})
    r.raise_for_status()
    return r.text


def _safe_json_parse(text: str) -> Optional[Dict[str, Any]]:
    raw = (text or "").strip()
    if not raw:
        return None
    cleaned = raw
    cleaned = re.sub(r"^```json\s*", "", cleaned, flags=re.I).strip()
    cleaned = re.sub(r"^```\s*", "", cleaned).strip()
    cleaned = re.sub(r"\s*```$", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except Exception:
        m = re.search(r"\{[\s\S]*\}", cleaned)
        if not m:
            return None
        try:
            return json.loads(m.group(0))
        except Exception:
            return None


def _gemini_generate(prompt: str, model_name: str, temperature: float = 0.4) -> str:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("Missing GEMINI_API_KEY. Add it to your .env or environment variables.")

    if _GEMINI_BACKEND == "google-genai":
        client = _genai.Client(api_key=api_key)  # type: ignore[attr-defined]
        resp = client.models.generate_content(  # type: ignore[attr-defined]
            model=model_name,
            contents=prompt,
            config={"temperature": temperature},
        )
        return (resp.text or "").strip()

    # Fallback: google-generativeai
    _genai_fallback.configure(api_key=api_key)
    model = _genai_fallback.GenerativeModel(model_name)
    resp = model.generate_content(prompt, generation_config={"temperature": temperature})
    return (getattr(resp, "text", "") or "").strip()


def main() -> int:
    _load_dotenv_candidates()

    ap = argparse.ArgumentParser(description="Idea agent: pick MR + MG ideas from RSS using Gemini.")
    ap.add_argument("--limit", type=int, default=40, help="Number of RSS items to consider (10-60).")
    ap.add_argument("--model", type=str, default=os.getenv("GEMINI_MODEL") or "models/gemini-3-pro-preview")
    args = ap.parse_args()

    limit = max(10, min(60, int(args.limit or 40)))
    model_name = str(args.model).strip()

    run_id = _make_run_id("idea_agent")
    runs_dir = Path(__file__).resolve().parent / "idea_agent_runs" / run_id
    _ensure_dir(runs_dir)

    # Fetch + parse
    inc42_xml = _fetch_rss(INC42_RSS)
    entrackr_xml = _fetch_rss(ENTRACKR_RSS)
    _write_text(runs_dir / "inc42_rss.xml", inc42_xml[:200000])  # cap
    _write_text(runs_dir / "entrackr_rss.xml", entrackr_xml[:200000])

    items = _parse_rss_items(inc42_xml, "Inc42") + _parse_rss_items(entrackr_xml, "Entrackr")
    # newest-ish first: keep stable by list order (RSS is already recent-first usually)
    items = items[: max(60, limit)]
    items = items[:limit]

    _write_json(runs_dir / "news_items.json", items)

    prompt = textwrap.dedent(
        f"""
        You are an "Idea Selector" for a startup intelligence forum.

        Input: a list of news items (title, url, date, excerpt). Use ONLY these items as evidence.

        Task: pick EXACTLY:
        1) ONE Market Research topic: "where money is moving" (funding, new business models, distribution, infra, regulation).
        2) ONE Market Gap category: a mature category where new segments/gaps are emerging (still needs validation).

        Output JSON ONLY with this schema:
        {{
          "market_research": {{
            "topic": "string",
            "why_now": ["bullet", "bullet", "bullet"],
            "signals": [{{"title":"", "url":"", "source":"Inc42|Entrackr", "date":""}}],
            "keywords": ["..."]
          }},
          "market_gaps": {{
            "category": "string",
            "hypothesis": "string",
            "segments": ["..."],
            "why_now": ["..."],
            "signals": [{{"title":"", "url":"", "source":"Inc42|Entrackr", "date":""}}],
            "keywords": ["..."]
          }}
        }}

        Rules:
        - Signals MUST reference URLs from the provided input. Do not invent links.
        - Prefer India-relevant topics.
        - Avoid generic topics like "AI is booming"; make it specific (industry + wedge + why now).
        - Market gaps should be phrased as: "<category> in <market> — <new segment or unmet need>".

        News Items (JSON):
        {json.dumps(items, ensure_ascii=False, indent=2)}
        """
    ).strip()

    _write_text(runs_dir / "prompt.txt", prompt)

    raw = _gemini_generate(prompt, model_name=model_name, temperature=0.4)
    _write_text(runs_dir / "gemini_raw.txt", raw)

    ideas = _safe_json_parse(raw)
    if not ideas:
        print(json.dumps({"ok": False, "run_id": run_id, "error": "No JSON from Gemini", "raw": raw[:2000]}, indent=2))
        return 2

    out = {"ok": True, "run_id": run_id, "input_count": len(items), "ideas": ideas}
    _write_json(runs_dir / "ideas.json", out)
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


