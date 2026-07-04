---
name: risk-profiling
description: |
  Analyzes the client's current situation, identifies risk factors and protective factors, and determines the eviction risk level.
  Use when the user describes a client's situation or asks for a housing stability risk assessment.
  Do NOT use for general tenancy information or resource planning.
version: 1.0.0
license: Apache-2.0
---

# Housing Risk Profiling Skill

This skill guides the agent in conducting a housing stability risk assessment.

## When to Use
- A social worker provides notes about a client facing eviction.
- A tenant describes job loss, utility shutoffs, or rent increases.

## Workflow
1. **Identify Key Information**:
   - Client's name.
   - Specific risk factors (e.g., job loss, medical debt, utility shutoff, rent arrears).
   - Stability indicators/protective factors (e.g., family support, employment, public assistance).
2. **Determine Eviction Risk Level**:
   - **High**: Immediate threat of eviction (court filing, landlord notice) + multiple risk factors + no income/savings.
   - **Medium**: Accumulating arrears (1-2 months behind) + risk factors (e.g., job loss) + some stability indicators.
   - **Low**: General questions + currently stable + no current threat.
3. **Compile Structured RiskProfile**:
   - Fill out the fields defined in `RiskProfile` schema: `client_name`, `eviction_risk_level`, `risk_factors`, `stability_indicators`, and `narrative_summary`.
