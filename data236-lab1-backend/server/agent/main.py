# main.py
# ---------------------------------------------
# FastAPI backend for an "AI Concierge" feature.
# - Integrates Ollama (default: llama3.2:3b-instruct) to produce a trip plan JSON
# - Optionally integrates Tavily (if TAVILY_API_KEY is set) for local search context
# - Robustly parses/repairs model JSON output (even if the model adds extra text)
# - Filters aggregator/directory pages (Yelp, Tripadvisor, "Top 10 ..." listicles)
# - Guarantees a valid JSON response for the frontend (plan/activities/restaurants/packing list)
# ---------------------------------------------

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import json
import re
import random
import requests
from datetime import date, timedelta
from urllib.parse import urlparse

# ====================================
# ---- Configuration ----
# ====================================

OLLAMA_URL = "http://127.0.0.1:11500/api/generate"
OLLAMA_MODEL = "llama3"
TAVILY_API_KEY = "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"

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:4000",
]

# Small/low-VRAM friendly generation options
OLLAMA_OPTIONS = {
    "num_predict": 256,   # keep short to reduce VRAM/time
    "num_ctx": 1024,      # smaller context to reduce memory
    "temperature": 0.4,   # less creative, more structured
}

app = FastAPI(title="AI Concierge API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====================================
# ---- Small Utilities ----
# ====================================

def _s(x) -> str:
    """Safe string conversion."""
    return "" if x is None else str(x)

def safe_json_loads(text: str):
    """Try to parse JSON, return None on failure."""
    try:
        return json.loads(text)
    except Exception:
        return None

def extract_json_obj(text: str):
    """
    Extract a valid JSON object from model output that may contain extra text.
    Strategy:
    1) Try full parse
    2) Scan text for last balanced {...} segment and parse it
    """
    if not text:
        return None
    obj = safe_json_loads(text)
    if obj is not None:
        return obj

    stack = []
    start = None
    candidates = []
    for i, ch in enumerate(text):
        if ch == "{":
            if not stack:
                start = i
            stack.append("{")
        elif ch == "}":
            if stack:
                stack.pop()
                if not stack and start is not None:
                    candidates.append(text[start:i+1])

    for frag in reversed(candidates):
        o = safe_json_loads(frag)
        if o is not None:
            return o
    return None

def daterange_inclusive(start_iso: str, end_iso: str):
    """Return date list from start..end inclusive. If invalid or end < start, return minimal list."""
    try:
        y1, m1, d1 = map(int, start_iso.split("-"))
        y2, m2, d2 = map(int, end_iso.split("-"))
        a, b = date(y1, m1, d1), date(y2, m2, d2)
    except Exception:
        return []
    if b < a:
        b = a
    days, cur = [], a
    while cur <= b:
        days.append(cur.isoformat())
        cur += timedelta(days=1)
    return days

# ====================================
# ---- Aggregator/Listicle Filtering ----
# ====================================

AGG_DOMAINS = {
    "yelp.com", "tripadvisor.com", "reddit.com", "youtube.com",
    "facebook.com", "instagram.com", "tiktok.com",
    "eventbrite.com", "meetup.com", "visitphoenix.com", "visitarizona.com"
}

LISTICLE_RE = re.compile(
    r"(?:\btop\s?\d+|\bbest\b|\bthings?\s+to\s+do\b|\bguide\b|\blist\b|\bultimate\b|\bdestinations?\b)",
    re.I
)

def is_aggregator_or_listicle(text_or_url: str) -> bool:
    """Return True if looks like directory/listicle/aggregator content."""
    if not text_or_url:
        return False
    s = text_or_url.lower()
    if LISTICLE_RE.search(s):
        return True
    try:
        host = urlparse(s).netloc
        root = ".".join(host.split(".")[-2:]) if host else ""
        return root in AGG_DOMAINS
    except Exception:
        return False

# ====================================
# ---- Tavily (Optional) ----
# ====================================

def tavily_search(query: str, max_results=10):
    """If TAVILY_API_KEY not provided, return empty results gracefully."""
    if not TAVILY_API_KEY:
        return {"results": []}
    try:
        r = requests.post(
            "https://api.tavily.com/search",
            headers={"Authorization": f"Bearer {TAVILY_API_KEY}"},
            json={"query": query, "max_results": max_results},
            timeout=15,
        )
        r.raise_for_status()
        return r.json()
    except Exception:
        return {"results": []}

def tavily_normalize(tavily: dict):
    """Return a normalized list of {title, url, content} from Tavily."""
    rows = tavily.get("results") or tavily.get("data") or []
    out = []
    for r in rows:
        out.append({
            "title": _s(r.get("title")),
            "url": _s(r.get("url")),
            "content": _s(r.get("content") or r.get("snippet") or r.get("description") or ""),
        })
    return out

# ====================================
# ---- Prompt + Ollama ----
# ====================================

def build_prompt(booking: dict, preferences: dict, nlu_query: str, tavily_data: dict) -> str:
    """
    Construct a strict instruction for the model to output JSON only.
    We keep the local context small to avoid exceeding small models' context limits.
    """
    local = json.dumps(tavily_data, ensure_ascii=False)
    if len(local) > 1200:
        local = local[:1200] + "...(truncated)"

    return f"""
You are an expert AI travel planner.
Return ONLY valid JSON (no commentary, no markdown, no code fences).

JSON Schema:
{{
  "plan": [{{"date":"YYYY-MM-DD","blocks":{{"morning":[str],"afternoon":[str],"evening":[str]}}}}],
  "activities": [{{"title":str,"address":str,"price_tier":"$|$$|$$$","duration_min":int,"tags":[str],"wheelchair_friendly":bool,"child_friendly":bool}}],
  "restaurants": [{{"name":str,"address":str,"price_tier":"$|$$|$$$","diet_tags":[str],"notes":str}}],
  "packing_checklist": [str]
}}

Hard requirements:
- Output strictly valid JSON, with all four top-level keys.
- Produce at least 2 days in "plan" with morning/afternoon/evening arrays.
- Produce at least 3 "activities" and at least 3 "restaurants".
- Do NOT output aggregator/directory/listicle items (e.g., Yelp, Tripadvisor, Reddit, YouTube).
- Prefer concrete places with a name and an address/URL of the place itself (not a directory page).
- Respect dietary/mobility preferences.

Booking: {json.dumps(booking, ensure_ascii=False)}
Preferences: {json.dumps(preferences, ensure_ascii=False)}
Free text: {nlu_query or ""}
Local results: {local}
"""

def generate_with_ollama(prompt: str) -> dict:
    """
    Call Ollama and try to parse a JSON object from the response.
    We do NOT use 'format':'json' (some small models ignore it).
    Instead we ask for JSON in the prompt and robustly extract it.
    """
    try:
        r = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": OLLAMA_OPTIONS,
            },
            timeout=70,
        )
        r.raise_for_status()
        raw = r.json().get("response", "")
        obj = extract_json_obj(raw)
        if obj is None:
            raise ValueError("model_output_not_valid_json")
        return obj
    except Exception as e:
        raise RuntimeError(f"Ollama failed: {e}")

