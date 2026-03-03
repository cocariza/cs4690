# Student Logs – Project 3

jQuery + Bootstrap + TypeScript + Repository Pattern

## Setup

```bash
npm install
```

## Development

Run both the TypeScript compiler (watch mode) and json-server simultaneously:

```bash
npm run dev
```

Then open: `http://localhost:3000`

## Build Only

```bash
npm run build
```

Compiled output → `public/js/script.js`

## CDN Fallback – Local Vendor Files

The HTML loads jQuery and Bootstrap from CDN first. If CDN fails, it falls back
to local copies. Download the following files into the listed locations:

| File | Download URL | Save to |
|------|-------------|---------|
| jQuery | https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js | `public/js/vendor/jquery.min.js` |
| Bootstrap JS | https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js | `public/js/vendor/bootstrap.bundle.min.js` |
| Bootstrap CSS | https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css | `public/css/vendor/bootstrap.min.css` |

## Architecture – Repository Pattern

All API calls are isolated in `LogRepository` (in `src/script.ts`):

- `LogRepository.getCourses()` — GET /api/v1/courses  
- `LogRepository.getLogs(courseId, uvuId)` — GET /api/v1/logs  
- `LogRepository.addLog(log)` — POST /api/v1/logs  

The UI layer only calls repository methods — it never constructs raw $.ajax calls itself.

## Branch Strategy

- Each project uses its own branch: `p1`, `p2`, `p3`, etc.
- Merge working branch → `main` (trunk) when complete.
- Trunk is always stable (used for grading).
