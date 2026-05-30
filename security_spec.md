# Security Specification - FamilyHub

## Data Invariants
1. A user can only read and write their own profile in `/users/{userId}`.
2. A family can be read/updated by any of its members.
3. Tasks, Messages, and Moods must belong to a family (relational link via `familyId`).
4. Users can only read Tasks, Messages, and Moods that belong to their family.
5. All IDs must be valid strings (size checks, regex).

## The "Dirty Dozen" Payloads (Denial Tests)
1. Read `/users/someone-else-uid` -> DENIED
2. Write `/users/hUzJWnRKaRcIlEo8eWmkIxGyh3x2` with `isVerified: true` (Shadow Field) -> DENIED
3. Read `/families/family-i-dont-belong-to` -> DENIED
4. Create task in `/tasks` with `familyId` of another family -> DENIED
5. Mass-delete messages you don't own (if owner check is missing) -> DENIED
6. Inject 1MB string into a message content -> DENIED
7. Set `createdAt` to a past date manually -> DENIED
8. Update a message after it has been "locked" (terminal state) -> DENIED
9. Query all tasks without a family filter -> DENIED
10. Spoof `authorId` in a message to be another user's UID -> DENIED
11. Update `familyId` of an existing task to move it to another family -> DENIED
12. Create a mood entry for a date that isn't today -> DENIED

## Conflict Report
| Collection | Identity Spoofing | State Shortcutting | Resource Poisoning |
|------------|-------------------|--------------------|-------------------|
| users      | Blocked (isOwner) | N/A                | Blocked (size)    |
| families   | Blocked (members) | N/A                | Blocked (size)    |
| tasks      | Blocked (isMember)| Blocked (hasOnly)  | Blocked (size)    |
| messages   | Blocked (isAuthor)| N/A                | Blocked (size)    |
| moods      | Blocked (isSelf)  | N/A                | Blocked (size)    |
