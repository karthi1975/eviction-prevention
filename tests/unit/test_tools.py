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
import sys
from unittest.mock import AsyncMock, MagicMock

import pytest
from google.adk.tools import ToolContext
from google.genai import types

from app.tools import (
    search_resources,
    search_tracts_by_location,
    query_eviction_stats,
    save_intervention_plan,
)


@pytest.mark.asyncio
async def test_search_resources() -> None:
    """Tests the registry of local support resources search and category filters."""
    # Test category filtering
    res = await search_resources(query="", category="Legal Aid")
    assert res["status"] == "success"
    assert len(res["results"]) > 0
    for item in res["results"]:
        assert item["category"] == "Legal Aid"

    # Test keyword filtering
    res2 = await search_resources(query="food", category="Any")
    assert res2["status"] == "success"
    assert any("food" in item["resource_name"].lower() or "food" in item["description"].lower() for item in res2["results"])


@pytest.mark.asyncio
async def test_search_tracts_by_location() -> None:
    """Tests SQLite census tract lookup by location/neighborhood."""
    # Test empty query
    res = await search_tracts_by_location("")
    assert res["status"] == "success"
    assert res["results"] == []

    # Test valid query (e.g. 'Harlem')
    res2 = await search_tracts_by_location("Harlem")
    assert res2["status"] == "success"
    assert len(res2["results"]) > 0
    assert any(item["neighborhood"] == "Harlem" for item in res2["results"])


@pytest.mark.asyncio
async def test_query_eviction_stats() -> None:
    """Tests querying eviction, poverty, and rent burden statistics for a census tract."""
    # Test valid geoid (Harlem, NY tract: '36061019701')
    res = await query_eviction_stats("36061019701")
    assert res["status"] == "success"
    assert res["data"]["geoid"] == "36061019701"
    assert "eviction_filing_rate" in res["data"]
    assert "poverty_rate" in res["data"]
    assert "rent_burden" in res["data"]
    assert "risk_context" in res["data"]

    # Test invalid geoid
    res2 = await query_eviction_stats("99999999999")
    assert res2["status"] == "not_found"


@pytest.mark.asyncio
async def test_save_intervention_plan_pending() -> None:
    """Tests that save_intervention_plan requests confirmation if not yet confirmed (Vibe Diff HITL)."""
    tool_context = MagicMock(spec=ToolContext)
    tool_context.tool_confirmation = None
    tool_context.request_confirmation = MagicMock()
    
    # Patch sys.argv to mock a non-eval environment
    original_argv = sys.argv
    sys.argv = ["fast_api_app.py"]

    try:
        res = await save_intervention_plan(
            client_name="Test Client",
            plan_text="Test action plan details here.",
            user_query="Help Test Client with eviction",
            tool_context=tool_context
        )
        assert res["status"] == "pending_confirmation"
        assert "vibe_diff" in res
        tool_context.request_confirmation.assert_called_once()
    finally:
        sys.argv = original_argv


@pytest.mark.asyncio
async def test_save_intervention_plan_confirmed() -> None:
    """Tests that save_intervention_plan proceeds with saving when confirmation is true."""
    tool_context = MagicMock(spec=ToolContext)
    
    confirmation = MagicMock()
    confirmation.confirmed = True
    tool_context.tool_confirmation = confirmation
    tool_context.save_artifact = AsyncMock(return_value=1)
    
    original_argv = sys.argv
    sys.argv = ["fast_api_app.py"]

    try:
        res = await save_intervention_plan(
            client_name="Test Client",
            plan_text="Test action plan details here.",
            user_query="Help Test Client with eviction",
            tool_context=tool_context
        )
        assert res["status"] == "success"
        assert res["filename"] == "intervention_test_client.txt"
        assert res["version"] == 1
        tool_context.save_artifact.assert_called_once()
    finally:
        sys.argv = original_argv
