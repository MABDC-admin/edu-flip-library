

## Adjust Flipbook Default Zoom by Device Type

This plan adjusts the flipbook reader's default zoom level based on the user's device:
- **Mobile** (under 768px): **150%** (1.5x)
- **Tablet** (768px - 1023px): **175%** (1.75x)  
- **Desktop** (1024px+): **200%** (2.0x) - current behavior maintained

---

## Implementation

### File: `src/pages/FlipbookReader.tsx`

**Change 1: Dynamic zoom initialization**

The current code sets a static zoom value:
```typescript
const [zoom, setZoom] = useState(2.0);
```

This will be updated to calculate the initial zoom based on screen width:
```typescript
const getInitialZoom = () => {
  if (typeof window === 'undefined') return 1.75;
  const width = window.innerWidth;
  if (width < 768) return 1.5;      // Mobile: 150%
  if (width < 1024) return 1.75;    // Tablet: 175%
  return 2.0;                        // Desktop: 200%
};

const [zoom, setZoom] = useState(getInitialZoom);
```

**Change 2: Handle orientation/resize changes**

Add a resize listener to update zoom when device orientation changes or window is resized (preserving user's manual zoom adjustments):

```typescript
// Track if user has manually changed zoom
const userChangedZoom = useRef(false);

// Update zoom on resize only if user hasn't manually adjusted
useEffect(() => {
  const handleResize = () => {
    if (!userChangedZoom.current) {
      const width = window.innerWidth;
      if (width < 768) setZoom(1.5);
      else if (width < 1024) setZoom(1.75);
      else setZoom(2.0);
    }
  };
  
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

**Change 3: Track manual zoom changes**

Update the zoom controls to mark when user manually adjusts:
```typescript
onZoomIn={() => {
  userChangedZoom.current = true;
  setZoom((z) => Math.min(z + 0.25, 3));
}}
onZoomOut={() => {
  userChangedZoom.current = true;
  setZoom((z) => Math.max(z - 0.25, 0.5));
}}
```

---

## Technical Details

| Device | Breakpoint | Default Zoom |
|--------|------------|--------------|
| Mobile | < 768px | 150% |
| Tablet | 768px - 1023px | 175% |
| Desktop | >= 1024px | 200% |

The implementation uses lazy initialization with `useState(getInitialZoom)` to calculate the correct zoom on first render, avoiding hydration mismatches and ensuring the proper value is set immediately.

