import os
import json
import re
import time
import uuid
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import xml.etree.ElementTree as ET

import requests

# Supabase client (optional - only needed for --publish)
try:
    from supabase import create_client, Client as SupabaseClient
    _SUPABASE_AVAILABLE = True
except ImportError:
    _SUPABASE_AVAILABLE = False
    SupabaseClient = None  # type: ignore

# Gemini client compatibility:
# - Preferred: google-genai (import path: from google import genai)
# - Fallback: google-generativeai (import path: import google.generativeai as genai)
try:
    from google import genai as _genai  # type: ignore
    from google.genai import types as _genai_types  # type: ignore
    _GEMINI_BACKEND = "google-genai"
except Exception:
    _genai = None
    _genai_types = None
    _GEMINI_BACKEND = "google-generativeai"
    import google.generativeai as _genai_fallback  # type: ignore


REPO_ROOT = Path(__file__).resolve().parents[1]  # for shared .env
PREDICTION_QUESTIONS_DIR = Path(__file__).resolve().parent
RUNS_DIR = PREDICTION_QUESTIONS_DIR / "runs"

def _load_env_file(path: str = ".env") -> None:
    """
    Minimal .env loader (no external deps).
    Supports:
      KEY=value
      KEY="value"
      export KEY=value
    """
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            if line.lower().startswith("export "):
                line = line[7:].strip()
            if "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


_load_env_file(str(REPO_ROOT / ".env"))

PERPLEXITY_API_KEY = (os.getenv("PERPLEXITY_API_KEY") or "").strip()
GEMINI_API_KEY = (os.getenv("GEMINI_API_KEY") or "").strip()

# Supabase config (optional - only needed for --publish)
# Uses same env vars as the backend
SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").strip()
SUPABASE_SERVICE_ROLE_KEY = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
SYSTEM_USER_ID = (os.getenv("SYSTEM_USER_ID") or "").strip()

if not PERPLEXITY_API_KEY:
    raise RuntimeError("Missing PERPLEXITY_API_KEY. Add it to your .env or environment variables.")
if not GEMINI_API_KEY:
    raise RuntimeError("Missing GEMINI_API_KEY. Add it to your .env or environment variables.")


def _get_supabase_client() -> "SupabaseClient":
    """Get Supabase client for publishing. Raises if not configured."""
    if not _SUPABASE_AVAILABLE:
        raise RuntimeError("Supabase not installed. Run: pip install supabase")
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def _get_predictions_community_id(supabase: "SupabaseClient") -> str:
    """Get the 'predictions' community ID from forum_communities."""
    result = supabase.table("forum_communities").select("id").eq("slug", "predictions").single().execute()
    if not result.data:
        raise RuntimeError("Predictions community not found. Run migration 113 first.")
    return result.data["id"]


def publish_predictions_to_forum(
    questions: list[dict[str, Any]],
    *,
    logger: logging.Logger | None = None,
) -> int:
    """
    Publish prediction questions to Supabase forum_posts table.
    Returns count of successfully inserted predictions.
    """
    if not SYSTEM_USER_ID:
        raise RuntimeError("Missing SYSTEM_USER_ID in .env. Set to an admin user UUID.")
    
    supabase = _get_supabase_client()
    community_id = _get_predictions_community_id(supabase)
    
    inserted = 0
    for q in questions:
        question_text = q.get("question_text", "").strip()
        if not question_text:
            continue
        
        # Parse resolution_date
        resolution_date = q.get("resolution_date", "").strip() or None
        
        # Map category to allowed values
        category = (q.get("category", "") or "").strip().lower()
        allowed_categories = {"funding", "expansion", "regulatory", "competition", "leadership", "ipo", "acquisition", "other"}
        if category not in allowed_categories:
            category = "other"
        
        post_data = {
            "community_id": community_id,
            "user_id": SYSTEM_USER_ID,
            "content": question_text,
            "body": f"**Headline:** {q.get('headline', 'N/A')}\n\n**Resolution Source:** {q.get('resolution_source', 'N/A')}",
            "post_type": "prediction",
            "headline": q.get("headline", ""),
            "company": q.get("company", ""),
            "resolution_date": resolution_date,
            "resolution_source": q.get("resolution_source", ""),
            "prediction_category": category,
            "initial_probability": float(q.get("initial_probability", 0.5)),
        }
        
        try:
            supabase.table("forum_posts").insert(post_data).execute()
            inserted += 1
            if logger:
                logger.info(f"[Publish] Inserted prediction | company={q.get('company', 'N/A')}")
        except Exception as e:
            if logger:
                logger.error(f"[Publish] Failed to insert | error={e}")
    
    return inserted