# ====================================
# ---- Fallbacks / Repair ----
# ====================================

# Non-repeating fallback restaurant names to avoid "Local family restaurant" spam
FALLBACK_RESTAURANTS_POOL = [
    "Sunset Garden Kitchen",
    "Riverside Vegan Bistro",
    "Cactus Bloom Eatery",
    "Copper Spice Cafe",
    "Maple & Thyme Diner",
    "Seaside Plant House",
    "Cedar Grove Kitchen",
    "Harvest Moon Table",
    "Saffron & Sage",
    "Pinecone Pantry",
]

def fallback_result(booking: dict, preferences: dict, tavily_list: list) -> dict:
    """Build a minimal valid result with non-repeating restaurant names."""
    # Build activities from Tavily if possible (non-aggregators), otherwise use generic
    acts = []
    for r in tavily_list:
        if is_aggregator_or_listicle(r["url"]) or is_aggregator_or_listicle(r["title"]):
            continue
        acts.append({
            "title": r["title"][:80] or "Activity",
            "address": r["url"],
            "price_tier": "$$",
            "duration_min": 90,
            "tags": ["outdoor"],
            "wheelchair_friendly": True,
            "child_friendly": True,
        })
        if len(acts) >= 5:
            break
    if len(acts) < 3:
        # pad with generic activities
        acts += [{
            "title": "City park visit",
            "address": "",
            "price_tier": "$",
            "duration_min": 60,
            "tags": ["outdoor"],
            "wheelchair_friendly": True,
            "child_friendly": True,
        }] * (3 - len(acts))

    # Unique fallback restaurants
    diet = preferences.get("dietary") or []
    if isinstance(diet, str):
        diet = [diet]
    picks = random.sample(FALLBACK_RESTAURANTS_POOL, k=3) if len(FALLBACK_RESTAURANTS_POOL) >= 3 else FALLBACK_RESTAURANTS_POOL[:3]
    restos = [{
        "name": n,
        "address": "",
        "price_tier": "$",
        "diet_tags": diet,
        "notes": "fallback",
    } for n in picks]

    # Build plan dates
    days = daterange_inclusive(_s(booking.get("start_date")), _s(booking.get("end_date")))
    if len(days) < 2:
        today = date.today()
        days = [today.isoformat(), (today + timedelta(days=1)).isoformat()]

    plan = []
    for i, d in enumerate(days):
        plan.append({
            "date": d,
            "blocks": {
                "morning":   [acts[i % len(acts)]["title"]],
                "afternoon": [acts[(i + 1) % len(acts)]["title"]],
                "evening":   [restos[i % len(restos)]["name"] + " dinner"],
            }
        })

    return {
        "plan": plan,
        "activities": acts,
        "restaurants": restos,
        "packing_checklist": ["Light jacket", "Sunscreen", "Water bottle", "Comfortable shoes"],
    }

