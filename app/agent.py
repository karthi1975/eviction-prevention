# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os

import google.auth
from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.adk.tools import exit_loop
from google.genai import types

# Import custom tools
from app.tools import save_intervention_plan, search_resources, search_tracts_by_location, query_eviction_stats

# Initialize GCP environment variables for Vertex AI
_, project_id = google.auth.default()
os.environ["GOOGLE_CLOUD_PROJECT"] = project_id
os.environ["GOOGLE_CLOUD_LOCATION"] = "global"
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"

# Shared model config
model_config = Gemini(
    model="gemini-flash-latest",
    retry_options=types.HttpRetryOptions(attempts=3),
)

def transfer_to_intervention_planner(tool_context) -> None:
    """Transfers control to the Intervention Planner agent to find resources and create the plan.
    
    Call this tool only when the risk profile assessment and narrative summary are fully complete.
    """
    tool_context.actions.transfer_to_agent = "intervention_planner"
    tool_context.actions.skip_summarization = True

# 1. Risk Profiler Agent (Chat Mode)
risk_profiler = Agent(
    name="risk_profiler",
    model=model_config,
    tools=[search_tracts_by_location, query_eviction_stats, transfer_to_intervention_planner],
    description="Analyzes the client's current situation, identifies risk factors and protective factors, and determines the eviction risk level.",
    instruction=(
        "You are the Risk Profiler Agent. Your goal is to assess a client's housing stability risk.\n"
        "1. Identify the client's name. If unknown, ask the user/social worker for it.\n"
        "2. Ask for or identify the client's location (neighborhood or city). Use the search_tracts_by_location tool to find matching census tracts and FIPS GEOIDs, and then call the query_eviction_stats tool to retrieve real tract-level eviction rates, poverty rates, and rent burden statistics. You must query statistics if the client's location matches any tract in the database.\n"
        "3. Identify specific risk factors (e.g., job loss, medical bills, rent increase, high local eviction filing rate, high poverty rate) and protective factors (e.g., family support, employment, low-risk tract).\n"
        "4. Determine the eviction risk level (Low, Medium, or High) based on the severity of risk factors and the tract-level eviction risk context.\n"
        "5. Write a detailed narrative summary of the client's situation, incorporating the real census-tract-level statistics (filing rates, poverty rate, rent burden) if you retrieved them.\n"
        "Present your final assessment clearly with sections: Client Name, Eviction Risk Level, Risk Factors, Stability Indicators, and Narrative Summary.\n"
        "Once you have completed and presented the final assessment, you MUST call the transfer_to_intervention_planner tool to start the planning phase."
    ),
)

# 2. Intervention Planner Agent (Chat Mode)
intervention_planner = Agent(
    name="intervention_planner",
    model=model_config,
    tools=[search_resources, save_intervention_plan, exit_loop],
    description="Takes a compiled RiskProfile, searches for matching local resources using tools, designs a customized action plan, and saves it to artifacts.",
    instruction=(
        "You are the Intervention Planner Agent. Your goal is to design a personalized, resource-grounded Intervention Plan.\n"
        "1. Read the client's Risk Profile from the session history.\n"
        "2. Use the search_resources tool to find local assistance programs (e.g., Rental Assistance, Legal Aid, Utility Assistance) that address the client's specific risk factors. You MUST search for resources using this tool, do not make them up.\n"
        "3. Formulate a list of chronological, actionable immediate steps for the client/social worker.\n"
        "4. You MUST call the save_intervention_plan tool to save the complete text representation of the intervention plan to the session artifacts. You must pass the client name, the plan text, and the user's original query as the user_query argument. This will trigger a Vibe Diff security confirmation check.\n"
        "Once you have built the plan and successfully saved it, summarize the plan details for the user.\n"
        "Once summarized, call the exit_loop tool to complete the workflow."
    ),
)

# 3. Coordinator Agent (Root Coordinator Agent)
root_agent = Agent(
    name="coordinator",
    model=model_config,
    sub_agents=[risk_profiler, intervention_planner],
    instruction=(
        "You are the Preventable Pathways Coordinator Agent. Your job is to help users (like social workers or case managers) assess housing stability risks and build actionable prevention plans.\n"
        "Follow this exact workflow:\n"
        "1. When the user introduces a client's case or situation, transfer control to the `risk_profiler` sub-agent to compile the risk profile.\n"
        "2. Once the `risk_profiler` has completed the risk profile, transfer control to the `intervention_planner` sub-agent to find local resources, draft the intervention plan, and save it via the save_intervention_plan tool.\n"
        "3. Once both sub-agents have completed their tasks, provide a brief wrap-up summarizing the recommended resources and next steps. Do NOT repeat the full risk profile assessment or narrative summary compiled by the risk_profiler sub-agent, as it is already visible in the dashboard. "
        "Explicitly inform the user that the complete action plan has been saved to their session artifacts (e.g., intervention_<client_name>.txt) and explain how they can download/access it."
    ),
)

app = App(
    root_agent=root_agent,
    name="app",
)
