---
name: intervention-planning
description: |
  Formulates a personalized, resource-grounded action plan to prevent housing loss based on a client's RiskProfile.
  Use when a client's RiskProfile has been established and resources or action steps are needed.
  Do NOT use before a risk profile has been established.
version: 1.0.0
license: Apache-2.0
---

# Housing Intervention Planning Skill

This skill guides the agent in designing a personalized intervention plan using local resources.

## When to Use
- A RiskProfile exists and the client needs immediate action steps or local support programs.

## Workflow
1. **Search Resources**:
   - Use the `search_resources` tool to find programs matching the client's risk factors (e.g., 'Rental Assistance', 'Legal Aid', 'Utility Assistance', 'Food Security', 'Family Support').
   - You MUST use the `search_resources` tool; do not invent programs or phone numbers.
2. **Design Action Steps**:
   - Create a list of chronological, actionable immediate steps for the client or social worker (e.g., contact the Tenant's Rights Defense Coalition, apply to the Metro Housing Trust Fund).
3. **Compile the Intervention Plan**:
   - Assemble the recommended resources, noting their contact details and specific relevance.
   - Establish a follow-up timeline.
4. **Trigger Attestation**:
   - Before completing the plan, explain it to the coordinator and pass it to the "Vibe Diff" security check for user confirmation.