def ensure_minimum_shape(data: dict, booking: dict, preferences: dict, tavily_list: list) -> dict:
    """
    Validate and, if necessary, repair the model output to match the UI's expectations.
    """
    if not isinstance(data, dict):
        return fallback_result(booking, preferences, tavily_list)

    plan = data.get("plan") or []
    activities = data.get("activities") or []
    restaurants = data.get("restaurants") or []
    packing = data.get("packing_checklist") or []

    # Drop aggregator/listicle items from activities
    cleaned_acts = []
    for a in activities:
        title = _s(a.get("title"))
        addr  = _s(a.get("address"))
        if is_aggregator_or_listicle(title) or is_aggregator_or_listicle(addr):
            continue
        cleaned_acts.append({
            "title": title[:120] or "Activity",
            "address": addr,
            "price_tier": a.get("price_tier") or "$",
            "duration_min": int(a.get("duration_min") or 60),
            "tags": a.get("tags") or [],
            "wheelchair_friendly": bool(a.get("wheelchair_friendly")) if "wheelchair_friendly" in a else False,
            "child_friendly": bool(a.get("child_friendly")) if "child_friendly" in a else False,
        })
    activities = cleaned_acts[:12]

    # Ensure at least 3 activities
    if len(activities) < 3:
        data_fb = fallback_result(booking, preferences, tavily_list)
        activities = data_fb["activities"]

    # Restaurants: drop aggregators; if too few, fill non-repeating names
    cleaned_rest = []
    for r in restaurants:
        name = _s(r.get("name"))
        addr = _s(r.get("address"))
        if is_aggregator_or_listicle(name) or is_aggregator_or_listicle(addr):
            continue
        if name.strip().lower().startswith("local family restaurant"):
            continue  # avoid the boring fallback name if the model used it
        cleaned_rest.append({
            "name": name[:120] or "Restaurant",
            "address": addr,
            "price_tier": r.get("price_tier") or "$$",
            "diet_tags": r.get("diet_tags") or (preferences.get("dietary") or []),
            "notes": r.get("notes") or "",
        })
    if len(cleaned_rest) < 3:
        need = 3 - len(cleaned_rest)
        pool = [n for n in FALLBACK_RESTAURANTS_POOL if n.lower() not in {x["name"].lower() for x in cleaned_rest}]
        extra = random.sample(pool, k=min(need, len(pool))) if pool else []
        cleaned_rest += [{
            "name": n,
            "address": "",
            "price_tier": "$",
            "diet_tags": preferences.get("dietary") or [],
            "notes": "fallback",
        } for n in extra]
        # if still short (pool too small), fill with numbered placeholders
        while len(cleaned_rest) < 3:
            idx = len(cleaned_rest) + 1
            cleaned_rest.append({
                "name": f"Neighborhood Kitchen #{idx}",
                "address": "",
                "price_tier": "$",
                "diet_tags": preferences.get("dietary") or [],
                "notes": "fallback",
            })
    restaurants = cleaned_rest[:12]

    # Packing list
    if not packing:
        packing = ["Comfortable shoes", "Sunscreen", "Reusable water bottle", "Light jacket"]
    packing = [str(x) for x in packing][:20]

    # Plan dates: enforce window and ensure blocks exist
    days = daterange_inclusive(_s(booking.get("start_date")), _s(booking.get("end_date")))
    if len(days) < 2:
        today = date.today()
        days = [today.isoformat(), (today + timedelta(days=1)).isoformat()]

    fixed_plan = []
    # Convert any existing plan into a blocks template list; otherwise create one empty template
    templates = []
    for p in plan:
        blocks = p.get("blocks") or {}
        templates.append({
            "morning":   blocks.get("morning") or [],
            "afternoon": blocks.get("afternoon") or [],
            "evening":   blocks.get("evening") or [],
        })
    if not templates:
        templates = [{"morning": [], "afternoon": [], "evening": []}]

    # Fill dates, reuse templates cyclically
    for i, d in enumerate(days):
        tpl = templates[i % len(templates)]
        # If template is empty, seed with activities/restaurants
        morning = tpl["morning"] or [activities[i % len(activities)]["title"]]
        afternoon = tpl["afternoon"] or [activities[(i + 1) % len(activities)]["title"]]
        evening = tpl["evening"] or [restaurants[i % len(restaurants)]["name"] + " dinner"]
        fixed_plan.append({"date": d, "blocks": {"morning": morning, "afternoon": afternoon, "evening": evening}})

    return {
        "plan": fixed_plan,
        "activities": activities,
        "restaurants": restaurants,
        "packing_checklist": packing,
    }

