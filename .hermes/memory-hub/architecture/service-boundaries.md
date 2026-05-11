# LuckyStorePOS Service Boundaries

## Service Boundary Overview

LuckyStorePOS is organized into distinct service boundaries with clear responsibilities and interfaces. Each boundary encapsulates specific functionality and communicates through well-defined contracts.

## Primary Service Boundaries

### 1. Mobile POS Service
**Location**: `apps/mobile_app/`

**Responsibilities**:
- Sales transaction processing
- Inventory lookup and management
- Customer management
- Barcode scanning
- Label printing
- Offline operation queueing
- Data synchronization

**Interfaces**:
- **In**: User input (touch, barcode scanner, camera)
- **Out**: Supabase RPC calls, offline queue writes
- **Storage**: Local SQLite database

**Boundary Rules**:
- All mutations go through offline queue when offline
- Reads优先从本地数据库，fallback to Supabase
- Sync operations are idempotent
- No direct table writes - use RPC functions

**Critical Path**: Sales → Offline Queue → Sync → Supabase

### 2. Admin Dashboard Service
**Location**: `apps/admin_web/`

**Responsibilities**:
- Business analytics and reporting
- Inventory management
- Product catalog management
- Sales history and analysis
- Purchase and expense tracking
- Customer/supplier ledger management
- System configuration

**Interfaces**:
- **In**: User input (web forms, filters)
- **Out**: Supabase RPC calls, real-time subscriptions
- **Storage**: Browser cache, Supabase

**Boundary Rules**:
- All data access through RPC functions
- No direct table queries
- Real-time updates via Supabase subscriptions
- Read-only for critical operational data

**Critical Path**: User Action → RPC Call → PostgreSQL → Response

### 3. Supabase Backend Service
**Location**: `supabase/`

**Responsibilities**:
- Data persistence and retrieval
- Authentication and authorization
- Business logic enforcement (via RPC)
- Real-time data synchronization
- Row-level security enforcement

**Interfaces**:
- **In**: RPC calls, REST API requests, WebSocket subscriptions
- **Out**: Query results, real-time events
- **Storage**: PostgreSQL database

**Boundary Rules**:
- All mutations through RPC functions
- RLS policies enforce data boundaries
- Idempotent operations where possible
- SERIALIZABLE transaction isolation

**Critical Path**: RPC Request → Validation → Transaction → Commit → Response

### 4. Migration Replay Service
**Location**: `infra/migration-replay/`

**Responsibilities**:
- Schema validation and replay
- Migration dependency tracking
- Governance enforcement
- Schema snapshot generation
- Replay failure detection

**Interfaces**:
- **In**: Migration files, governance rules
- **Out**: Validation reports, dependency graphs
- **Storage**: Artifacts directory

**Boundary Rules**:
- Read-only analysis of migrations
- No direct schema modification
- Deterministic replay execution
- Governance rule validation

**Critical Path**: Migration Parse → Dependency Build → Replay → Validation → Report

### 5. Governance Service
**Location**: `scripts/governance/`

**Responsibilities**:
- Architectural rule enforcement
- Migration ownership tracking
- Baseline validation
- Governance violation detection

**Interfaces**:
- **In**: Migration files, baseline definitions
- **Out**: Governance reports, violation alerts
- **Storage**: Baseline JSON files

**Boundary Rules**:
- Read-only analysis
- No automatic fixes
- Explicit approval required for violations
- Baseline-driven validation

**Critical Path**: Migration Scan → Rule Check → Baseline Compare → Report

### 6. Distributed Eval Service
**Location**: `evals/distributed/`

**Responsibilities**:
- Chaos testing
- Reconciliation validation
- Deterministic testing
- Failure mode simulation

**Interfaces**:
- **In**: Test configurations, chaos scenarios
- **Out**: Test results, failure reports
- **Storage**: Test artifacts

**Boundary Rules**:
- Isolated test environments
- No production data mutation
- Deterministic test execution
- Reproducible failure scenarios

**Critical Path**: Test Setup → Chaos Injection → System Execution → Validation → Report

## Cross-Boundary Communication

