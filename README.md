<<<<<<< HEAD
# AI-Powered Personalized Learning Path Generator

Full-stack application: **FastAPI** + **MongoDB** (Motor) + **Redis** + **React (Vite)** with **scikit-learn** recommendation/path logic, **JWT auth**, **admin panel**, **AI mentor** (OpenAI optional), **YouTube** enrichment, **PDF reports**, **Docker Compose**, and **GitHub Actions** CI.

## Repository layout

| Path | Purpose |
|------|---------|
| `Backend/` | FastAPI app, Motor/Mongo persistence, services, REST APIs |
| `frontend/` | React + Vite + Tailwind + Recharts + Framer Motion |
| `ml/` | Synthetic dataset script, sklearn baseline trainer, RL stub |
| `docker/` | `docker-compose.yml` (MongoDB, Redis, API, web, Nginx) |
| `nginx/` | Reverse proxy config for unified `8080` entry |
| `scripts/` | Database seed |
| `postman/` | Postman collection |
| `database/` | Notes (MongoDB collections / indexes) |

## Quick start (local, no Docker)

### 1. MongoDB & Redis

- **MongoDB** on `localhost:27017` (default). Database name from `MONGODB_DB_NAME` (default `learning`).
- **Redis** on `localhost:6379` (optional; caching is disabled if unavailable).

### 2. Backend

```powershell
cd Backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirement.txt
copy .env.example .env
# Edit .env: MONGODB_URL, MONGODB_DB_NAME, SECRET_KEY, optional OPENAI_API_KEY / YOUTUBE_API_KEY / SMTP_*
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Example:

- `MONGODB_URL=mongodb://127.0.0.1:27017`
- `MONGODB_DB_NAME=learning`

### 3. Seed demo users

With MongoDB running:

```powershell
cd k:\Cynosure
python scripts\seed_db.py
```

Creates:

- `admin@example.com` / `Admin123!` (admin)
- `learner@example.com` / `Learner123!` (learner)

### 4. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The dev server proxies `/api` to the backend on port `8000`.

Optional: set `VITE_API_URL=/api` (default) or a full API URL in `frontend/.env`.

## Docker Compose (full stack)

From repo root:

```powershell
cd docker
docker compose up --build
```

- **Nginx (all-in-one):** `http://localhost:8080` — UI + `/api/v1/*` to API  
- **API direct:** `http://localhost:8000`  
- **MongoDB:** `localhost:27017`  
- **Frontend direct:** `http://localhost:5173` (container maps host `5173` → web `80`)

Set strong `SECRET_KEY` and real API keys in `docker/docker-compose.yml` (or use env files) before production.

## API documentation

- Swagger: `http://127.0.0.1:8000/docs`
- Postman: import `postman/AiLearning.postman_collection.json` (set `access_token` after login).

## ML utilities

```powershell
pip install -r ml/requirements.txt
python ml/generate_dataset.py
python ml/train_sklearn_baseline.py
```

## Tests & CI

```powershell
cd Backend
$env:SKIP_DB_INIT="true"
pytest tests -v
```

`SKIP_DB_INIT=true` skips MongoDB index creation at startup (health check tests).

GitHub Actions runs backend pytest (with `SKIP_DB_INIT`) and frontend `npm run build`.

## Environment variables

See `Backend/.env.example` for all options (MongoDB, Redis, JWT, SMTP, Google OAuth client id, OpenAI, YouTube).

## Notes

- **Dev JWT:** `POST /api/v1/auth/dev-token` expects `user_id` to match an existing user `_id` (register or seed first).
- **Google OAuth:** `POST /api/v1/auth/oauth/google` with `{ "id_token": "<Google ID token>" }` and `GOOGLE_CLIENT_ID` set.
- **Email:** Without SMTP, password-reset emails are logged to the API console.
=======
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
>>>>>>> be0d659b0fa645aebad9a2214391a946d788bd94
