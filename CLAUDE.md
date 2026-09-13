# frontend — agent notes

This repo is one third of the 开局 site. The whole-site guide, conventions and skills live one level up in the `site` deploy repo:

@../CLAUDE.md

Skills (read by path when Claude was started here rather than in `site/`): `../.claude/skills/site-dev`, `site-feature`, `site-deploy`, `site-debug`, `site-review` (each has a `SKILL.md`).

## Repo-specific
- `src/api.ts` is the entire backend contract: types mirror `../backend/src/services/*.ts`; all URLs live in the `api` object. Change it together with the backend.
- `src/session.tsx` owns login/profile/admin state and the `RequireMember` / `RequireUser` guards; `main.tsx` wires routes.
- Styling is one file, `src/styles.css`, with CSS variables; reuse `.card`, `.banner.{info,ok,warn,error}`, `.btn.{primary,secondary,danger,small,block}`, `.badge.*`, `.field`, `.people`, `.facts`. Test at 375px.
- Dates only through `src/format.ts`.
- `index.html` carries the Google tag, guarded to the `juer.now` hostname; keep the guard.
- No unit tests yet (see `../BACKLOG.md`); `npm run check` = tsc + build. The build output `dist/` is what the backend's deploy script uploads.
