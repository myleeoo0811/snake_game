# Snake

Minimal classic Snake game with a tiny Node static server.

## Local run

```bash
npm start
```

Open:

- `http://localhost:3000`

## Google Cloud

This project can be deployed from GitHub to Google Cloud Run.

### Cloud Run

The repo includes a `Dockerfile`, so Cloud Run can build it directly from GitHub.

- Container port: `8080`
- Public access: allow unauthenticated

After deployment, Cloud Run will provide a public URL.
