---
boothub: 1
profile: jhammant
source: https://github.com/jhammant/boothub-profile
targets:
  - claude-code
  - cursor
  - codex
summary: |
  Installs jhammant's agent setup. Pick a preset:
  • /jhammant         → skills + commands + CLAUDE.md (lite default)
  • /jhammant/swarm   → adds OpenClaw 4-agent swarm + claw-bridge + claude-history
  • /jhammant/work    → adds work-specific bundles
presets:
  default:
    - skills
    - commands
    - project-context
  swarm:
    - skills
    - commands
    - project-context
    - openclaw-personas
    - claw-bridge
    - claude-history
  lite:
    - skills
    - commands
bundles:
  - id: skills
    kind: files
    only-on: claude-code
    files:
      - { path: .claude/skills/standup.md, from: skills/standup.md }
      - { path: .claude/skills/handoff.md, from: skills/handoff.md }
  - id: commands
    kind: files
    files:
      - { path: .claude/commands/standup.md, from: commands/standup.md }
      - { path: .claude/commands/save.md, from: commands/save.md }
  - id: project-context
    kind: files
    files:
      - { path: CLAUDE.md, from: project/CLAUDE.md }
      - { path: AGENTS.md, from: agents/AGENTS.md }
  - id: openclaw-personas
    kind: files
    files:
      - { path: .claude/agents/cortex/SOUL.md, from: agents/cortex/SOUL.md }
      - { path: .claude/agents/builder/SOUL.md, from: agents/builder/SOUL.md }
      - { path: .claude/agents/scholar/SOUL.md, from: agents/scholar/SOUL.md }
      - { path: .claude/agents/sentinel/SOUL.md, from: agents/sentinel/SOUL.md }
  - id: claw-bridge
    kind: mcp
    only-on:
      - claude-code
      - cursor
    mcp:
      claude-code:
        scope: user
        config:
          command: node
          args:
            - "{{HOME}}/dev/claw-bridge/mcp-bridge/index.js"
      cursor:
        config:
          command: node
          args:
            - "{{HOME}}/dev/claw-bridge/mcp-bridge/index.js"
    template_vars:
      - HOME
    post: "Run /bridge_status to verify the broker is reachable."
  - id: claude-history
    kind: mcp
    mcp:
      claude-code:
        scope: user
        config:
          command: node
          args:
            - "{{HOME}}/dev/ClaudeHistoryMCP/dist/index.js"
    env_required:
      - CLAUDE_HISTORY_CLOUD_TOKEN
    secrets:
      CLAUDE_HISTORY_CLOUD_TOKEN: |
        -----BEGIN AGE ENCRYPTED FILE-----
        EXAMPLE_AGE_BLOB_REPLACE_AT_AUTHORING_TIME
        -----END AGE ENCRYPTED FILE-----
    post: "If you don't have the age key, set CLAUDE_HISTORY_CLOUD_TOKEN manually."
post_install:
  - "Run /standup to test the swarm."
  - "If you used the 'swarm' preset, set up Discord channels per agents/AGENTS.md."
---

# jhammant's boothub profile

This will install:
- **Swarm** (when using `/swarm` preset): 4 named agents (Cortex, Builder, Scholar, Sentinel) with Discord coordination via claw-bridge broker, and cross-session memory via claude-history.
- **Skills**: handoff and standup utilities.
- **Commands**: `/standup`, `/save`.
- **Project context**: a starter `CLAUDE.md` and `AGENTS.md`.

The agent will diff every file before writing. Approve or skip per-bundle.
