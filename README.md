# 开局 · 桌游群 — frontend

Mobile-first web app for a WeChat boardgame group: see upcoming 局, sign up or join the waitlist, post your own game night or play request. Chinese UI, no framework CSS, built with Vite + React 19 + react-router.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

The dev server proxies `/api` and `/auth` to the backend at `http://localhost:8787` (override with `BACKEND_URL`), so start [`../backend`](../backend) first. Login emails are printed in the backend terminal during development; copy the 6-digit code into the login page.

```bash
npm run check      # tsc + production build → dist/
```

## Pages

| Path | What |
|---|---|
| `/login` | Email → magic link / 6-digit code. Shows a hint inside WeChat's browser. |
| `/onboarding` | First login: your WeChat name (checked against the admin's member list), site nickname. Also the waiting / rejected page while an unlisted name is in the approval queue. |
| `/` | Upcoming 局 with tabs 即将开始 / 我参与的 / 已结束 and a 固定局 / 临时局 filter. |
| `/events/new` | Post a 局: 临时局 (once) or 固定局 (weekly, N weeks). |
| `/events/:id` | Details, participants and waitlist, 报名 / 加入候补 / 退出, 复制分享 text for the group chat. Host: 编辑, 取消, remove a player. |
| `/events/:id/edit` | Host edits one occurrence. |
| `/me` | Profile edit, my upcoming 局, logout. |
| `/admin` | Admins only: approve or reject pending newcomers, paste group members' WeChat names, see who has registered, remove unused names. |

`src/api.ts` is the whole contract with the backend; its types mirror `backend/src/services/*.ts`.

## Deploy

Production: `dist/` is uploaded as Cloudflare Workers static assets by `npm run deploy` in [`../backend`](../backend) (config in `../wrangler.toml`). Alternatively let the Node backend serve `dist/` (`STATIC_DIR`), or host it on any static host and proxy `/api` and `/auth` to the backend from the same origin — the session cookie and the login `Origin` check both assume one origin.
