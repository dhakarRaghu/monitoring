# AI Mentor System — Setup Guide

If you need to recreate this system from scratch, follow these steps.

## 1. Database Setup

The system uses Neon Postgres. Create a new project at neon.tech and get the connection URL.

Set it in `.env` and `.env.local`:
```
DATABASE_URL='postgresql://...'
```

## 2. Push Schema

```bash
cd mentor-dashboard
npm install
npx drizzle-kit push
```

This creates all 10 tables from `lib/schema.ts`.

## 3. Seed Data

```bash
npx tsx scripts/seed-achievements.ts
npx tsx scripts/init-profile.ts
```

## 4. Install Claude Code Skills

Copy these files to your Claude Code skills directory:

```bash
cp docs/skill-mentor.md /path/to/.claude/skills/mentor.md
cp docs/skill-review-day.md /path/to/.claude/skills/review-day.md
cp docs/skill-learn-check.md /path/to/.claude/skills/learn-check.md
```

For the verly workspace, the path is:
```
/Users/raghvendradhakar/Desktop/code/verly/.claude/skills/
```

## 5. Set Up Memory

Copy the memory template to your Claude memory directory:
```bash
cp docs/memory-mentor-progress.md ~/.claude/projects/<project-key>/memory/mentor_progress.md
```

Update `MEMORY.md` in the same directory to include:
```
- [Mentor progress](mentor_progress.md) — Developer growth tracking: level, XP, strengths, weaknesses, patterns.
```

## 6. Run the Dashboard

```bash
npm run dev
```

Open http://localhost:3000

## 7. Usage

- During coding: type `/mentor` to get scored and get feedback
- End of day: type `/review-day` for comprehensive daily review
- To test understanding: type `/learn-check`
- View progress: open the dashboard at localhost:3000

## File Reference

| File | Purpose |
|------|---------|
| `docs/skill-mentor.md` | /mentor skill definition |
| `docs/skill-review-day.md` | /review-day skill definition |
| `docs/skill-learn-check.md` | /learn-check skill definition |
| `docs/memory-mentor-progress.md` | Claude memory template for tracking |
| `docs/implementation-plan.md` | Full architecture and design plan |
| `lib/schema.ts` | Database schema (Drizzle ORM) |
| `scripts/seed-achievements.ts` | Seeds 17 achievements into DB |
| `scripts/init-profile.ts` | Creates initial profile record |
