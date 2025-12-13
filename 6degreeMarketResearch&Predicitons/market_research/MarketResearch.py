import os
import requests
import json
import time
import logging
import uuid
import hashlib
from datetime import datetime, timezone
from pathlib import Path
import re
import argparse

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

# --- CONFIGURATION ---
REPO_ROOT = Path(__file__).resolve().parents[1]  # for shared .env
MARKET_RESEARCH_DIR = Path(__file__).resolve().parent  # for MR-owned data dirs
RUNS_DIR = MARKET_RESEARCH_DIR / "runs"
OUTPUT_DIR = MARKET_RESEARCH_DIR / "outputs"
DEFAULT_CACHE_DIR = MARKET_RESEARCH_DIR / "cache" / "perplexity"

def _load_env_file(path: str = ".env") -> None:
    """
    Minimal .env loader (no external deps).

    Supports lines like:
      KEY=value
      KEY="value"
      export KEY=value
    Ignores blank lines and comments (# ...).
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

PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not PERPLEXITY_API_KEY:
    raise RuntimeError("Missing PERPLEXITY_API_KEY. Add it to your .env or environment variables.")
if not GEMINI_API_KEY:
    raise RuntimeError("Missing GEMINI_API_KEY. Add it to your .env or environment variables.")

# Supabase config (optional - only needed for --publish)
# Uses same env vars as the backend
SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").strip()
SUPABASE_SERVICE_ROLE_KEY = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
SYSTEM_USER_ID = (os.getenv("SYSTEM_USER_ID") or "").strip()


def _get_supabase_client() -> "SupabaseClient":
    """Get Supabase client for publishing. Raises if not configured."""
    if not _SUPABASE_AVAILABLE:
        raise RuntimeError("Supabase not installed. Run: pip install supabase")
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def _get_research_community_id(supabase: "SupabaseClient") -> str:
    """Get the 'market-research' community ID from forum_communities."""
    result = supabase.table("forum_communities").select("id").eq("slug", "market-research").single().execute()
    if not result.data:
        raise RuntimeError("Market Research community not found. Run migration 113 first.")
    return result.data["id"]


def publish_research_to_forum(
    *,
    topic: str,
    report_markdown: str,
    logger: logging.Logger | None = None,
) -> str:
    """
    Publish research report to Supabase forum_posts table.
    Returns the created post ID.
    """
    if not SYSTEM_USER_ID:
        raise RuntimeError("Missing SYSTEM_USER_ID in .env. Set to an admin user UUID.")
    
    supabase = _get_supabase_client()
    community_id = _get_research_community_id(supabase)
    
    # Extract TL;DR as content preview (first 500 chars or first section)
    content_preview = topic.strip()[:200]
    if "TL;DR" in report_markdown or "## TL;DR" in report_markdown:
        # Try to extract TL;DR section
        match = re.search(r"(?:##?\s*)?TL;DR[^\n]*\n([\s\S]*?)(?=\n##|\Z)", report_markdown, re.IGNORECASE)
        if match:
            content_preview = match.group(1).strip()[:500]
    
    post_data = {
        "community_id": community_id,
        "user_id": SYSTEM_USER_ID,
        "content": content_preview,
        "body": report_markdown,
        "post_type": "research_report",
    }
    
    result = supabase.table("forum_posts").insert(post_data).execute()
    post_id = result.data[0]["id"] if result.data else None
    
    if logger:
        logger.info(f"[Publish] Published research report | post_id={post_id}")
    
    return post_id


def _normalize_gemini_model(model: str) -> str:
    # Allow either "gemini-..." or full resource name "models/gemini-..."
    m = (model or "").strip()
    if not m:
        return "gemini-3.0-pro"
    return m

GEMINI_MODEL = _normalize_gemini_model(os.getenv("GEMINI_MODEL", "gemini-3.0-pro"))

# Perplexity tuning knobs (for reliability on slow "deep research" responses)
PERPLEXITY_CONNECT_TIMEOUT_S = float(os.getenv("PERPLEXITY_CONNECT_TIMEOUT_S", "10"))
PERPLEXITY_READ_TIMEOUT_S = float(os.getenv("PERPLEXITY_READ_TIMEOUT_S", "180"))
PERPLEXITY_MAX_RETRIES = int(os.getenv("PERPLEXITY_MAX_RETRIES", "3"))
PERPLEXITY_RETRY_BACKOFF_S = float(os.getenv("PERPLEXITY_RETRY_BACKOFF_S", "2.0"))
PERPLEXITY_USE_CACHE = os.getenv("PERPLEXITY_USE_CACHE", "1").strip() not in ("0", "false", "False", "no", "NO")
PERPLEXITY_CACHE_DIR = Path(os.getenv("PERPLEXITY_CACHE_DIR", str(DEFAULT_CACHE_DIR)))
SEED_CACHE_FROM_RUN_ID = (os.getenv("SEED_CACHE_FROM_RUN_ID") or "").strip()

# Output + report controls (intentionally simple: only WORD_LIMIT is user-tunable)
WRITE_OUTPUT_COPY = True

def _parse_int_env(name: str, default: int) -> int:
    raw = (os.getenv(name) or "").strip()
    if raw == "":
        return default
    try:
        return int(raw)
    except ValueError:
        return default

# Single knob:
# - WORD_LIMIT=0 (or empty) => no enforced length (best-quality, uses all evidence)
# - WORD_LIMIT=1000 => aim for ~1000 words
WORD_LIMIT = _parse_int_env("WORD_LIMIT", 0)
ENFORCE_WORD_LIMIT = WORD_LIMIT > 0
REPORT_TARGET_WORDS = WORD_LIMIT if WORD_LIMIT > 0 else 1000
REPORT_WORD_TOLERANCE = 200

# Optional Notion export (Path 1: real Notion UI)
# Keep .env simple: set these as environment variables only when you want to publish.
NOTION_TOKEN = (os.getenv("NOTION_TOKEN") or "").strip()
NOTION_PARENT_PAGE_ID = (os.getenv("NOTION_PARENT_PAGE_ID") or "").strip()
NOTION_VERSION = (os.getenv("NOTION_VERSION") or "2022-06-28").strip()

def _gemini_generate(prompt: str, *, temperature: float, response_mime_type: str | None = None) -> str:
    """
    Generate content using Gemini, supporting both google-genai and google-generativeai.
    Returns plain text.
    """
    if _GEMINI_BACKEND == "google-genai":
        client = _genai.Client(api_key=GEMINI_API_KEY)  # type: ignore[union-attr]
        config_kwargs = {"temperature": temperature}
        if response_mime_type:
            config_kwargs["response_mime_type"] = response_mime_type
        config = _genai_types.GenerateContentConfig(**config_kwargs)  # type: ignore[union-attr]
        resp = client.models.generate_content(model=GEMINI_MODEL, contents=prompt, config=config)
        return resp.text

    # Fallback backend (google-generativeai)
    _genai_fallback.configure(api_key=GEMINI_API_KEY)
    model = _genai_fallback.GenerativeModel(GEMINI_MODEL)
    # Keep it dependency-light: generation_config as dict is supported across versions.
    resp = model.generate_content(prompt, generation_config={"temperature": temperature})
    return getattr(resp, "text", str(resp))

class ResearchAgent:
    def __init__(self):
        self.context = [] # Memory of what we've found
        self.max_loops = 3 # Don't get stuck in infinite loops
        self.target_report_words = REPORT_TARGET_WORDS
        self.report_word_tolerance = REPORT_WORD_TOLERANCE  # target +/- tolerance
        self.sources: set[str] = set()

        # Per-run artifacts (so you can audit what happened later)
        self.run_id = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S") + "_" + uuid.uuid4().hex[:8]
        self.run_dir = RUNS_DIR / self.run_id
        self.run_dir.mkdir(parents=True, exist_ok=True)
        self.logger = self._setup_logger(self.run_dir / "run.log")
        self.logger.info(f"Gemini backend selected | backend={_GEMINI_BACKEND} | model={GEMINI_MODEL}")
        self.logger.info(
            "Perplexity config | connect_timeout_s=%s | read_timeout_s=%s | max_retries=%s | backoff_s=%s",
            PERPLEXITY_CONNECT_TIMEOUT_S,
            PERPLEXITY_READ_TIMEOUT_S,
            PERPLEXITY_MAX_RETRIES,
            PERPLEXITY_RETRY_BACKOFF_S,
        )
        self.logger.info(
            "Report config | target_words=%s | tolerance=%s | enforce_word_limit=%s | output_dir=%s | write_output_copy=%s",
            self.target_report_words,
            self.report_word_tolerance,
            ENFORCE_WORD_LIMIT,
            str(OUTPUT_DIR),
            WRITE_OUTPUT_COPY,
        )

    @staticmethod
    def _setup_logger(log_path: Path) -> logging.Logger:
        logger = logging.getLogger(f"research_agent.{log_path.parent.name}")
        logger.setLevel(logging.INFO)
        logger.propagate = False

        # Avoid duplicate handlers if re-instantiated in same interpreter.
        if not any(isinstance(h, logging.FileHandler) and getattr(h, "baseFilename", None) == str(log_path) for h in logger.handlers):
            fh = logging.FileHandler(log_path, encoding="utf-8")
            fmt = logging.Formatter("%(asctime)sZ | %(levelname)s | %(message)s")
            fh.setFormatter(fmt)
            logger.addHandler(fh)
        return logger

    def _save_text(self, filename: str, content: str) -> None:
        path = self.run_dir / filename
        path.write_text(content or "", encoding="utf-8")

    def _save_sources(self) -> None:
        urls = sorted(self.sources)
        (self.run_dir / "sources_urls.json").write_text(json.dumps(urls, indent=2), encoding="utf-8")
        (self.run_dir / "sources_urls.md").write_text("\n".join([f"- {u}" for u in urls]), encoding="utf-8")

    # -----------------------
    # Notion export utilities
    # -----------------------
    @staticmethod
    def _chunk_text(text: str, max_chars: int = 1800) -> list[str]:
        # Notion rich_text has practical per-item limits; keep chunks conservative.
        t = text or ""
        chunks: list[str] = []
        while t:
            chunks.append(t[:max_chars])
            t = t[max_chars:]
        return chunks or [""]

    @staticmethod
    def _rt(text: str) -> list[dict]:
        # Notion rich_text array
        return [{"type": "text", "text": {"content": chunk}} for chunk in ResearchAgent._chunk_text(text)]

    def _md_to_notion_blocks(self, markdown: str) -> list[dict]:
        """
        Minimal Markdown -> Notion blocks converter.
        Supports headings, paragraphs, bullet/numbered lists, dividers, and code fences.
        """
        lines = (markdown or "").splitlines()
        blocks: list[dict] = []
        para_buf: list[str] = []
        in_code = False
        code_lang = ""
        code_buf: list[str] = []

        def flush_paragraph() -> None:
            nonlocal para_buf
            text = "\n".join([l.rstrip() for l in para_buf]).strip()
            para_buf = []
            if not text:
                return
            blocks.append({"object": "block", "type": "paragraph", "paragraph": {"rich_text": self._rt(text)}})

        for raw in lines:
            line = raw.rstrip("\n")

            # Code fences
            if line.strip().startswith("```"):
                if not in_code:
                    flush_paragraph()
                    in_code = True
                    code_lang = line.strip().lstrip("`").strip() or "plain"
                    code_buf = []
                else:
                    in_code = False
                    code_text = "\n".join(code_buf).rstrip()
                    blocks.append(
                        {
                            "object": "block",
                            "type": "code",
                            "code": {
                                "rich_text": self._rt(code_text),
                                "language": code_lang if code_lang else "plain",
                            },
                        }
                    )
                    code_lang = ""
                    code_buf = []
                continue

            if in_code:
                code_buf.append(line)
                continue

            s = line.strip()
            if s == "---":
                flush_paragraph()
                blocks.append({"object": "block", "type": "divider", "divider": {}})
                continue

            if s.startswith("### "):
                flush_paragraph()
                blocks.append({"object": "block", "type": "heading_3", "heading_3": {"rich_text": self._rt(s[4:])}})
                continue
            if s.startswith("## "):
                flush_paragraph()
                blocks.append({"object": "block", "type": "heading_2", "heading_2": {"rich_text": self._rt(s[3:])}})
                continue
            if s.startswith("# "):
                flush_paragraph()
                blocks.append({"object": "block", "type": "heading_1", "heading_1": {"rich_text": self._rt(s[2:])}})
                continue

            # Bullets
            if s.startswith("- ") or s.startswith("* "):
                flush_paragraph()
                item = s[2:].strip()
                blocks.append(
                    {"object": "block", "type": "bulleted_list_item", "bulleted_list_item": {"rich_text": self._rt(item)}}
                )
                continue

            # Numbered lists (very simple)
            m = re.match(r"^(\d+)\.\s+(.*)$", s)
            if m:
                flush_paragraph()
                blocks.append(
                    {
                        "object": "block",
                        "type": "numbered_list_item",
                        "numbered_list_item": {"rich_text": self._rt(m.group(2).strip())},
                    }
                )
                continue

            # Blank line => paragraph break
            if s == "":
                flush_paragraph()
                continue

            para_buf.append(line)

        flush_paragraph()
        return blocks

    def _notion_headers(self) -> dict:
        return {
            "Authorization": f"Bearer {NOTION_TOKEN}",
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json",
        }

    def _notion_post(self, url: str, payload: dict) -> dict:
        # Basic retry for rate limits / transient server errors
        for attempt in range(1, 5):
            resp = requests.post(url, headers=self._notion_headers(), json=payload, timeout=(10, 60))
            if resp.status_code in (429, 500, 502, 503, 504) and attempt < 4:
                backoff = 1.5 ** attempt
                self.logger.info(f"[Notion] Retry | status={resp.status_code} | backoff_s={backoff}")
                time.sleep(backoff)
                continue
            if 200 <= resp.status_code < 300:
                return resp.json()
            raise RuntimeError(f"Notion API error (status {resp.status_code}): {resp.text}")
        raise RuntimeError("Notion API failed after retries")

    def export_report_to_notion(self, *, title: str, report_markdown: str) -> dict | None:
        """
        Creates a Notion page under NOTION_PARENT_PAGE_ID and uploads the report.
        Returns the Notion page object on success, else None if Notion is not configured.
        """
        if not NOTION_TOKEN or not NOTION_PARENT_PAGE_ID:
            self.logger.info("[Notion] Skipping export (missing NOTION_TOKEN or NOTION_PARENT_PAGE_ID)")
            return None

        blocks = self._md_to_notion_blocks(report_markdown)
        # Notion API limit: append in batches of up to 100 blocks.
        first_batch = blocks[:100]
        rest = blocks[100:]

        create_payload = {
            "parent": {"page_id": NOTION_PARENT_PAGE_ID},
            "properties": {"title": {"title": [{"type": "text", "text": {"content": title}}]}},
            "children": first_batch,
        }
        page = self._notion_post("https://api.notion.com/v1/pages", create_payload)
        page_id = page.get("id")
        self._save_text("notion_page.json", json.dumps(page, indent=2))
        self.logger.info(f"[Notion] Page created | page_id={page_id}")

        # Append remaining blocks
        append_url = f"https://api.notion.com/v1/blocks/{page_id}/children"
        i = 0
        while rest:
            batch = rest[:100]
            rest = rest[100:]
            i += 1
            self._notion_post(append_url, {"children": batch})
            self.logger.info(f"[Notion] Appended batch | idx={i} | blocks={len(batch)}")

        return page

    @staticmethod
    def _safe_slug(text: str, *, max_len: int = 80) -> str:
        # Take first non-empty line as "title" and sanitize for Windows filenames.
        raw = (text or "").strip().splitlines()
        title = next((ln.strip() for ln in raw if ln.strip()), "report")
        # Replace forbidden filename chars: <>:"/\|?* and control chars
        title = re.sub(r'[<>:"/\\\\|?*\\x00-\\x1F]', " ", title)
        title = re.sub(r"\\s+", "_", title).strip("_")
        title = title[:max_len].strip("_")
        return title or "report"

    def _cache_key(self, *, model: str, query: str) -> str:
        h = hashlib.sha256(f"{model}\n{query}".encode("utf-8")).hexdigest()
        return h

    def seed_perplexity_cache_from_run(self, run_id: str) -> bool:
        """
        Seed the Perplexity query-cache from an existing run folder so reruns don't waste calls.
        Returns True if at least one entry was seeded.
        """
        run_dir = RUNS_DIR / run_id
        if not run_dir.exists():
            self.logger.info(f"[Cache] Seed skipped: run dir not found | run_id={run_id!r}")
            return False

        topic_path = run_dir / "topic.txt"
        content_path = run_dir / "perplexity_01_content.md"
        raw_path = run_dir / "perplexity_01_attempt_01_raw.json"
        if not topic_path.exists() or not content_path.exists():
            self.logger.info(f"[Cache] Seed skipped: missing files | run_id={run_id!r}")
            return False

        topic = topic_path.read_text(encoding="utf-8")
        query = f"Comprehensive deep dive data on {topic}. Market size, players, risks."
        cache_key = self._cache_key(model="sonar-deep-research", query=query)

        cache_dir = PERPLEXITY_CACHE_DIR
        cache_dir.mkdir(parents=True, exist_ok=True)
        cache_content_path = cache_dir / f"{cache_key}.content.md"
        cache_raw_path = cache_dir / f"{cache_key}.raw.json"
        cache_query_path = cache_dir / f"{cache_key}.query.txt"

        if cache_content_path.exists():
            self.logger.info(f"[Cache] Seed not needed (already cached) | key={cache_key[:12]}")
            return True

        cache_content_path.write_text(content_path.read_text(encoding="utf-8"), encoding="utf-8")
        cache_query_path.write_text(query, encoding="utf-8")
        if raw_path.exists():
            cache_raw_path.write_text(raw_path.read_text(encoding="utf-8"), encoding="utf-8")

        self.logger.info(f"[Cache] Seeded from run | run_id={run_id!r} | key={cache_key[:12]}")
        return True

    @staticmethod
    def _safe_json_loads(text: str) -> dict:
        # Gemini sometimes wraps JSON in ``` fences; strip those defensively.
        raw = (text or "").strip()
        if raw.startswith("```"):
            raw = raw.strip("`").strip()
            # If it starts with a language tag like json\n{...}
            if "\n" in raw:
                raw = raw.split("\n", 1)[1].strip()
        return json.loads(raw)

    def search_perplexity(self, query):
        """The Hunter: Uses Perplexity's Deep Research model to find raw facts."""
        self.logger.info(f"[Hunter] Searching | query={query!r}")

        # Query-based cache to avoid wasting expensive deep-research calls on reruns.
        cache_key = self._cache_key(model="sonar-deep-research", query=query)
        cache_dir = PERPLEXITY_CACHE_DIR
        cache_dir.mkdir(parents=True, exist_ok=True)
        cache_content_path = cache_dir / f"{cache_key}.content.md"
        cache_raw_path = cache_dir / f"{cache_key}.raw.json"
        cache_query_path = cache_dir / f"{cache_key}.query.txt"
        if PERPLEXITY_USE_CACHE and cache_content_path.exists():
            cached = cache_content_path.read_text(encoding="utf-8")
            self.logger.info(f"[Hunter] Cache hit | key={cache_key[:12]} | path={str(cache_content_path)!r}")
            # Also mirror into run artifacts for easy inspection.
            idx = len(self.context) + 1
            self._save_text(f"perplexity_{idx:02d}_content.md", cached)
            if cache_raw_path.exists():
                raw_text = cache_raw_path.read_text(encoding="utf-8")
                self._save_text(f"perplexity_{idx:02d}_raw.json", raw_text)
                try:
                    raw_json = json.loads(raw_text)
                    for u in raw_json.get("citations", []) or []:
                        if isinstance(u, str) and u.startswith("http"):
                            self.sources.add(u)
                    self._save_sources()
                except Exception as e:
                    self.logger.exception(f"[Hunter] Cache citations parse failed | {e}")
            return cached
        
        url = "https://api.perplexity.ai/chat/completions"
        payload = {
            "model": "sonar-deep-research", # The best retrieval model available
            "messages": [
                {
                    "role": "system",
                    "content": "You are a dense data retrieval engine. Output ONLY detailed facts, statistics, and specific numbers. Cite every single claim. Do not summarize."
                },
                {
                    "role": "user",
                    "content": query
                }
            ]
        }
        headers = {
            "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
            "Content-Type": "application/json"
        }
        
        attempt = 0
        last_err: Exception | None = None
        # Use a stable index for filenames even across retries
        idx = len(self.context) + 1

        while attempt <= PERPLEXITY_MAX_RETRIES:
            attempt += 1
            t0 = time.time()
            try:
                self.logger.info(f"[Hunter] Perplexity request | attempt={attempt}/{PERPLEXITY_MAX_RETRIES + 1}")
                response = requests.post(
                    url,
                    json=payload,
                    headers=headers,
                    timeout=(PERPLEXITY_CONNECT_TIMEOUT_S, PERPLEXITY_READ_TIMEOUT_S),
                )
                elapsed_ms = int((time.time() - t0) * 1000)
                self.logger.info(f"[Hunter] Perplexity response | status={response.status_code} | ms={elapsed_ms}")
                self._save_text(f"perplexity_{idx:02d}_attempt_{attempt:02d}_raw.json", response.text)

                if response.status_code == 200:
                    data = response.json()
                    content = data["choices"][0]["message"]["content"]
                    self._save_text(f"perplexity_{idx:02d}_content.md", content)

                    # Capture canonical URLs from Perplexity response so final report can list sources.
                    try:
                        for u in data.get("citations", []) or []:
                            if isinstance(u, str) and u.startswith("http"):
                                self.sources.add(u)
                        self._save_sources()
                    except Exception as e:
                        self.logger.exception(f"[Hunter] Citations capture failed | {e}")

                    # Write-through cache so future reruns reuse this output.
                    try:
                        cache_content_path.write_text(content or "", encoding="utf-8")
                        cache_raw_path.write_text(response.text or "", encoding="utf-8")
                        cache_query_path.write_text(query or "", encoding="utf-8")
                        self.logger.info(f"[Hunter] Cache write | key={cache_key[:12]} | dir={str(cache_dir)!r}")
                    except Exception as e:
                        self.logger.exception(f"[Hunter] Cache write failed | {e}")
                    return content

                # Retry on server/rate errors; fail fast on others.
                if response.status_code in (408, 429, 500, 502, 503, 504) and attempt <= PERPLEXITY_MAX_RETRIES:
                    backoff = PERPLEXITY_RETRY_BACKOFF_S * (2 ** (attempt - 1))
                    self.logger.info(f"[Hunter] Retrying after HTTP {response.status_code} | backoff_s={backoff}")
                    time.sleep(backoff)
                    continue

                raise RuntimeError(f"Perplexity API Error (status {response.status_code}): {response.text}")

            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError, requests.exceptions.RequestException) as e:
                last_err = e
                self.logger.exception(f"[Hunter] Request error | attempt={attempt} | {e}")
                self._save_text(f"perplexity_{idx:02d}_attempt_{attempt:02d}_error.txt", repr(e))
                if attempt <= PERPLEXITY_MAX_RETRIES:
                    backoff = PERPLEXITY_RETRY_BACKOFF_S * (2 ** (attempt - 1))
                    self.logger.info(f"[Hunter] Retrying after request error | backoff_s={backoff}")
                    time.sleep(backoff)
                    continue
                break
            except Exception as e:
                # Non-retryable (e.g., JSON shape issues) — log and re-raise.
                self.logger.exception(f"[Hunter] ERROR | {e}")
                self._save_text(f"perplexity_{idx:02d}_attempt_{attempt:02d}_fatal.txt", repr(e))
                raise

        raise RuntimeError(f"Perplexity failed after retries. Last error: {last_err!r}")

    def critique_research(self, topic, current_data):
        """The Critic: Reviews the data for gaps, bias, or staleness."""
        self.logger.info("[Critic] Reviewing findings")
        
        prompt = f"""
        You are a ruthless Senior Editor. Review the research data below for the topic: '{topic}'.
        
        Current Data:
        {current_data}
        
        Determine if this is sufficient to write a World-Class Report.
        CRITERIA:
        1. Are there specific hard numbers (TAM, CAGR, Revenue)?
        2. Are the sources recent (late 2024/2025)?
        3. are there counter-arguments/risks?
        
        Response Format (JSON only):
        {{
            "status": "APPROVED" or "REJECTED",
            "reasoning": "Brief explanation",
            "missing_information": ["specific question 1", "specific question 2"]
        }}
        """
        
        self._save_text("critic_prompt.txt", prompt)
        response_text = _gemini_generate(prompt, temperature=0.2, response_mime_type="application/json")
        self._save_text("critic_response.json", response_text)
        try:
            return self._safe_json_loads(response_text)
        except Exception as e:
            self.logger.exception(f"[Critic] ERROR parsing JSON | {e}")
            raise

    def synthesize_report(self, topic, full_data, critic_notes):
        """The Writer: Compiles the final report."""
        self.logger.info("[Writer] Synthesizing final report")

        target_min = max(300, self.target_report_words - self.report_word_tolerance)
        target_max = self.target_report_words + self.report_word_tolerance
        
        length_rule = ""
        if ENFORCE_WORD_LIMIT:
            length_rule = f"\n        - Word count: between {target_min} and {target_max} words (strict)"

        prompt = f"""
        Write a market research deep dive on: {topic}

        STYLE (match trends.vc vibe):
        - Strong, editorial, story-led narrative (not academic, not generic)
        - Dense with specific numbers, dates, and named players
        - Crisp paragraphs; avoid fluff; avoid "As an AI..." disclaimers
        - Confident but honest about uncertainty; call out assumptions

        HARD CONSTRAINTS:
        {length_rule}
        - Every key claim that uses numbers or “market says” MUST have a citation right next to it.
        - Use the citations already present in the Research Data; do not invent sources.
        - If a needed citation is missing, explicitly label it as (needs source) instead of making it up.
        - Output: Markdown only
        - In the final "Sources" section, include the FULL URLs from the Source URLs list provided below (do not use [1]/[38] style only).

        REQUIRED STRUCTURE (use these headers):
        1) TL;DR (5 bullets)
        2) The big shift (what changed + why now)
        3) Market size & growth (TAM/SAM/SOM where possible, CAGR, pricing)
        4) Who’s winning (market map: incumbents vs startups; what they sell; differentiation)
        5) Buyer behavior & budgets (who pays, procurement, sales cycle)
        6) What’s actually working (tactics, workflows, case examples with metrics)
        7) Risks & counter-arguments (regulatory, technical, economic, adoption)
        8) 12–24 month outlook (2–4 falsifiable predictions)
        9) Sources (bulleted list of URLs/attributions found in the Research Data)
        
        Research Data:
        {full_data}

        Source URLs (canonical list; include these as full URLs in the Sources section):
        {"".join([f"- {u}\n" for u in sorted(self.sources)]) if self.sources else "(none provided)"}
        
        Critic's Notes (Address these risks):
        {critic_notes}
        """
        
        self._save_text("writer_prompt.txt", prompt)
        response_text = _gemini_generate(prompt, temperature=0.7)
        self._save_text("writer_draft.md", response_text)
        return response_text

    @staticmethod
    def _word_count(text: str) -> int:
        # Simple word count heuristic: split on whitespace.
        return len([w for w in text.split() if w.strip()])

    def _revise_report_to_length(self, topic: str, report_markdown: str) -> str:
        """Asks the Writer to revise only length/clarity while preserving citations and structure."""
        target_min = max(300, self.target_report_words - self.report_word_tolerance)
        target_max = self.target_report_words + self.report_word_tolerance
        wc = self._word_count(report_markdown)
        if wc > target_max:
            action = "TRIM"
            action_rules = "- Trim for length. Remove redundancy first; do NOT add new material."
        elif wc < target_min:
            action = "EXPAND"
            action_rules = "- Expand slightly to meet length by adding more specificity ONLY when already supported by citations present in the text."
        else:
            action = "POLISH"
            action_rules = "- Keep length stable; improve clarity without changing meaning."

        prompt = f"""
        Revise the report below to be between {target_min} and {target_max} words (strict).
        Current word count: {wc}. Action: {action}.

        RULES:
        - Preserve the required section headers and overall structure.
        - Preserve all citations and do NOT invent new sources.
        {action_rules}
        - Output Markdown only.

        Topic: {topic}

        Report to revise:
        {report_markdown}
        """

        self._save_text("writer_revision_prompt.txt", prompt)
        response_text = _gemini_generate(prompt, temperature=0.4)
        self._save_text("writer_revised.md", response_text)
        return response_text

    def run(self, topic, *, publish: bool = False):
        self.logger.info(f"Run started | run_id={self.run_id} | topic={topic!r} | publish={publish}")
        self._save_text("topic.txt", str(topic))

        if SEED_CACHE_FROM_RUN_ID:
            try:
                self.seed_perplexity_cache_from_run(SEED_CACHE_FROM_RUN_ID)
            except Exception as e:
                self.logger.exception(f"[Cache] Seed failed | {e}")
        
        # 1. Initial Broad Search
        current_data = self.search_perplexity(f"Comprehensive deep dive data on {topic}. Market size, players, risks.")
        self.context.append(current_data)
        
        loop_count = 0
        final_critique = ""
        
        # 2. The Feedback Loop
        while loop_count < self.max_loops:
            # Aggregate all findings so far
            full_context = "\n---\n".join(self.context)
            
            # Call the Critic
            critique = self.critique_research(topic, full_context)
            final_critique = critique['reasoning']
            
            if critique['status'] == "APPROVED":
                self.logger.info("[Critic] Approved")
                break
            
            self.logger.info(f"[Critic] Rejected | missing_information={critique.get('missing_information')}")
            
            # 3. Targeted Re-Research (The Sniper)
            for question in critique['missing_information']:
                new_findings = self.search_perplexity(question)
                self.context.append(f"Q: {question}\nA: {new_findings}")
                
            loop_count += 1

        # 4. Final Synthesis
        full_context = "\n---\n".join(self.context)
        report = self.synthesize_report(topic, full_context, final_critique)

        # Enforce target length (optional) via a light revision loop.
        wc = self._word_count(report)
        target_min = max(300, self.target_report_words - self.report_word_tolerance)
        target_max = self.target_report_words + self.report_word_tolerance
        revise_loops = 0
        if ENFORCE_WORD_LIMIT:
            while (wc < target_min or wc > target_max) and revise_loops < 2:
                self.logger.info(f"[Writer] Word count outside range | wc={wc} | target={target_min}-{target_max} | pass={revise_loops+1}")
                report = self._revise_report_to_length(topic, report)
                wc = self._word_count(report)
                revise_loops += 1

        self.logger.info(f"[Writer] Final word count | wc={wc}")

        # Always save inside the run folder (safe, auditable)
        self._save_text("final_report.md", report)

        # Safety net: if model forgot to include URLs in Sources section, append them.
        if self.sources and ("http" not in report):
            self.logger.info("[Writer] Sources URLs not detected in report; appending Sources section from canonical list")
            report = report.rstrip() + "\n\n## Sources\n" + "\n".join([f"- {u}" for u in sorted(self.sources)]) + "\n"
            self._save_text("final_report.md", report)

        # Optional: also write a friendly top-level copy with a safe filename.
        output_path = None
        if WRITE_OUTPUT_COPY:
            OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
            slug = self._safe_slug(str(topic))
            output_path = OUTPUT_DIR / f"{slug}_report.md"
            output_path.write_text(report, encoding="utf-8")

        # Optional Notion export (real Notion UI)
        try:
            title = self._safe_slug(str(topic), max_len=60)
            self.export_report_to_notion(title=title, report_markdown=report)
        except Exception as e:
            self.logger.exception(f"[Notion] Export failed | {e}")

        # Optional: Publish to Supabase forum
        post_id = None
        if publish:
            try:
                post_id = publish_research_to_forum(
                    topic=topic,
                    report_markdown=report,
                    logger=self.logger,
                )
                self.logger.info(f"[Publish] Successfully published to forum | post_id={post_id}")
            except Exception as e:
                self.logger.exception(f"[Publish] Failed | {e}")

        self.logger.info(
            "Run completed | output_copy=%r | artifacts_dir=%r | post_id=%r",
            str(output_path) if output_path else None,
            str(self.run_dir),
            post_id,
        )
        return report

