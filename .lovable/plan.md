
## Clean Up Grade 10 Students

This plan will remove the incorrectly created Grade 9 users from Grade 10 and create the correct Grade 10 student accounts.

---

## Current Situation

| Status | Count | Students |
|--------|-------|----------|
| **Keep** (already correct) | 3 | g10hernandez, g10selose, g10dadula |
| **Delete** (wrong students) | 19 | g10aldave, g10atos, g10ayo, g10bantasan, g10baylen, g10datoy, g10decastro, g10elmaakouri, g10estrebo, g10manacsa, g10mojares, g10nepomuceno, g10orbita, g10paule, g10rabaya, g10sanjose, g10saturay, g10solatorio, g10vista |
| **Create** (new students) | 22 | g10wabie, g10jazo, g10gallenito, g10llames, g10tor, g10quenio, g10pascua, g10quizzagan, g10batomalaque, g10borres, g10arenas, g10cabral, g10tangalin, g10liwanag, g10hebreo, g10hilado, g10sun, g10aquino, g10gatdula, g10arandid, g10asuncion, g10espiritu |

---

## Step 1: Delete Incorrect Users

Remove these 19 users that were incorrectly assigned to Grade 10:
- Aldave, Atos, Ayo, Bantasan, Baylen, Datoy, De Castro, Elmaakouri, Estrebo
- Manacsa, Mojares, Nepomuceno, Orbita, Paule, Rabaya, San Jose, Saturay, Solatorio, Vista

This requires using the Supabase Admin API to delete users from `auth.users` (which will cascade to profiles and roles).

---

## Step 2: Create Correct Grade 10 Users

Create 22 new student accounts using the `bulk-create-students` Edge Function:

| Email | Name |
|-------|------|
| g10wabie@gmail.com | Wabie |
| g10jazo@gmail.com | Jazo |
| g10gallenito@gmail.com | Gallenito |
| g10llames@gmail.com | Llames |
| g10tor@gmail.com | Tor |
| g10quenio@gmail.com | Quenio |
| g10pascua@gmail.com | Pascua |
| g10quizzagan@gmail.com | Quizzagan |
| g10batomalaque@gmail.com | Batomalaque |
| g10borres@gmail.com | Borres |
| g10arenas@gmail.com | Arenas |
| g10cabral@gmail.com | Cabral |
| g10tangalin@gmail.com | Tangalin |
| g10liwanag@gmail.com | Liwanag |
| g10hebreo@gmail.com | Hebreo |
| g10hilado@gmail.com | Hilado |
| g10sun@gmail.com | Sun |
| g10aquino@gmail.com | Aquino |
| g10gatdula@gmail.com | Gatdula |
| g10arandid@gmail.com | Arandid |
| g10asuncion@gmail.com | Asuncion |
| g10espiritu@gmail.com | Espiritu |

---

## Technical Implementation

### Create New Edge Function: `bulk-delete-students`

A new Edge Function is needed to delete users since the Supabase Admin API requires service role access to delete from `auth.users`.

```typescript
// supabase/functions/bulk-delete-students/index.ts
- Accepts array of user IDs to delete
- Verifies caller is admin
- Uses supabaseAdmin.auth.admin.deleteUser() for each user
- Returns success/failure counts
```

### Execution Order

1. Create the `bulk-delete-students` Edge Function
2. Call it to delete the 19 incorrect users
3. Call `bulk-create-students` to create the 22 new correct users

---

## Final Result

After completion, Grade 10 will have 25 students total:
- 3 existing (kept): Hernandez, Selose, Dadula
- 22 new: Wabie, Jazo, Gallenito, Llames, Tor, Quenio, Pascua, Quizzagan, Batomalaque, Borres, Arenas, Cabral, Tangalin, Liwanag, Hebreo, Hilado, Sun, Aquino, Gatdula, Arandid, Asuncion, Espiritu
