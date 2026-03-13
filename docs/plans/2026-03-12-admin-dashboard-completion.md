# Admin Dashboard Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Finish the remaining admin dashboard domains so every planned surface is an interactive operator workspace rather than a read-only dashboard.

**Architecture:** Keep the existing Astro admin shell and control-plane model, but extend the durable state with domain-specific records, resource mutation APIs, and synchronous job-processing primitives that simulate the approval/export pipeline without introducing a separate worker service. Reuse the signed-cookie auth, CSRF, and idempotency model already in place.

**Tech Stack:** Astro server routes, Node `node:sqlite`, plain Astro components, signed cookie auth, unit tests with `node:test`.

---

### Task 1: Lock the missing contracts with failing tests

**Files:**
- Modify: `C:\Users\Romanchello\source\repo\mcp-tool-shop\.worktrees\admin-dashboard\tests\unit\admin-control-plane.test.mjs`
- Modify: `C:\Users\Romanchello\source\repo\mcp-tool-shop\.worktrees\admin-dashboard\tests\unit\admin-site-contract.test.mjs`

**Steps:**
1. Add failing tests for catalog, moderation, promotions, quality, ops, and telemetry workspaces.
2. Add failing tests for the missing mutation APIs and job/notification pipeline mechanics.
3. Run only the new admin tests and confirm they fail for the intended reasons.

### Task 2: Extend the control plane for the remaining mutable domains

**Files:**
- Modify: `C:\Users\Romanchello\source\repo\mcp-tool-shop\.worktrees\admin-dashboard\site\src\lib\admin\control-plane.mjs`
- Modify: `C:\Users\Romanchello\source\repo\mcp-tool-shop\.worktrees\admin-dashboard\site\src\lib\admin\store.mjs`
- Modify: `C:\Users\Romanchello\source\repo\mcp-tool-shop\.worktrees\admin-dashboard\site\src\lib\admin\migrations\001_admin_control_plane.sql`

**Steps:**
1. Add durable collections for catalog drafts, notifications, and telemetry notes.
2. Add helper functions for staging tool edits, moderation updates, campaign edits, finding remediation, job processing, and telemetry annotation.
3. Add staged pipeline transitions for validate, preview, queue, process, verify, and publish receipt.
4. Re-run focused admin control-plane tests until green.

### Task 3: Add resource mutation APIs

**Files:**
- Modify: `C:\Users\Romanchello\source\repo\mcp-tool-shop\.worktrees\admin-dashboard\site\src\pages\api\admin\tools.ts`
- Modify: `C:\Users\Romanchello\source\repo\mcp-tool-shop\.worktrees\admin-dashboard\site\src\pages\api\admin\overrides.ts`
- Modify: `C:\Users\Romanchello\source\repo\mcp-tool-shop\.worktrees\admin-dashboard\site\src\pages\api\admin\promotions.ts`
- Modify: `C:\Users\Romanchello\source\repo\mcp-tool-shop\.worktrees\admin-dashboard\site\src\pages\api\admin\audit\findings.ts`
- Modify: `C:\Users\Romanchello\source\repo\mcp-tool-shop\.worktrees\admin-dashboard\site\src\pages\api\admin\jobs.ts`
- Modify: `C:\Users\Romanchello\source\repo\mcp-tool-shop\.worktrees\admin-dashboard\site\src\pages\api\admin\telemetry.ts`
- Create: `C:\Users\Romanchello\source\repo\mcp-tool-shop\.worktrees\admin-dashboard\site\src\pages\api\admin\notifications.ts`

**Steps:**
1. Keep `GET` behavior intact.
2. Add state-changing handlers with capability checks and CSRF validation.
3. Return normalized JSON envelopes for the new mutation flows.
4. Run focused API contract tests.

### Task 4: Implement the remaining interactive workspaces

**Files:**
- Create/Modify files under `C:\Users\Romanchello\source\repo\mcp-tool-shop\.worktrees\admin-dashboard\site\src\components\admin\`
- Modify: `C:\Users\Romanchello\source\repo\mcp-tool-shop\.worktrees\admin-dashboard\site\src\pages\admin\catalog\index.astro`
- Modify: `C:\Users\Romanchello\source\repo\mcp-tool-shop\.worktrees\admin-dashboard\site\src\pages\admin\moderation\index.astro`
- Modify: `C:\Users\Romanchello\source\repo\mcp-tool-shop\.worktrees\admin-dashboard\site\src\pages\admin\promotions\index.astro`
- Modify: `C:\Users\Romanchello\source\repo\mcp-tool-shop\.worktrees\admin-dashboard\site\src\pages\admin\quality\index.astro`
- Modify: `C:\Users\Romanchello\source\repo\mcp-tool-shop\.worktrees\admin-dashboard\site\src\pages\admin\ops\index.astro`
- Modify: `C:\Users\Romanchello\source\repo\mcp-tool-shop\.worktrees\admin-dashboard\site\src\pages\admin\telemetry\index.astro`
- Modify: `C:\Users\Romanchello\source\repo\mcp-tool-shop\.worktrees\admin-dashboard\site\src\components\admin\AdminClientRuntime.astro`

**Steps:**
1. Build interactive forms and worklists for each remaining domain.
2. Wire them to the new APIs using the shared client runtime.
3. Keep role gating visible in the UI, not just enforced on the backend.
4. Re-run the admin site contract tests.

### Task 5: Finish verification

**Files:**
- None

**Steps:**
1. Run `node --test tests/unit/admin-control-plane.test.mjs tests/unit/admin-site-contract.test.mjs`.
2. Run `npm --prefix site run build`.
3. Run `npm test`.
4. Run `npm run test:invariants`.
5. Review the diff and confirm no unintentional files were created.
