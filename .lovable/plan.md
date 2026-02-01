
# Set Default Flipbook Zoom to 175%

## Overview
Change the initial zoom level of the flipbook reader from 100% (1.0) to 175% (1.75) so books open at a more readable size by default.

## Change Required

**File:** `src/pages/FlipbookReader.tsx`

**Current code (line 80):**
```typescript
const [zoom, setZoom] = useState(1);
```

**New code:**
```typescript
const [zoom, setZoom] = useState(1.75);
```

## Technical Details
- The zoom value is a multiplier applied via CSS transform: `style={{ transform: \`scale(${zoom})\` }}`
- Current zoom bounds are 0.5 (50%) minimum and 3.0 (300%) maximum
- The new default of 1.75 is within these bounds
- Users can still adjust zoom using the ZoomIn/ZoomOut buttons in the footer toolbar

## Impact
- All books will now open at 175% zoom by default
- This provides a more readable experience, especially on larger screens
- Users retain full control to zoom in/out as needed
