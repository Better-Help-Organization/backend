# Usage Guide for `APIFeatures` Class

The `APIFeatures` class is a utility designed to streamline backend querying in a frontend-friendly way. It simplifies operations like filtering, selecting fields, sorting, and pagination. This guide provides examples and explanations for frontend developers to interact effectively with APIs using query parameters.

---

## Query Parameters Supported

Here’s an overview of the query parameters you can use:

- **`fields`**: Select specific fields to return in the response.
- **`filters`**: Apply filters to narrow down the results.
- **`sort`**: Define the sorting order for the results.
- **`take`**: Set the number of results per page (pagination).
- **`page`**: Specify the page number (pagination).

---

## How It Works

### 1. **`fields` Parameter**

The `fields` parameter allows you to select specific fields to include in the response. By default, only fields from the main entity are returned unless explicitly specified.

- **Format**: `field1,field2,relation.field3`
  - To include fields from related entities, use the format `relation.fieldName`.
  - To include all fields from a related entity, use `relation.*`.

- **Examples**:
  - `?fields=id,name` → Returns only `id` and `name` fields from the main entity.
  - `?fields=bookings.id` → Includes the `id` field from the `bookings` relation.
  - `?fields=bookings.*` → Includes all fields from the `bookings` relation.

**Usage Example**:  
```typescript
GET /users?fields=id,name,bookings.id
```

**Result**:  
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "bookings": [
      { "id": 101 },
      { "id": 102 }
    ]
  }
]
```

If no `fields` parameter is provided, only fields from the main entity are included, and no related data is returned by default.

---

### 2. **`filters` Parameter**

The `filters` parameter applies conditions to the query to narrow down the results.
- **Format**: `field=operator=value`
- **Operators Supported**: `=`, `>=`, `<=`, `>`, `<`, `!=`
- **Example**: `?filters=age>=25,profile.city=New York`

**Usage Example**:  
```typescript
GET /users?filters=age>=25,profile.city=New York
```
- **Result**: 
  ```json
  [
    {
      "id": 1,
      "name": "John Doe",
      "age": 30,
      "profile": {
        "city": "New York"
      }
    }
  ]
  ```

---

### 3. **`sort` Parameter**

The `sort` parameter lets you define the sorting order of the results.
- **Format**: `field=order` (`ASC` or `DESC`)
- **Example**: `?sort=name=ASC,age=DESC`

### Breakdown:

- **`name=ASC`**: Sorts users alphabetically by the `name` field in ascending order (A to Z).
- **`age=DESC`**: For users with the same name, sorts them by the `age` field in descending order (largest to smallest).

This means that the users will first be ordered alphabetically by name, and for users with the same name, they will be sorted by age in descending order.


**Usage Example**:  
```typescript
GET /users?sort=name=ASC,age=DESC
```
- **Result**: 
  ```json
  [
    { "id": 2, "name": "Alice", "age": 25 },
    { "id": 1, "name": "John", "age": 30 }
  ]
  ```

---

### 4. **`take` and `page` Parameters**

The `take` parameter specifies how many results to return per page, while `page` specifies the current page number.

- **Defaults**:
  - `take`: 10
  - `page`: 1

- **To Turn Off Pagination**:
  - If you want to override the pagination and return **all results** (no limit), set `take=0`. This will disable the pagination functionality.
  
- **Example**:
  - `?take=5&page=2`: Retrieve 5 items per page, starting from page 2.
  - `?take=0`: Retrieve all items without pagination (disables the `take` limit).
  
---

#### **How It Works**
1. **Pagination with Defaults**:
   If neither `take` nor `page` is specified in the query, the default values will be used (`take=10`, `page=1`).

2. **Pagination with Custom Values**:
   When both `take` and `page` are specified:
   - The server calculates the range of items to return based on the `page` and `take` values.
   - For example, with `take=5` and `page=2`, it fetches results for items 6 to 10.

3. **Disabling Pagination**:
   By setting `take=0`, the server will return **all available items** without applying any pagination logic. This is useful when you want to fetch the entire dataset or disable the pagination functionality.

---

#### **Example URL Queries**

1. **Standard Pagination**:
   - `?take=5&page=2`: Return 5 items per page, starting from the second page.

2. **Fetching All Results** (no pagination):
   - `?take=0`: Fetch all available records without pagination.

**Usage Example**:  
```typescript
GET /users?take=5&page=2
```
- **Result**: 
  ```json
  {
    "data": [
      { "id": 6, "name": "Alice" },
      { "id": 7, "name": "Bob" },
      { "id": 8, "name": "Charlie" },
      { "id": 9, "name": "Dave" },
      { "id": 10, "name": "Eve" }
    ],
    "pagination": {
      "totalItems": 50,
      "totalPages": 10,
      "currentPage": 2,
      "pageSize": 5
    }
  }
  ```

---

## Example API Calls

### Fetch All Users with Filters, Fields, Sorting, and Pagination
```typescript
GET /users?fields=id,name,profile.email&filters=age>=25,profile.city=New York&sort=name=ASC&page=1&take=10
```

**Result**:  
```json
{
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "profile": {
        "email": "john@example.com"
      }
    }
  ],
  "pagination": {
    "totalItems": 1,
    "totalPages": 1,
    "currentPage": 1,
    "pageSize": 10
  }
}
```

---

### Fetch a Single User
To fetch a specific user, use the `getOne` method with their `id`.

**Endpoint**:  
```typescript
GET /users/1?fields=id,name,profile.email
```

**Result**:  
```json
{
  "id": 1,
  "name": "John Doe",
  "profile": {
    "email": "john@example.com"
  }
}
```

---

## Frontend Integration

### Fetch All Users with Axios
```javascript
import axios from 'axios';

async function fetchUsers() {
  const params = {
    fields: 'id,name,profile.email',
    filters: 'age>=25,profile.city=New York',
    sort: 'name=ASC',
    page: 1,
    take: 10,
  };

  const response = await axios.get('/users', { params });
  console.log(response.data);
}
```

### Fetch a Single User with Axios
```javascript
async function fetchUserById(id) {
  const params = {
    fields: 'id,name,profile.email',
  };

  const response = await axios.get(`/users/${id}`, { params });
  console.log(response.data);
}
```

---

## Notes for Frontend Developers

1. **Default Behavior**:
   - If no `fields` are provided, all fields will be returned.
   - Pagination defaults to 10 results per page and starts at page 1.

2. **Error Handling**:
   - Ensure that `fields` for relations like `user.*` are used correctly.
   - Use proper operators (`=`, `>=`, etc.) in the `filters` parameter.

3. **Custom Requirements**:
   - The backend supports dynamic queries, so you can tailor requests as needed without modifying the backend code.

This API structure provides flexibility for building dynamic, user-friendly frontend interfaces.