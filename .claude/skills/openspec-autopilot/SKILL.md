---
name: openspec-autopilot
description: Run the full OpenSpec cycle end to end without stops. Use when the user wants a change taken from idea to archive in one run, asks to build something hands-off with OpenSpec, or says "openspec autopilot", "opsx autopilot", "run the whole openspec cycle", or "propose, implement and archive X". Do not use for a single stage, such as only propose or only verify.
---

# OpenSpec Autopilot

Take one change from idea to archive without user input.

## Process

### 1. Explore and Propose

- Spawn a subagent to explore and create the proposal artifacts for the change
- Its prompt should include
  - a change description based on the user request and the conversation
  - a rule to use the `openspec-explore` skill to explore the codebase
  - a rule to use the `openspec-propose` skill to create the change artifacts
- The subagent must return
  - the change name
  - the affected capabilities
  - the key design decisions
  - the number of tasks
  - the assumptions made

### 2. Apply

- Spawn a subagent to implement the proposed change
- Its prompt should include
  - the change name
  - a rule to use the `openspec-apply-change` skill
  - a rule to complete all tasks
- The subagent must return
  - the number of completed tasks, as N/M
  - the assumptions made
  - the deviations from the original plan

### 3. Verify

- Spawn a subagent to verify the change
- Its prompt should include
  - the change name
  - a rule to use the `openspec-verify-change` skill
- The subagent must return
  - a list of critical, warning, and suggestion issues
  - a recommendation for each issue: fix or skip
- If there are no issues, go to `5. Archive`

### 4. Fix Findings from Verify Step

- Spawn a subagent to fix the findings
- Its prompt should include
  - the change name
  - the list of issues from the verify step
  - a rule to read the change artifacts before the fix
  - a rule to fix the code or tasks so that the implementation matches the artifacts
- The subagent must return
  - a list of fixed issues
  - a list of issues not fixed, each with a reason
- Return to `3. Verify` (maximum 3 verifications)
- If issues remain after the 3rd verification, stop and do not archive

### 5. Archive

- Spawn a subagent to archive the change
- Its prompt should include
  - the change name
  - a rule to use the `openspec-archive-change` skill
  - a rule to sync the delta specs to the main specs
  - a rule to confirm the archive
- The subagent must return
  - the archive location
  - the list of updated or created main specs

### 6. Final Report

Report to the user

- the change name and archive location
- a summary of the change
- the assumptions from all stages
- the number of verify rounds and fixed issues
- the open issues or blockers, if the cycle stopped
