# intaker-test-web

A React-based project management frontend with sprint boards, task tracking, team management, and role-based access control.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React 18 |
| Language | TypeScript 5 |
| Build tool | Vite 5 (SWC compiler via `@vitejs/plugin-react-swc`) |
| UI components | shadcn/ui (Radix UI primitives + Tailwind CSS) |
| Styling | Tailwind CSS v3 + `tailwindcss-animate` |

## Prerequisites

- Node.js >= 18
- npm >= 9

## Getting started

```sh
# Install dependencies
npm install

# Start the dev server (http://localhost:8080)
npm run dev
```

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with HMR on port 8080 |
| `npm run build` | Production build (output: `dist/`) |
| `npm run build:dev` | Development build (unminified) |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |

## Project structure

```
src/
├── components/       # Shared UI components
│   └── ui/           # Auto-generated shadcn/ui primitives
├── contexts/         # React context providers (AuthContext)
├── hooks/            # Custom hooks
├── lib/
│   ├── api.ts        # All API calls (typed fetch wrapper)
│   └── utils.ts      # Utility helpers (cn, etc.)
├── pages/            # Route-level page components
├── test/             # Vitest setup and test files
└── config.ts         # App-level config (API base URL)
```

## API configuration

The backend URL is set in `src/config.ts`:

```ts
export const API_BASE_URL = "https://your-api-url.example.com";
```

Update this value to point at your backend before running locally. The API client (`src/lib/api.ts`) attaches a `Bearer` token from `localStorage` automatically on every request and redirects to `/login` on `401`.

## Authentication

Auth state is managed via `AuthContext` (`src/contexts/AuthContext.tsx`). On login, the token and user metadata are persisted to `localStorage`. Roles are stored in lowercase (`admin`, `user`, etc.) and can be used to gate UI sections.

## Path aliases

`@/` maps to `src/` — configured in both `vite.config.ts` and `tsconfig.app.json`.

```ts
import { apiRequest } from "@/lib/api";
```

## Adding shadcn/ui components

```sh
npx shadcn@latest add <component-name>
```

Components are added to `src/components/ui/`.