### Synchronous Communication
```
Mobile POS → Supabase RPC → PostgreSQL
Admin Web → Supabase RPC → PostgreSQL
```

### Asynchronous Communication
```
Mobile POS → Offline Queue → Sync Engine → Supabase
Supabase → Realtime → Admin Web (subscriptions)
```

### Batch Communication
```
Migration Replay → Multiple Migrations → Validation Report
Distributed Eval → Multiple Tests → Aggregate Results
```

## Boundary Contracts

### Mobile POS ↔ Supabase Contract
**Protocol**: Supabase Client SDK
**Authentication**: JWT tokens
**Data Format**: JSON
**Error Handling**: Retry with exponential backoff
**Idempotency**: Operation IDs for deduplication

### Admin Web ↔ Supabase Contract
**Protocol**: Supabase Client SDK
**Authentication**: JWT tokens
**Data Format**: JSON
**Error Handling**: User-facing error messages
**Idempotency**: Not required (read-mostly)

### Migration Replay ↔ Supabase Contract
**Protocol**: psql CLI
**Authentication**: Service role key
**Data Format**: SQL
**Error Handling**: Immediate failure, detailed reporting
**Idempotency**: Required for replay

### Governance ↔ Migration Replay Contract
**Protocol**: File system
**Authentication**: N/A (local)
**Data Format**: JSON, SQL
**Error Handling**: Validation failure, halt execution
**Idempotency**: Required

## Boundary Violations

### Forbidden Crossings
- **Direct Table Access**: Admin Web must use RPC functions
- **Bypassing Offline Queue**: Mobile POS must queue offline operations
- **Skipping Governance**: Migrations must pass governance checks
- **Direct Schema Mutation**: No direct SQL execution without migration
- **Production Data in Tests**: Eval must use isolated test data

### Allowed Crossings
- **Emergency Fixes**: With explicit approval and rollback plan
- **Debugging**: Read-only access with audit trail
- **Migration Repairs**: With governance approval and replay verification

## Boundary Ownership

| Boundary | Owner | Review Required |
|----------|-------|-----------------|
| Mobile POS | Mobile Team | Yes for mutations |
| Admin Web | Admin Team | Yes for mutations |
| Supabase Backend | Backend Team | Always |
| Migration Replay | Infra Team | Always |
| Governance | Architecture Team | Always |
| Distributed Eval | QA Team | Yes for test changes |

## Boundary Evolution

### Stable Boundaries
- Supabase Backend (core data layer)
- Migration Replay (infrastructure)
- Governance (architectural rules)

### Evolving Boundaries
- Mobile POS (feature additions)
- Admin Web (feature additions)
- Distributed Eval (test scenarios)

### New Boundaries (Potential)
- Analytics Service (separate from admin)
- Notification Service (push, email, SMS)
- Integration Service (third-party APIs)

## Boundary Testing

### Unit Testing
- Test each boundary in isolation
- Mock external dependencies
- Verify boundary contracts

### Integration Testing
- Test boundary-to-boundary communication
- Verify error handling
- Test idempotency

### Chaos Testing
- Simulate boundary failures
- Test recovery procedures
- Verify fallback behavior

## Boundary Monitoring

### Key Metrics
- **Mobile POS**: Sync success rate, queue depth, offline duration
- **Admin Web**: RPC latency, error rate, subscription lag
- **Supabase**: Query performance, connection pool, transaction rate
- **Migration Replay**: Replay success rate, validation time
- **Governance**: Violation count, approval rate
- **Distributed Eval**: Test pass rate, failure detection

### Alerting
- **Critical**: Boundary down, data loss, security violation
- **Warning**: High latency, queue buildup, governance violation
- **Info**: Boundary performance, test results

## Boundary Security

### Authentication
- Mobile POS: Supabase Auth (user JWT)
- Admin Web: Supabase Auth (admin JWT)
- Supabase: Service role for migrations
- Migration Replay: Service role for replay
- Governance: Local execution (no auth)
- Distributed Eval: Test credentials

### Authorization
- RLS policies for all data access
- Role-based access control
- Tenant isolation
- Store-level scoping

### Audit Trail
- All mutations logged
- Boundary crossings tracked
- Governance violations recorded
- Test results archived