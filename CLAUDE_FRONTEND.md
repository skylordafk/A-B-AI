# Frontend Development - Autonomous Experiment

## Mission

Execute complete frontend refactor autonomously over multiple days/weeks while coordinating with parallel backend instance.

## Role & Identity

I am the **Frontend Developer** responsible for:

- All files in `apps/ui/src/`
- UI components, routes, and state management
- User experience and interface design
- Frontend state migration from contexts to Zustand

## Key Documents

- **Full Specification**: `frontend_spec.md`
- **Coordination**: `INTEGRATION_STATUS.md`
- **Shared Types**: `shared/types/index.ts` (Backend creates this)
- **Backend Spec**: `backend_spec.md` (for reference only)

## Critical Success Factors

1. **Wait for backend dependencies** - Cannot start without shared types and stub IPC
2. **Test IPC connection early** - Ensure backend integration works
3. **Update INTEGRATION_STATUS.md daily** - Essential for coordination
4. **Never touch `apps/main/src/` files** - Backend team owns this

## Current Status

- **Phase**: Waiting for Dependencies
- **Next Action**: Check if shared/types/index.ts exists
- **Blocker**: Need backend to create shared types and stub IPC
- **Last Update**: [UPDATE WHEN WORKING]

## Dependency Checklist

**MUST COMPLETE BEFORE STARTING:**

- [ ] Backend creates `shared/types/index.ts`
- [ ] Backend creates stub IPC handler
- [ ] INTEGRATION_STATUS.md shows "✅ Stub IPC ready"
- [ ] Test: `npm run dev` shows "STUB IPC" logs in console

## Phase Checklist

### Phase 1: API Client Wrapper

- [ ] Create `apps/ui/src/lib/api/client.ts`
- [ ] Add proper error handling with APIError class
- [ ] Test connection to backend stub IPC
- [ ] Create convenience methods for all endpoints
- [ ] Update INTEGRATION_STATUS.md: "✅ API client working"

### Phase 2: Zustand State Management

- [ ] Install Zustand and dependencies
- [ ] Create `projectStore.ts` with all state and actions
- [ ] Replace context providers in App.tsx
- [ ] Migrate all components to use useProjectStore
- [ ] Delete old context files
- [ ] Test state management works with backend

### Phase 3: Batch Workflow Enhancement

- [ ] Refactor Batch route to use SpreadsheetEditor primarily
- [ ] Add output columns for batch results
- [ ] Implement real-time result updates
- [ ] Add import/export functionality
- [ ] Create status indicators for processing states

### Phase 4: Unified Dashboard

- [ ] Create Dashboard route component
- [ ] Build ActivityHistory component (merge chat/batch history)
- [ ] Create CostSummaryCard component
- [ ] Add QuickActions component
- [ ] Test dashboard with real project data

### Phase 5: Advanced Features UI

- [ ] Add JSON mode controls to ChatPage
- [ ] Implement JSON schema validation
- [ ] Add native batch API toggle to Batch route
- [ ] Test advanced features with backend
- [ ] Ensure error handling for edge cases

### Phase 6: Three-Pane Layout

- [ ] Implement new layout structure in App.tsx
- [ ] Create LeftSidebar with navigation
- [ ] Create ContextSidebar with dynamic content
- [ ] Update routing for new layout
- [ ] Test responsive design and user experience

## Daily Workflow

1. **Start**: Pull latest, check INTEGRATION_STATUS.md for backend updates
2. **Dependency Check**: Verify backend dependencies are ready
3. **Work**: Focus on current phase tasks
4. **Update**: Commit progress, update status every 2-3 hours
5. **End**: Document next day's plan and any blockers

## Autonomous Guidelines

- Check dependencies before starting each day
- Work through phases sequentially
- Self-validate at each checkpoint
- Problem-solve independently for 30+ minutes before escalating
- Use mock data if backend is temporarily unavailable
- Document all issues and workarounds

## Integration Points

- **Depends on Backend**: Shared types, IPC endpoints, model data
- **Provides to Backend**: UI feedback, integration test cases
- **Coordination**: Via INTEGRATION_STATUS.md updates

## Backup Plans

If backend is delayed:

1. Work with mock data where possible
2. Focus on UI components that don't need backend
3. Prepare for rapid integration when backend is ready
4. Document assumptions for later validation

## Emergency Protocol

If blocked for >2 hours:

1. Document clearly in INTEGRATION_STATUS.md
2. Work on non-blocking tasks (UI components, styling)
3. Create mocks for missing backend functionality
4. Only escalate if completely unable to proceed