# ====================================
# ---- API Routes ----
# ====================================

@app.post("/api/ai/concierge")
async def concierge(request: Request):
    """
    Main endpoint called by the React Agent Panel.
    Body:
    {
      "booking": { "location": "...", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", ... },
      "preferences": { "dietary": ["vegan"], ... },
      "nlu_query": "free text"
    }
    """
    body = await request.json()
    booking     = body.get("booking")     or {}
    preferences = body.get("preferences") or {}
    nlu_query   = body.get("nlu_query")   or ""

    # 1) Optional local search context (safe even without key)
    city = _s(booking.get("location"))
    tav = tavily_search(f"{city} restaurants family activities")
    tav_list = tavily_normalize(tav)

    # 2) Generate with Ollama; if it fails, build fallback
    try:
        prompt = build_prompt(booking, preferences, nlu_query, tav)
        raw_result = generate_with_ollama(prompt)
    except Exception as e:
        fb = fallback_result(booking, preferences, tav_list)
        fb["_debug"] = {"error": "generation_failed", "message": str(e)}
        return JSONResponse(content=fb)

    # 3) Validate/repair/guarantee minimums
    final = ensure_minimum_shape(raw_result, booking, preferences, tav_list)
    return JSONResponse(content=final)

@app.get("/healthz")
def health():
    return {"ok": True, "model": OLLAMA_MODEL, "ollama_url": OLLAMA_URL}
