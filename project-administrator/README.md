# Project Administrator Metrics Tool

## Purpose

Record per-task activity for every agent and generate a human-facing HTML report.

## Files

- `agent_metrics.py` — SQLite CLI tool.
- `agent_metrics.sqlite3` — local database created on demand.
- `report.html` — generated human report.

## Commands

```zsh
python project-administrator/agent_metrics.py init
python project-administrator/agent_metrics.py record --agent-name backend --feature-name ticket-management --task-description "Implemented validation" --time-spent-minutes 18 --tokens-spent 1420 --model-used claude-3.7-sonnet
python project-administrator/agent_metrics.py summary
python project-administrator/agent_metrics.py report-html
```

## Reporting rules

- Every agent records each completed task immediately after finishing it.
- Required fields: timestamp, agent name, feature name, short task description, time spent, tokens spent, and model used.
- Project Administrator checks for missing or inconsistent entries and asks the relevant agent to correct them.
- The final HTML report groups totals by agent, feature, and model.

