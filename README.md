# Läige

Web app for a home cleaning company: instant price quote, booking of a free arrival time, status check and a password-protected admin view. It runs on Railway and deploys automatically from the `main` branch.

## Railway variables

Set these on the app service:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference to the Railway PostgreSQL database) |
| `ADMIN_PASSWORD` | Password for `/admin` |

On every deploy the app applies migrations, reads the Excel files in `data/` into the database and starts. To change prices, areas, FAQ or the schedule, edit the Excel file and push.

## Checks that need no database

```bash
npm test
```

```bash
npm run check:data
```

```bash
npm run build
```
