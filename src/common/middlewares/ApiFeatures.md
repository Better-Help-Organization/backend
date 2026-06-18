# Usage Guide for `APIFeatures`

`APIFeatures` builds dynamic TypeORM queries from request query params.

Supported params:

- `fields`
- `filters`
- `sort`
- `take`
- `page`
- `ids`

---

## `fields`

Use `fields` to explicitly select root and relation fields.

Format:

- root field: `id`
- single relation field: `therapist.firstName`
- deep nested field: `client.activeSubscription.subscription.type`
- relation wildcard: `therapist.*`
- deep relation wildcard: `client.activeSubscription.subscription.modal.*`

Examples:

```text
?fields=id,schedule,type
?fields=id,therapist.id,therapist.firstName
?fields=id,client.activeSubscription.subscription.type
?fields=id,subscription.modal.*,subscription.level.*
```

Important behavior:

- nested dotted paths are supported to any practical depth
- only the final relation segment is expanded by `*`
- root `id` is always added if omitted
- root `*` is not supported; list root fields explicitly
- parent relations should usually also be selected for reliable nested hydration

Safer nested example:

```text
?fields=id,therapist.*,therapist.expertise.*
```

Instead of only:

```text
?fields=id,therapist.expertise.*
```

Example:

```text
GET /sessions?fields=id,schedule,therapist.*,therapist.expertise.*
```

---

## `filters`

Use `filters` to narrow results.

Format:

```text
field operator value
```

Supported operators:

- `=` contains match for strings
- `:=` exact match
- `!=`
- `>`
- `>=`
- `<`
- `<=`

Examples:

```text
?filters=firstName=jo
?filters=status:=active
?filters=price>=1000
?filters=level.type:=associate
?filters=deletedAt=null
?filters=deletedAt=!null
```

Nested filters are supported:

```text
?filters=client.activeSubscription.subscription.type:=1
```

OR groups are supported with `(...)` and `|`:

```text
?filters=(status:=active|status:=pending),price>=1000
```

Date behavior:

- `YYYY-MM-DD` is treated as a whole-day range
- full ISO timestamps are compared directly

Distinct helper:

```text
?filters=therapist.id:=123,@distinct
```

Inline distinct on a field:

```text
?filters=therapist.id:=123@distinct
```

---

## `sort`

Use `sort` to order results.

Format:

```text
?sort=createdAt=DESC
?sort=firstName=ASC,createdAt=DESC
```

Current limitation:

- sorting currently assumes root entity fields
- nested sorts like `therapist.firstName=ASC` are not supported yet

---

## `take` and `page`

Pagination defaults:

- `take=10`
- `page=1`

Examples:

```text
?take=20&page=2
```

Disable pagination:

```text
?take=0
```

Notes:

- `take=0` returns all matching rows
- pagination on heavy joined collection queries can still be expensive

---

## `ids`

Filter by multiple root ids:

```text
?ids=id1,id2,id3
```

This adds:

```sql
WHERE <root>.id IN (...)
```

---

## Real Examples

### Session

```text
GET /sessions?fields=id,schedule,duration,type,approvalStatus,commonId,therapist.*,therapist.expertise.*,paymentPeriod.id&filters=approvalStatus:=confirmed&sort=schedule=ASC&page=1&take=10
```

### Subscription

```text
GET /subscription?fields=id,type,price,old_price,is_admin_created,modal.*,level.*&filters=is_admin_created:=true&take=0
```

### Client

```text
GET /clients?fields=id,firstName,lastName,activeSubscription.*,activeSubscription.subscription.*,activeSubscription.subscription.modal.*,activeSubscription.subscription.level.*
```

### Chat

```text
GET /chat?fields=id,groupName,closed,lastMessage.*,lastMessage.client.*,lastMessage.therapist.*
```

---

## Caveats

- no automatic eager relation expansion should be relied on here
- joined relations used only for filtering are joined without being selected
- deep `OneToMany` / `ManyToMany` wildcards can still create very heavy queries
- nested relation hydration is more reliable when each parent relation is also selected with `.*`
- `getMany()` runs both `getMany()` and `getCount()`, so complex joins can make requests slower

---

## Notes for Frontend Developers

1. **Default Behavior**:
   - Pagination defaults to `take=10` and `page=1`.
   - If `fields` is omitted, the response shape depends on the root query and entity relation loading. Use `fields` explicitly when you need a stable response shape.

2. **Fields and Relations**:
   - Deep nested relation paths are supported, such as `therapist.expertise.*` or `activeSubscription.subscription.modal.*`.
   - For reliable nested hydration, also include the parent relation when selecting nested relations.

3. **Filters**:
   - Supported operators include `=`, `:=`, `!=`, `>`, `>=`, `<`, `<=`, plus `null` / `!null` handling.
   - Nested relation filters and OR groups are also supported.

4. **Performance**:
   - Prefer explicit `fields` instead of broad relation wildcards when possible.
   - Deep `OneToMany` and `ManyToMany` selections can still produce heavy queries and large payloads.


## Frontend Example

```javascript
import axios from 'axios';

async function fetchSessions() {
  const params = {
    fields: 'id,schedule,therapist.*,therapist.expertise.*',
    filters: 'approvalStatus:=confirmed',
    sort: 'schedule=ASC',
    page: 1,
    take: 10,
  };

  const response = await axios.get('/sessions', { params });
  console.log(response.data);
}
```