def _normalize_gemini_model(model: str) -> str:
    m = (model or "").strip()
    if not m:
        return "gemini-3.0-pro"
    return m


GEMINI_MODEL = _normalize_gemini_model(os.getenv("GEMINI_MODEL", "gemini-3.0-pro"))


def _setup_logger(log_path: Path) -> logging.Logger:
    logger = logging.getLogger(f"prediction_market.{log_path.parent.name}")
    logger.setLevel(logging.INFO)
    logger.propagate = False

    if not any(isinstance(h, logging.FileHandler) and getattr(h, "baseFilename", None) == str(log_path) for h in logger.handlers):
        fh = logging.FileHandler(log_path, encoding="utf-8")
        fmt = logging.Formatter("%(asctime)sZ | %(levelname)s | %(message)s")
        fh.setFormatter(fmt)
        logger.addHandler(fh)
    return logger


def _gemini_generate(prompt: str, *, temperature: float, response_mime_type: str | None = None) -> str:
    """
    Generate content using Gemini, supporting both google-genai and google-generativeai.
    Returns plain text.
    """
    if _GEMINI_BACKEND == "google-genai":
        client = _genai.Client(api_key=GEMINI_API_KEY)  # type: ignore[union-attr]
        config_kwargs: dict[str, Any] = {"temperature": temperature}
        if response_mime_type:
            config_kwargs["response_mime_type"] = response_mime_type
        config = _genai_types.GenerateContentConfig(**config_kwargs)  # type: ignore[union-attr]
        resp = client.models.generate_content(model=GEMINI_MODEL, contents=prompt, config=config)
        return resp.text

    _genai_fallback.configure(api_key=GEMINI_API_KEY)
    model = _genai_fallback.GenerativeModel(GEMINI_MODEL)
    resp = model.generate_content(prompt, generation_config={"temperature": temperature})
    return getattr(resp, "text", str(resp))


def _strip_xml_ns(tag: str) -> str:
    # "{namespace}tag" -> "tag"
    return tag.split("}", 1)[-1] if "}" in tag else tag


def _first_text(el: ET.Element | None) -> str:
    if el is None:
        return ""
    return (el.text or "").strip()


def _find_child_text(parent: ET.Element, tag_name: str) -> str:
    """
    Find first child whose local tag matches tag_name, ignoring namespaces.
    """
    for child in list(parent):
        if _strip_xml_ns(child.tag) == tag_name:
            return _first_text(child)
    return ""


@dataclass
class FeedItem:
    title: str
    link: str
    description: str
    source: str


def fetch_rss(url: str, *, timeout_s: float = 20.0, source_name: str = "") -> list[FeedItem]:
    """
    Minimal RSS/Atom parser with stdlib XML.
    Works for typical RSS2 (<channel><item>...) and Atom (<feed><entry>...).
    """
    r = requests.get(url, timeout=timeout_s, headers={"User-Agent": "prediction-market-pipeline/1.0"})
    r.raise_for_status()
    xml_text = r.text

    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        # Some feeds are malformed; fallback: try to strip leading junk.
        start = xml_text.find("<")
        if start >= 0:
            root = ET.fromstring(xml_text[start:])
        else:
            raise

    items: list[FeedItem] = []

    root_tag = _strip_xml_ns(root.tag).lower()
    # RSS2
    if root_tag == "rss" or root_tag == "rdf":
        channel = None
        for child in list(root):
            if _strip_xml_ns(child.tag).lower() == "channel":
                channel = child
                break
        if channel is None:
            channel = root
        for item in channel.iter():
            if _strip_xml_ns(item.tag).lower() != "item":
                continue
            title = _find_child_text(item, "title")
            link = _find_child_text(item, "link")
            desc = _find_child_text(item, "description") or _find_child_text(item, "content") or ""
            if title and link:
                items.append(FeedItem(title=title, link=link, description=desc, source=source_name or url))
        return items

    # Atom
    if root_tag == "feed":
        for entry in root.iter():
            if _strip_xml_ns(entry.tag).lower() != "entry":
                continue
            title = _find_child_text(entry, "title")
            link = ""
            summary = _find_child_text(entry, "summary") or _find_child_text(entry, "content") or ""
            # Atom link is often an attribute: <link href="..."/>
            for child in list(entry):
                if _strip_xml_ns(child.tag).lower() == "link":
                    href = (child.attrib.get("href") or "").strip()
                    rel = (child.attrib.get("rel") or "").strip()
                    if href and (not rel or rel == "alternate"):
                        link = href
                        break
            if title and link:
                items.append(FeedItem(title=title, link=link, description=summary, source=source_name or url))
        return items

    # Unknown root: try generic scan for <item>
    for item in root.iter():
        if _strip_xml_ns(item.tag).lower() != "item":
            continue
        title = _find_child_text(item, "title")
        link = _find_child_text(item, "link")
        desc = _find_child_text(item, "description") or ""
        if title and link:
            items.append(FeedItem(title=title, link=link, description=desc, source=source_name or url))
    return items


