# Acknowledgment Ambiguity Results

## Objective
To classify and log acknowledgment ambiguity states during replay.

## Implemented States & Behaviors

### 1. `_AcknowledgmentStatus.confirmed`
- **Trigger**: Successful RPC call completion with `status: SAFE` or `status: ADJUSTED`.
- **Action**: Transaction state set to `synced`. Lease released. Audit log entry created.

### 2. `_AcknowledgmentStatus.unknown`
- **Trigger**: Generic catch-all exception during RPC attempt (e.g., network timeout before receiving response, unexpected error format).
- **Action**: Transaction state reset to `pending`. Lease remains active but lease expiration logic will eventually reset it. New `sequenceId` NOT assigned. Audit log entry created with generic error message.

### 3. `_AcknowledgmentStatus.timeout`
- **Trigger**: RPC call exceeds predefined timeout threshold (currently implicit, defined by Supabase client).
- **Action**: Transaction state reset to `pending`. Lease expires and resets to `pending`. Audit log entry created.

### 4. `_AcknowledgmentStatus.rejected`
- **Trigger**: RPC returns `status: REJECTED`.
- **Action**: Transaction state set to `conflict`. `requiresManagerReview` set to `true`. Lease released. Audit log entry created.

### 5. `_AcknowledgmentStatus.conflict`
- **Trigger**: RPC returns `status: CONFLICT`.
- **Action**: Transaction state set to `conflict`. `requiresManagerReview` set to `true`. Lease released. Audit log entry created.

## Current Gaps & Future Considerations
- **Lease Owner for Timeout/Unknown**: The current implementation relies on lease expiration to reset `unknown`/`timeout` states. A more explicit "lease invalidation authority" could be beneficial.
- **Granularity of "unknown"**: This state is broad. Future refinement might distinguish network vs. serialization errors.
