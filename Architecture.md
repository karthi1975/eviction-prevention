Here is the architecture flow that details how a user's prompt is processed, routed to the specialized agents, and returned to the dashboard interface:

1. Request Flow (Client to Server)
User Input: When you type case details (e.g. “Alice Vance in Harlem...”) and click send, the React/JS frontend starts a Server-Sent Events (SSE) connection calling /run_sse on the FastAPI backend.
Root Coordinator (Routing): The backend routes the payload to the Coordinator Agent (Root). The coordinator inspects the state of the case and hands execution control to the first sub-agent, the Risk Profiler Agent.
2. Multi-Agent Reasoning & Data Grounding (Backend)
Location Mapping & Database Query:
The Risk Profiler uses the search_tracts_by_location tool to search for the neighborhood ("Harlem") in the local SQLite database (evictions.db).
It retrieves the matching census tract GEOID and calls query_eviction_stats to fetch real poverty rates, eviction filing rates, and rent burden metrics.
Risk Level Assessment: The Risk Profiler uses these metrics alongside the client's personal crisis details to determine the risk level (Low, Medium, High) and streams the compiled Risk Profile back to the Coordinator.
Action Plan Generation: The Coordinator hands control to the Intervention Planner Agent. This agent runs the search_resources tool to locate matched support programs in the local registry (Legal Aid, Rental Assistance, etc.) and generates chronological phase steps.
3. "The Vibe Diff" Security Gate (Human-In-The-Loop)
Authorization Intercept: Before the plan is saved to disk, the save_intervention_plan tool triggers a security block. The backend sends a function call event to the frontend demanding caseworker approval.
** casework Approval**: The frontend displays a Security Gate: Action Authorization card. Once you click Approve & Save, a confirmed payload is returned to the runner to finalize the file write.
4. Response Streaming & UI Parsing (Server to Client)
SSE Streaming chunks: Throughout the entire process, raw text is streamed chunk-by-chunk to the frontend.
Regex Dash Parsers: The frontend's app.js listens to the incoming stream in real-time. It uses specific regex patterns (e.g., matching Client Name:\s*\**([^\n\*]+)) to extract values and dynamically update the Risk Profile Card, Risk Factors Table, and Narrative Summary without reloading the page.
Markdown Formatting: The stream is passed through formatMarkdown() to translate headers, lists, and horizontal rules into clean HTML elements before appending them to the chat bubble list.
10:04 AM