def _dedupe_items(items: list[FeedItem]) -> list[FeedItem]:
    seen: set[str] = set()
    out: list[FeedItem] = []
    for it in items:
        key = (it.link or it.title).strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(it)
    return out


def _parse_json_array_of_ints(text: str) -> list[int]:
    """
    Gemini might return:
      [1, 5, 8]
      ```json\n[1,2]\n```
      "Selection: [1, 2]"
    """
    raw = (text or "").strip()
    # strip fenced blocks
    if raw.startswith("```"):
        raw = raw.strip("`").strip()
        if "\n" in raw:
            raw = raw.split("\n", 1)[1].strip()

    m = re.search(r"\[[\d,\s\"']+\]", raw)
    if m:
        candidate = m.group(0).replace('"', "").replace("'", "")
        try:
            arr = json.loads(candidate)
            return [int(x) for x in arr if str(x).strip().isdigit()]
        except Exception:
            pass

    # fallback: loose numbers
    nums = re.findall(r"\b\d+\b", raw)
    return [int(n) for n in nums[:5]]


def select_headlines_with_gemini(headlines: str, *, temperature: float = 0.2) -> list[int]:
    system_prompt = """You are an expert Prediction Market Analyst.
Your job is to scan news headlines and identify "High-Stakes" opportunities for betting markets.

### SELECTION CRITERIA (Do not look for specific names, look for these SIGNS):

1. **SCALE & RECOGNITION (The "Who"):**
   - **MUST BE:** A company large enough that the public cares (Unicorns, Late-stage startups, or Public Tech Giants).
   - **IGNORE:** Early-seed startups, obscure B2B tools, or niche agencies.

2. **THE TRIGGER EVENT (The "What"):**
   - **Regulatory Wars:** Bans, investigations, tax notices, court cases.
   - **Financial Shocks:** IPO filings, massive funding (>$100M), bankruptcy warnings, layoffs.
   - **Market Conflict:** Hostile takeovers, CEO firings, direct "price wars" between rivals.

3. **BETTING POTENTIAL (The "Why"):**
   - Ask yourself: "Can I write a Yes/No question about this that resolves in 6 months?"
   - **REJECT:** "Company X announces new vision" (Too vague).
   - **REJECT:** "Company Y wins innovation award" (No conflict).
   - **KEEP:** "Company Z receives show-cause notice from Regulator" (Bet: Will they pay the fine?)

### YOUR TASK:
Review the headlines below. Select the Top 3-5 that have the highest potential for a controversial betting market.
Return ONLY a JSON array of the headline numbers.
Example: [1, 5, 8]"""

    user_prompt = f"Here are today's headlines:\n\n{headlines}\n\nSelect the best 3-5 headlines. Return JSON array only."
    prompt = system_prompt + "\n\n" + user_prompt
    text = _gemini_generate(prompt, temperature=temperature)
    return _parse_json_array_of_ints(text)


