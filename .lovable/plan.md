

## Fix Admin Login for sottodennis@gmail.com

The user exists in the database with admin role, but the password doesn't match. The auth logs show "Invalid login credentials" errors. This needs a password reset.

---

## Current State

| Field | Value |
|-------|-------|
| Email | sottodennis@gmail.com |
| User ID | 3119691b-c52a-4099-9b75-627187ba9da2 |
| Role | admin |
| Email Confirmed | Yes (2026-01-30) |
| Last Sign In | 2026-02-02 |

---

## Solution

Run a database migration to reset the password to "Denskie123":

```sql
UPDATE auth.users 
SET encrypted_password = crypt('Denskie123', gen_salt('bf')),
    updated_at = NOW()
WHERE email = 'sottodennis@gmail.com';
```

---

## Technical Details

- The `crypt()` function with `gen_salt('bf')` creates a bcrypt-hashed password
- This is the same method Supabase Auth uses internally
- No other changes needed - the user profile and role are correctly configured

---

## After Implementation

You will be able to log in with:
- **Email**: sottodennis@gmail.com
- **Password**: Denskie123

