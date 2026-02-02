

# Plan: Link Grade 7 Students to MABDC School

## Current Status
All 37 student accounts already exist in the database with:
- Email addresses: g7nieva@gmail.com through g7narciso@gmail.com
- Password: 123456
- Grade Level: 7 (correctly set)
- **school_id: NULL** (needs to be updated)
- **academic_year_id: NULL** (needs to be updated)

## Required Action
Update the `profiles` table to assign these students to MABDC school with the active academic year.

## Database Details
| Field | Value |
|-------|-------|
| MABDC School ID | `15f61d03-8aa8-422a-9faa-afbc8099adce` |
| Active Academic Year | `07d916be-d44f-426f-853d-260bb38e4208` (2026-2027) |
| Total Students | 37 |

## Implementation Steps

### Step 1: Update Profiles
Execute a single SQL UPDATE to assign all 37 students to MABDC:

```sql
UPDATE profiles 
SET 
  school_id = '15f61d03-8aa8-422a-9faa-afbc8099adce',
  academic_year_id = '07d916be-d44f-426f-853d-260bb38e4208'
WHERE email LIKE 'g7%@gmail.com';
```

### Step 2: Verify Update
Query the profiles table to confirm all students now have the correct school and academic year assignments.

## Expected Result
After the update, all 37 Grade 7 students will:
- Be linked to MABDC school
- Be assigned to the 2026-2027 academic year
- Be able to log in and access Grade 7 books for MABDC

