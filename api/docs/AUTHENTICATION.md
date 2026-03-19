# Multi-Organization Authentication

## Overview

SyncCore API now supports users with access to multiple organizations. When a user logs in, they receive a list of all organizations they can access, along with their role in each organization.

## Architecture

### Database Tables

**Global Tables** (in `instance_config` database):

1. **users** - Core user information
   ```json
   {
     "id": "uuid",
     "name": "User Name",
     "email": "user@example.com",
     "status": "active",
     "last_login": "2024-01-01T00:00:00Z"
   }
   ```

2. **user_organizations** - Many-to-many relationship
   ```json
   {
     "id": "user_id_org_id",
     "user_id": "uuid",
     "organization_id": "uuid",
     "role": "owner|admin|editor|viewer|api",
     "status": "active|inactive|pending|suspended"
   }
   ```

### User Roles

- **owner** - Full control, can delete organization
- **admin** - Manage users, applications, and configurations
- **editor** - Create and modify resources
- **viewer** - Read-only access
- **api** - API-only access (no UI)

## API Endpoints

### Login

**POST** `/api/auth/login`

Request:
```json
{
  "email": "user@example.com",
  "password": "********"
}
```

Response:
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "organizations": [
    {
      "organization_id": "uuid",
      "organization_name": "Acme Manufacturing",
      "organization_slug": "acme",
      "role": "owner",
      "status": "active",
      "joined_at": "2024-01-01T00:00:00Z"
    },
    {
      "organization_id": "uuid",
      "organization_name": "GlobalTech Industries",
      "organization_slug": "globaltech",
      "role": "admin",
      "status": "active",
      "joined_at": "2024-02-01T00:00:00Z"
    }
  ],
  "token": "jwt_token_here"
}
```

### Get Current User

**GET** `/api/auth/me?user_id={user_id}`

Returns current user with all organization memberships.

Response:
```json
{
  "id": "uuid",
  "name": "User Name",
  "email": "user@example.com",
  "status": "active",
  "organizations": [
    {
      "organization_id": "uuid",
      "organization_name": "Acme Manufacturing",
      "organization_slug": "acme",
      "role": "owner",
      "status": "active",
      "joined_at": "2024-01-01T00:00:00Z"
    }
  ],
  "last_login": "2024-03-01T12:00:00Z"
}
```

### Add User to Organization

**POST** `/api/auth/organizations/{org_id}/members`

Request:
```json
{
  "user_id": "uuid",
  "role": "admin"
}
```

Adds a user to an organization with the specified role.

### Remove User from Organization

**DELETE** `/api/auth/organizations/{org_id}/members/{user_id}`

Removes a user from an organization.

### Update User Role

**PUT** `/api/auth/organizations/{org_id}/members/{user_id}/role`

Request:
```json
{
  "role": "editor"
}
```

Updates a user's role in an organization.

## Usage Examples

### Web Application Flow

1. **User enters email and password**
   ```javascript
   const response = await fetch('/api/auth/login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       email: 'user@example.com',
       password: 'password123'
     })
   });

   const { user_id, organizations, token } = await response.json();
   ```

2. **Display organization selector**
   ```javascript
   // Show list of organizations to user
   organizations.forEach(org => {
     console.log(`${org.organization_name} (${org.role})`);
   });
   ```

3. **User selects an organization**
   ```javascript
   const selectedOrg = organizations[0];
   localStorage.setItem('current_org_id', selectedOrg.organization_id);
   localStorage.setItem('token', token);
   ```

4. **Make API calls scoped to selected organization**
   ```javascript
   const orgId = localStorage.getItem('current_org_id');
   const token = localStorage.getItem('token');

   const apps = await fetch(`/api/organizations/${orgId}/applications`, {
     headers: {
       'Authorization': `Bearer ${token}`
     }
   });
   ```

### Adding a User to Multiple Organizations

```python
import asyncio
from api.database import db

async def add_user_to_orgs():
    # Create user
    user_id = "user-uuid"
    await db.create("users", user_id, {
        "id": user_id,
        "name": "Jane Doe",
        "email": "jane@example.com",
        "status": "active"
    })

    # Add to Organization 1 as owner
    await db.create("user_organizations", f"{user_id}_org1", {
        "user_id": user_id,
        "organization_id": "org1-uuid",
        "role": "owner",
        "status": "active"
    })

    # Add to Organization 2 as viewer
    await db.create("user_organizations", f"{user_id}_org2", {
        "user_id": user_id,
        "organization_id": "org2-uuid",
        "role": "viewer",
        "status": "active"
    })
```

### Checking User Permissions

```python
async def check_permissions(user_id: str, org_id: str) -> str:
    """Get user's role in an organization."""
    memberships, _ = await db.list(
        "user_organizations",
        filter_key="user_id",
        filter_value=user_id
    )

    for membership in memberships:
        if membership["organization_id"] == org_id:
            return membership["role"]

    raise PermissionError("User not member of organization")
```

## Security Considerations

### Current Implementation (Development)

⚠️ **WARNING**: The current implementation is for development/testing only:
- No password hashing
- No JWT token generation
- No rate limiting
- No MFA support

### Production Requirements

For production deployment, implement:

1. **Password Security**
   - Use bcrypt or argon2 for password hashing
   - Enforce strong password policies
   - Implement password reset flow

2. **Token Management**
   - Generate JWT tokens with expiration
   - Implement refresh token mechanism
   - Store tokens securely (httpOnly cookies)

3. **Rate Limiting**
   - Limit login attempts per IP
   - Implement account lockout after failed attempts
   - Add CAPTCHA for suspicious activity

4. **Multi-Factor Authentication**
   - Support TOTP (Google Authenticator, Authy)
   - SMS/email verification codes
   - Backup codes

5. **Audit Logging**
   - Log all login attempts
   - Track organization switches
   - Monitor permission changes

## Testing

Run the authentication test:

```bash
poetry run python api/test/test_auth.py
```

This demonstrates:
- Creating users with multiple organization memberships
- Simulating login and retrieving organizations
- Accessing resources in different organization contexts
- Data isolation between organizations

## Migration from Single-Org

If you have existing users with `organization_id` field:

```python
async def migrate_users():
    """Migrate users to multi-org model."""
    users, _ = await db.list("users", limit=1000)

    for user in users:
        if "organization_id" in user:
            # Create membership record
            membership_id = f"{user['id']}_{user['organization_id']}"
            await db.create("user_organizations", membership_id, {
                "user_id": user["id"],
                "organization_id": user["organization_id"],
                "role": user.get("role", "viewer"),
                "status": "active"
            })
```

## Frontend Integration Example

```typescript
interface Organization {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'api';
  status: string;
}

interface LoginResponse {
  user_id: string;
  email: string;
  name: string;
  organizations: Organization[];
  token?: string;
}

async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  return response.json();
}

// Usage
const { organizations } = await login('user@example.com', 'password');

// Show organization selector
const OrganizationSelector = () => {
  return (
    <select onChange={(e) => switchOrganization(e.target.value)}>
      {organizations.map(org => (
        <option key={org.organization_id} value={org.organization_id}>
          {org.organization_name} ({org.role})
        </option>
      ))}
    </select>
  );
};
```
