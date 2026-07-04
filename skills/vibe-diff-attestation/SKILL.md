---
name: vibe-diff-attestation
description: |
  Enforces the "Vibe Diff" security check by translating the generated plan back into a plain-English intent comparison and requesting human confirmation.
  Use immediately before calling save_intervention_plan to prevent unauthorized or unintended file writes.
  Do NOT use for general conversation.
version: 1.0.0
license: Apache-2.0
---

# Vibe Diff Attestation Skill

This skill implements the "Vibe Diff" security check to ensure alignment between human intent and agent execution.

## When to Use
- Immediately before saving an intervention plan to artifacts, to serve as a security and logic review gate.

## Workflow
1. **Compare Intent to Execution**:
   - Verify that the client name, risk factors, and recommended resources in the plan perfectly match the user's initial query.
2. **Present the Vibe Diff**:
   - Call the `save_intervention_plan` tool, passing the `user_query`, which automatically generates "The Vibe Diff" summary and requests user confirmation via `tool_context.request_confirmation`.
3. **Handle User Decision**:
   - If the user approves, proceed with writing the plan to artifacts.
   - If the user rejects, report that the plan was discarded.