# --- EXECUTION ---
def main() -> None:
    parser = argparse.ArgumentParser(
        description="Market Research Agent - Deep research with Perplexity + Gemini synthesis",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python MarketResearch.py "AI in Healthcare market analysis"
  python MarketResearch.py "SaaS pricing strategies for B2B" --publish
  python MarketResearch.py --topic-file topic.txt --publish
"""
    )
    parser.add_argument(
        "topic",
        nargs="?",
        help="Research topic (put in quotes if it contains spaces)"
    )
    parser.add_argument(
        "--topic-file",
        help="Read topic from a file instead of command line"
    )
    parser.add_argument(
        "--publish",
        action="store_true",
        help="Publish the report to Supabase forum (requires SUPABASE_* env vars)"
    )
    args = parser.parse_args()

    # Determine topic
    topic = None
    if args.topic_file:
        topic_path = Path(args.topic_file)
        if not topic_path.exists():
            print(f"Error: Topic file not found: {args.topic_file}")
            return
        topic = topic_path.read_text(encoding="utf-8").strip()
    elif args.topic:
        topic = args.topic.strip()
    
    if not topic:
        parser.print_help()
        print("\nError: No topic provided. Use positional argument or --topic-file")
        return

    # Run the agent
    agent = ResearchAgent()
    report = agent.run(topic, publish=args.publish)
    
    print("\n" + "=" * 60)
    print("RESEARCH COMPLETE")
    print("=" * 60)
    print(f"Run ID: {agent.run_id}")
    print(f"Output: {agent.run_dir / 'final_report.md'}")
    if args.publish:
        print("Published to: Forum (Market Research community)")


if __name__ == "__main__":
    main()