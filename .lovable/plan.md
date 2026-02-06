

## Plan: Re-enable Login Requirement for Bookshelf

### Overview
Restore the authentication requirement on the bookshelf page so only logged-in users can access books. Unauthenticated users will be redirected to the login page.

---

### Implementation Steps

**Step 1: Restore Auth Redirect in Bookshelf.tsx**
- Uncomment the `useEffect` import
- Uncomment and restore the auth check that redirects unauthenticated users to `/auth`
- Keep the teacher redirect logic (teachers go to `/teacher` dashboard)

**Step 2: Restore User Dependency in useBooks Hook**
- Re-import `useAuth` from the auth context
- Add back `enabled: !!user` to the query so it only runs when a user is authenticated
- This prevents unnecessary API calls for unauthenticated visitors

**Step 3: Update Loading State in Bookshelf.tsx**
- Adjust the loading check to show spinner during auth loading for all visitors (not just authenticated users)

---

### Technical Details

**Bookshelf.tsx changes:**
```typescript
import { useEffect } from 'react'; // Uncomment

// Restore auth redirect
useEffect(() => {
  if (!authLoading && !user) {
    navigate('/auth', { replace: true });
  } else if (!authLoading && user && isTeacher && !isAdmin) {
    navigate('/teacher', { replace: true });
  }
}, [authLoading, user, isTeacher, isAdmin, navigate]);

// Update loading check
if (authLoading) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}
```

**useBooks.ts changes:**
```typescript
import { useAuth } from '@/contexts/AuthContext';

export function useBooks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['books'],
    queryFn: async (): Promise<BookWithProgress[]> => {
      // ... existing fetch logic
    },
    enabled: !!user, // Only fetch when authenticated
  });
}
```

---

### Notes
- The public read RLS policy on books can remain in place (it doesn't affect security since the frontend will redirect)
- FlipbookReader also lacks auth protection, but it currently relies on book data which requires auth - you may want to add explicit protection there too

