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

from typing import Literal

from pydantic import BaseModel, Field


class RiskProfile(BaseModel):
    """Structured risk assessment profile for housing stability."""

    client_name: str = Field(description="The name of the client being assessed.")
    eviction_risk_level: Literal["Low", "Medium", "High"] = Field(
        description="The determined risk level of eviction or housing loss."
    )
    risk_factors: list[str] = Field(
        description="List of identified risk factors (e.g., job_loss, medical_debt, utility_shutoff, rent_increase)."
    )
    stability_indicators: list[str] = Field(
        description="List of positive stability indicators or protective factors (e.g., family_support, employed, public_benefits)."
    )
    narrative_summary: str = Field(
        description="A detailed summary of the client's current situation and their path toward instability."
    )


class ResourceRecommendation(BaseModel):
    """Details of a recommended local resource or assistance program."""

    resource_name: str = Field(description="The name of the program or organization.")
    category: str = Field(
        description="The category of assistance (e.g., Rental Assistance, Legal Aid, Food Security, Utility Assistance)."
    )
    contact_info: str = Field(
        description="Phone number, email, or address for the resource."
    )
    relevance: str = Field(
        description="Explanation of how this resource addresses the client's specific risk factors."
    )


class InterventionPlan(BaseModel):
    """Complete personalized intervention plan to prevent eviction/housing loss."""

    client_name: str = Field(description="The name of the client.")
    immediate_steps: list[str] = Field(
        description="A chronological checklist of immediate actions the client or social worker should take."
    )
    recommended_resources: list[ResourceRecommendation] = Field(
        description="List of specific local programs recommended to mitigate the risk factors."
    )
    follow_up_timeline: str = Field(
        description="Recommendation for when and how the next follow-up check-in should occur."
    )
