# Migration Policy

| Rule | Policy |
|------|--------|
| replay migrations | local only |
| production SQL | reviewed only |
| destructive changes | approval required |
| RPC changes | contract update required |
| schema rename | migration + frontend audit |
| grants | mandatory verification |
