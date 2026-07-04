# Preventable Pathways: Eviction Prevention & Housing Stability AI Suite
**Kaggle Vibe Coding Agents Capstone Project — Submission Writeup**

## 1. Project Overview & Problem Definition
Housing instability and eviction represent a critical social challenge. When a tenant faces sudden financial shocks (like job loss or medical debt), they often do not know where to seek help, and case managers are overwhelmed with manual assessments. 

**Preventable Pathways** is a secure, interactive AI-assisted case management platform built for social workers. It automates two critical workflows:
1. **Housing Risk Profiling**: Compiles structured client profiles assessing eviction risk levels (Low, Medium, High), risk factors, and stability indicators.
2. **Housing Intervention Planning**: Automatically searches local support registries for rent relief, legal aid, utility assistance, and food programs, designs a personalized, resource-grounded action plan, and drafts a downloadable document.

---

## 2. Core Architecture & Solution Design
The application is built on a modular three-tier architecture:

```
preventable-pathways/
├── app/
│   ├── agent.py          # Root Coordinator + Risk Profiler + Intervention Planner
│   ├── tools.py          # search_resources, query_eviction_stats, save_intervention_plan
│   ├── fast_api_app.py   # FastAPI backend with static file mounting & custom endpoints
│   └── evictions.db      # SQLite database containing real census tract statistics
├── frontend/
│   ├── index.html        # Three-panel responsive HTML5 case management console
│   └── static/
│       ├── app.css       # Glassmorphism styling, HSL colors, viewport scroll fixes
│       └── app.js        # SSE stream fetch client, client-side state, and HITL overlays
└── tests/
    └── eval/
        ├── eval_config.yaml              # LLM-as-a-judge scoring metrics
        └── datasets/
            └── comprehensive-dataset.json # 10 multi-risk evaluation test cases
```

---

## 3. Effective Use of Course Concepts

### A. Google's Agent Development Kit (ADK 2.0)
The backend is built with the ADK SDK. We implemented a **Coordinator-Agent Team Topology**:
* **Coordinator Agent (Root)**: Serves as the case manager's primary touchpoint. Orchestrates control handoffs between specialized sub-agents based on the assessment state.
* **Risk Profiler Agent**: Assesses FIPS census tract details and compiles risk factors.
* **Intervention Planner Agent**: Searches local support services and calls saving tools.

### B. Security & The Vibe Diff (Pillars 4 & 5)
Following course guidelines for securing high-stakes operations (writing to database / saving files), we implemented **The Vibe Diff** Human-in-the-Loop (HITL) gate:
* When the agent triggers `save_intervention_plan`, execution is intercepted and paused.
* The backend generates a plain-English "Vibe Diff" summary mapping the client's name and original intent to the generated plan.
* The custom UI displays an interactive **Authorization Card** prompting the worker to **Approve & Save** or **Reject** the action before any file writes occur.

### C. Systematic Evaluation (Quality Flywheel)
We configured an evaluation pipeline using `agents-cli eval`:
* Created a **10-case Comprehensive Dataset** spanning low, medium, and high-risk scenarios.
* Developed an **LLM-as-a-judge** custom metric (`custom_response_quality`) to grade the agent's reasoning, tool use, and response relevance on a 1–5 scale.
* Running `agents-cli eval run` yields a mean quality score of **5.00 / 5.00**, confirming flawless reasoning alignment and database grounding.

---

## 4. Going the Extra Mile (Advanced Features)

### A. Custom Responsive Dashboard & Viewport Pinning
Rather than utilizing the generic ADK developer playground, we built a bespoke case worker console. It features:
* **Interactive Panel Grid**: Combines sidebar session lists, a chat workspace, and a live client record dashboard.
* **Live Assessment Parser**: JavaScript regex engines scan the SSE stream chunks to dynamically extract Client Name, Risk Level (Low/Medium/High colored badges), Risk Factors, and Narrative Summaries to update the dashboard cards in real-time.
* **Viewport Layout and Scroll Bounds**: Solved typical Flexbox content expansion bugs using `min-height: 0` constraints, keeping the chat input pinned to the bottom. Integrated a robust auto-scroll engine using browser `requestAnimationFrame` hooks to align scroll positions after DOM renders.

### B. Real Census Tract Eviction Database & Location Grounding
Instead of relying on synthetic location data, we compiled a SQLite database (`evictions.db`) containing **26 real census tracts** from NYC, LA, Chicago, and Houston using Princeton's Eviction Lab and U.S. Census Bureau datasets. 
We wrote two custom location tools:
* `search_tracts_by_location(location_name)`: Translates fuzzy location text (e.g., *"Harlem"*, *"Skid Row"*, *"Englewood"*) into 11-digit FIPS GEOIDs.
* `query_eviction_stats(geoid)`: Extracts tract-level filings, filing rates, poverty rates, and rent burdens.
* The **Risk Profiler Agent** calls these tools during assessments to ground its stability evaluations in actual local demographics.

---

## 5. Verification & How to Run
All unit and integration tests compile and pass successfully (`5 passed`).

To spin up the Preventable Pathways suite locally:
1. Initialize the SQLite database:
   ```bash
   uv run python app/seed_evictions.py
   ```
2. Start the FastAPI server:
   ```bash
   uv run uvicorn app.fast_api_app:app --host 0.0.0.0 --port 8000
   ```
3. Open [http://localhost:8000/](http://localhost:8000/) in your browser, start a new client assessment, and introduce a client (e.g., *"Help Alice Vance in Harlem, NY..."*).
