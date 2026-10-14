# Triage Labels

The skills speak in terms of five canonical triage roles. The Kanban board has statuses rather than labels, so each role maps to a status (and a comment prefix where one status covers two roles).

| Label in mattpocock/skills | On the `brackstone-site` board | Meaning |
| --- | --- | --- |
| `needs-triage` | created with `--triage` | Controller needs to evaluate this ticket |
| `needs-info` | `blocked`, comment starting `needs-info:` | Waiting on someone for more information |
| `ready-for-agent` | `ready` | Fully specified, ready for a worker |
| `ready-for-human` | `blocked`, assigned to `saeed-approval` | Needs Saeed (a decision, credential or physical step) |
| `wontfix` | `done`, comment starting `wontfix:` | Will not be actioned |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding status from this table.
