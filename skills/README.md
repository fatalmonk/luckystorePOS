# Skills Registry — Lucky Store POS

## Installed Skills

| Skill | Purpose | Agent | Status |
|-------|---------|-------|--------|
| token-optimizer | Reduce context size | All | Active |
| frontend-design | UI generation | Claude | Active |
| stitch | Design analysis | Claude | Active |
| figma | Design sync | Claude | Active |

## Skill Usage

Each skill has:
- \`SKILL.md\` — trigger conditions, usage guide
- \`scripts/\` — executable tools
- \`examples/\` — sample outputs

## Auto-Discovery

VibeCoder scans \`skills/\` on startup. To add a new skill:

1. Create \`skills/my-skill/SKILL.md\`
2. Add trigger phrases to \`description:\` field
3. Run \`npm run skills:index\` (if implemented)

## Directory Structure

\`\`\`
skills/
├── README.md (this file)
├── token-optimizer/
│   ├── SKILL.md
│   └── scripts/
├── frontend-design/
│   ├── SKILL.md
│   └── examples/
└── stitch/
    └── SKILL.md
\`\`\`
