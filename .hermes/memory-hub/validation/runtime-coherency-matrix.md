# Runtime Coherency Matrix

| Subsystem | Syntax | Dependency | Replay | Governance | Authority | Overall Status |
|---|---|---|---|---|---|---|
| **Admin Web** | VERIFIED | VERIFIED | UNKNOWN | VERIFIED | VERIFIED | **VERIFIED** |
| **Mobile Core** | VERIFIED | VERIFIED | PARTIAL | VERIFIED | UNKNOWN | **VERIFIED** |
| **Mobile Sync** | VERIFIED | VERIFIED | PARTIAL | UNKNOWN | BROKEN [1] | **DEGRADED** |
| **Migrations** | N/A | VERIFIED | VERIFIED | VERIFIED | VERIFIED | **VERIFIED** |
| **Evals** | VERIFIED | VERIFIED | UNKNOWN | UNKNOWN | VERIFIED | **PARTIAL** |

---

### Definitions
- **VERIFIED**: Directly proven by recent successful console output.
- **PARTIAL**: Some assertions pass, but execution gap exists.
- **UNKNOWN**: Safety rules prohibit current validation toolpath.
- **BROKEN**: Verified semantic absence of critical mechanism.

### System Annotations
[1] **Mobile Sync Authority**: Classified as BROKEN due to the confirmed Absence of Hallucinated Completion logic (Missing `sequenceId` sorting / Missing Lease Expiring). While the code *compiles* and passes syntax checking, the operational authority model is functionally missing the repairs claimed in artifact `.hermes/memory-hub/repairs/runtime-repair-execution-log.md`.
