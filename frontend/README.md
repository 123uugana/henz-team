# Henz Hurag Frontend

Next.js frontend for the Henz Hurag app.

## Run

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000.

## API

The app talks to the backend through `NEXT_PUBLIC_API_URL`.
For local development:

```bash
cp .dev.vars.example .dev.vars
```

Default local backend URL is `http://localhost:8787`.
Backend code lives in `../backend`.
