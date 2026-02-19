# Default / seed users

The API has **no users** until you run the database seed. The error `"User not found"` means the email you used is not in the database.

## Create default users (run seed)

From the **project root** (Centre-Labs-main):

```bash
./dev-db.sh seed
```

Or from `nodejs-api`:

```bash
cd nodejs-api
npm run seed
```

**Note:** The seed script wipes and recreates a lot of data (users, orders, products, etc.). Use it only on a dev database.

---

## Default logins after seeding

Use these for **Admin login** (admin panel):

| Role    | Email               | Password      |
|---------|---------------------|---------------|
| Admin   | `admin@example.com` | `SecurePass123!` |
| Manager | `manager@example.com` | `SecurePass123!` |
| Staff   | `staff@example.com` | `SecurePass123!` |

- **Admin:** full access (users, customers, products, orders, payments, shipping, analytics, settings).
- **Manager:** create/read/update on customers, products, orders, payments, shipping, analytics.
- **Staff:** read/update on customers, products, orders.

There are no default **customer** accounts in the seed; use the signup flow to create one if you need to test the customer portal.
