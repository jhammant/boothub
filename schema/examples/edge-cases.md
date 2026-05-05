---
boothub: 1
profile: edge-cases
source: https://github.com/example/boothub-profile
targets:
  - claude-code
  - cursor
  - codex
  - aider
summary: "Stress-test profile covering hooks, all bundle kinds, and only-on filtering."
presets:
  default:
    - one-file
    - hooks-claude-only
    - mcp-everywhere
  cursor-only:
    - one-file
    - mcp-everywhere
bundles:
  - id: one-file
    kind: files
    files:
      - { path: README.md, content: "hello\n" }
  - id: hooks-claude-only
    kind: hooks
    only-on: claude-code
    hooks:
      - event: PostToolUse
        matcher: "Write|Edit"
        command: "{{PROJECT_ROOT}}/.claude/hooks/format.sh"
    template_vars:
      - PROJECT_ROOT
  - id: mcp-everywhere
    kind: mcp
    mcp:
      claude-code:
        scope: project
        config: { command: "echo", args: ["hi"] }
      cursor:
        config: { command: "echo", args: ["hi"] }
---

# edge-cases profile

Used by tests to validate filter logic, all three bundle kinds, and per-target gating.