def perplexity_research_batch(selected_items: list[FeedItem], *, temperature: float = 0.5, max_tokens: int = 2000) -> str:
    headlines_list = " ||| ".join(
        [f"HEADLINE {i + 1}: {it.title} | URL: {it.link} | Snippet: {it.description}" for i, it in enumerate(selected_items)]
    )

    system_prompt = (
        "You are a research analyst. I will give you a list of headlines. "
        "For EACH headline, you must provide a distinct research report. "
        "CRITICAL OUTPUT RULES: 1. You MUST separate each report with the string ###NEXT_REPORT###. "
        "2. Do not mix information between companies. 3. If you cannot find info for a headline, write NO DATA. "
        "Structure for each: HEADLINE: [Title] CONFLICT: [Who fights who?] DATES: [Specific deadlines] RISK: [What could go wrong?] "
        "###NEXT_REPORT###"
    )

    user_prompt = (
        f"Research these {len(selected_items)} headlines for prediction market potential: {headlines_list} "
        "Provide a separate report for EACH headline using the format above."
    )

    url = "https://api.perplexity.ai/chat/completions"
    payload = {
        "model": "sonar",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    headers = {"Authorization": f"Bearer {PERPLEXITY_API_KEY}", "Content-Type": "application/json"}

    resp = requests.post(url, headers=headers, json=payload, timeout=(10, 180))
    if resp.status_code != 200:
        raise RuntimeError(f"Perplexity API error (status {resp.status_code}): {resp.text}")

    data = resp.json()
    return data["choices"][0]["message"]["content"]


def _extract_json_array(text: str) -> list[dict[str, Any]]:
    raw = (text or "").strip()
    if raw.startswith("```"):
        raw = raw.strip("`").strip()
        if "\n" in raw:
            raw = raw.split("\n", 1)[1].strip()

    # Prefer direct JSON parse
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [x for x in parsed if isinstance(x, dict)]
    except Exception:
        pass

    # Regex fallback: find a JSON array anywhere in the text
    m = re.search(r"\[\s*\{[\s\S]*\}\s*\]", raw)
    if not m:
        return []
    try:
        parsed = json.loads(m.group(0))
        if isinstance(parsed, list):
            return [x for x in parsed if isinstance(x, dict)]
    except Exception:
        return []
    return []


def generate_questions_with_gemini(selected_items: list[FeedItem], research: str, *, temperature: float = 0.7) -> list[dict[str, Any]]:
    headlines_with_research = "\n\n".join([f"HEADLINE {i + 1}: {it.title}\nURL: {it.link}" for i, it in enumerate(selected_items)])

    system_prompt = (
        "You are a prediction market question writer. Create exactly ONE sharp Yes/No question per headline.\n\n"
        "Rules:\n"
        "- Each question must be about A DIFFERENT company\n"
        "- Resolution date 30-180 days out\n"
        "- Verifiable via public sources (news, filings, stock price)\n"
        "- Genuinely uncertain (not obvious outcomes)\n\n"
        "Avoid:\n"
        "- Multiple questions about the same company\n"
        "- Vague questions about \"success\" or \"growth\"\n"
        "- Internal metrics we can't verify\n"
        "- Compound questions with multiple conditions"
    )

    user_prompt = (
        f"Create exactly {len(selected_items)} prediction questions - ONE per headline, each about a DIFFERENT company:\n\n"
        f"{headlines_with_research}\n\n"
        f"RESEARCH CONTEXT:\n{research}\n\n"
        f"CRITICAL: Output exactly {len(selected_items)} questions. No duplicate companies.\n\n"
        "Return JSON array:\n"
        "[\n"
        "  {\n"
        "    \"headline\": \"original headline\",\n"
        "    \"company\": \"company name\",\n"
        "    \"question\": \"Will X happen by Y date?\",\n"
        "    \"resolution_date\": \"YYYY-MM-DD\",\n"
        "    \"resolution_source\": \"how to verify\",\n"
        "    \"category\": \"funding|expansion|regulatory|competition|leadership\",\n"
        "    \"initial_probability\": 0.5\n"
        "  }\n"
        "]"
    )

    prompt = system_prompt + "\n\n" + user_prompt
    # Ask for JSON if supported; still parse defensively.
    text = _gemini_generate(prompt, temperature=temperature, response_mime_type="application/json")
    return _extract_json_array(text)


def run_pipeline(
    *,
    inc42_url: str,
    entrackr_url: str,
    max_items_per_feed: int,
    selection_min: int,
    selection_max: int,
    out_path: str | None,
    publish: bool = False,
) -> dict[str, Any]:
    run_id = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S") + "_" + uuid.uuid4().hex[:8]
    run_dir = RUNS_DIR / f"prediction_market_{run_id}"
    run_dir.mkdir(parents=True, exist_ok=True)
    logger = _setup_logger(run_dir / "run.log")
    logger.info(f"Run started | backend={_GEMINI_BACKEND} | gemini_model={GEMINI_MODEL}")

    def save(name: str, content: str) -> None:
        (run_dir / name).write_text(content or "", encoding="utf-8")

    # 1) RSS feeds
    inc42_items = fetch_rss(inc42_url, source_name="inc42")[:max_items_per_feed]
    entrackr_items = fetch_rss(entrackr_url, source_name="entrackr")[:max_items_per_feed]
    all_items = _dedupe_items(inc42_items + entrackr_items)
    logger.info(f"Fetched items | inc42={len(inc42_items)} | entrackr={len(entrackr_items)} | merged_deduped={len(all_items)}")

    if not all_items:
        raise RuntimeError("No RSS items found from either feed.")

    # 2) Build headlines block
    headlines = "\n".join([f"{i + 1}. {it.title}" for i, it in enumerate(all_items)])
    save("headlines.txt", headlines)

    # 3) Agent 0: select indices
    idxs = select_headlines_with_gemini(headlines, temperature=0.2)
    logger.info(f"Agent0 indices(raw)={idxs}")

    # normalize indices
    idxs = [i for i in idxs if 1 <= i <= len(all_items)]
    # keep order, unique
    seen_i: set[int] = set()
    idxs2: list[int] = []
    for i in idxs:
        if i not in seen_i:
            seen_i.add(i)
            idxs2.append(i)
    idxs = idxs2[:selection_max]

    if len(idxs) < selection_min:
        # fallback: take first N
        fallback_n = max(selection_min, 1)
        idxs = list(range(1, min(len(all_items), fallback_n) + 1))
        logger.info(f"Agent0 fallback indices={idxs}")

    selected_items = [all_items[i - 1] for i in idxs]
    save("selected_items.json", json.dumps([it.__dict__ for it in selected_items], indent=2))

    # 4) Agent 1: research (Perplexity)
    research = perplexity_research_batch(selected_items, temperature=0.5, max_tokens=2000)
    save("perplexity_research.md", research)

    # 5) Agent 2: create questions (Gemini)
    questions_raw = generate_questions_with_gemini(selected_items, research, temperature=0.7)
    save("questions_raw.json", json.dumps(questions_raw, indent=2))

    # 6) Normalize final output like n8n "Parse Output"
    now_iso = datetime.now(timezone.utc).isoformat()
    out_items: list[dict[str, Any]] = []
    for q in questions_raw:
        question_text = (q.get("question") or "").strip()
        if not question_text:
            continue
        out_items.append(
            {
                "question_text": question_text,
                "headline": (q.get("headline") or "").strip(),
                "company": (q.get("company") or "").strip(),
                "resolution_date": (q.get("resolution_date") or "").strip(),
                "resolution_source": (q.get("resolution_source") or "").strip(),
                "category": (q.get("category") or "").strip(),
                "initial_probability": float(q.get("initial_probability") or 0.5),
                "status": "active",
                "created_at": now_iso,
            }
        )

    if not out_items:
        raise RuntimeError("Gemini output could not be parsed into questions. See runs/.../questions_raw.json")

    result = {
        "run_id": run_dir.name,
        "selected_count": len(selected_items),
        "question_count": len(out_items),
        "questions": out_items,
    }

    # Write final output
    final_json = json.dumps(result, indent=2)
    save("final_questions.json", final_json)

    if out_path:
        p = Path(out_path)
        if not p.is_absolute():
            p = PREDICTION_QUESTIONS_DIR / p
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(final_json, encoding="utf-8")
        logger.info(f"Wrote output | path={out_path!r}")

    # Publish to Supabase forum if requested
    if publish:
        try:
            inserted_count = publish_predictions_to_forum(out_items, logger=logger)
            logger.info(f"[Publish] Published {inserted_count} predictions to forum")
            result["published_count"] = inserted_count
        except Exception as e:
            logger.error(f"[Publish] Failed | error={e}")
            result["publish_error"] = str(e)

    logger.info("Run completed")
    return result


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Prediction Market pipeline (RSS -> Gemini select -> Perplexity research -> Gemini questions)")
    parser.add_argument("--inc42", default="https://inc42.com/feed/", help="Inc42 RSS URL")
    parser.add_argument("--entrackr", default="https://entrackr.com/rss", help="Entrackr RSS URL")
    parser.add_argument("--max-items-per-feed", type=int, default=30, help="Limit items read per feed")
    parser.add_argument("--selection-min", type=int, default=3, help="Minimum headlines to select")
    parser.add_argument("--selection-max", type=int, default=5, help="Maximum headlines to select")
    parser.add_argument("--out", default="", help="Optional path to write final JSON output")
    parser.add_argument("--publish", action="store_true", help="Publish predictions to Supabase forum")
    args = parser.parse_args()

    out_path = args.out.strip() or None
    result = run_pipeline(
        inc42_url=args.inc42,
        entrackr_url=args.entrackr,
        max_items_per_feed=args.max_items_per_feed,
        selection_min=args.selection_min,
        selection_max=args.selection_max,
        out_path=out_path,
        publish=args.publish,
    )

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()


