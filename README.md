# Workxpace - eBudgeting System

eBudgeting system with Department-based Budget Plans and Budget Requests.

## Setup

1. Create a PostgreSQL database and set `DATABASE_URL` in `.env`:

   ```
   DATABASE_URL="postgresql://postgres:root@localhost:5432/workxpace?schema=public"
   NEXTAUTH_SECRET="+jkkFzhmquuMxDxGKpL8VQhjZeUGNQ3/1kl97Jwei/M="
   NEXTAUTH_URL="http://localhost:3090"
   ```

2. Run migrations:

   ```bash
   npm run db:migrate
   ```

3. Seed the database:

   ```bash
   npm run seed
   ```

4. Start development:
   ```bash
   npm run dev
   ```

Default admin: `admin@workxpace.com` / `admin123`
