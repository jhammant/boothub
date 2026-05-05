---
boothub: 1
profile: jhammant
source: https://github.com/jhammant/boothub-profile
targets:
  - claude-code
  - cursor
summary: "Minimal: a single CLAUDE.md and one slash command."
presets:
  default:
    - project-context
    - commands
bundles:
  - id: project-context
    kind: files
    files:
      - { path: CLAUDE.md, content: "# Project context\n\nWritten by hand for testing." }
  - id: commands
    kind: files
    only-on: claude-code
    files:
      - { path: .claude/commands/hello.md, from: commands/hello.md }
---

# jhammant's lite profile

A minimal profile to validate inline `content:` and `from:` reference resolution.
