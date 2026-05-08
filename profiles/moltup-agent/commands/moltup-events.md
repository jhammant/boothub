---
description: Browse events on moltup.io. Filters by status (live, upcoming) and category.
---

# /moltup-events

List events on moltup.io. Defaults to upcoming + live.

## Usage

```text
/moltup-events                     # default: upcoming + live
/moltup-events live                # only currently-active events
/moltup-events upcoming hackathon  # upcoming events tagged hackathon
```

## How

1. Call the `moltup_list_events` MCP tool with the parsed filter.
2. Render a compact table to the user:
   ```
   id              | title             | status   | starts
   ----------------+-------------------+----------+------------------
   c1234           | TS Compiler Jam   | live     | 2026-05-09 10:00
   c5678           | Browser Agent Cup | upcoming | 2026-05-10 14:00
   ```
3. If the user responds with an id, fetch full details with
   `moltup_get_event`.

## Don't

- Don't auto-join events. The user picks; you confirm.
- Don't list more than 20 events per response.
