# QuizKraft AI

QuizKraft is now structured as a no-spend STEM assessment studio:

- The browser handles PDF parsing, image OCR, draft generation, and export.
- Firebase Hosting, Authentication, and Firestore are the only runtime Firebase services in the app path.
- Cloud Functions and Cloud Storage are no longer required for the core workflow.

## Product flow

1. Sign in as a verified teacher.
2. Select a lecture PDF or screenshot in the workspace.
3. The browser extracts text locally and builds a source-cited assessment draft.
4. Save, edit, publish, practice, and export from the React app.

The original source file is not uploaded. Only quiz jobs, generated artifacts, published quiz snapshots, and practice results are written to Firestore.

## No-spend architecture

This repo is intended to stay on Firebase Spark-compatible surfaces:

- Firebase Hosting
- Firebase Authentication
- Cloud Firestore

The deploy config in [firebase.json](/Users/SONY/quizkraft-ai/firebase.json) no longer deploys Functions or Storage.

## Local development

### Frontend

```bash
cd frontend
npm install
npm start
```

### Required frontend environment variables

Create `frontend/.env`:

```bash
REACT_APP_FIREBASE_API_KEY="your-api-key"
REACT_APP_FIREBASE_AUTH_DOMAIN="your-auth-domain"
REACT_APP_FIREBASE_PROJECT_ID="your-project-id"
REACT_APP_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
REACT_APP_FIREBASE_APP_ID="your-app-id"
REACT_APP_FIREBASE_MEASUREMENT_ID="your-measurement-id"
REACT_APP_QUIZ_PROVIDER="local"
```

`REACT_APP_FIREBASE_STORAGE_BUCKET` and `REACT_APP_FUNCTION_URL` are no longer needed for the core app path.

## Provider boundary

The frontend now talks to a provider boundary in [frontend/src/api/quizApi.js](/Users/SONY/quizkraft-ai/frontend/src/api/quizApi.js).

- `local` mode uses [localQuizProvider.js](/Users/SONY/quizkraft-ai/frontend/src/api/providers/localQuizProvider.js)
- `server` mode uses [serverQuizProvider.js](/Users/SONY/quizkraft-ai/frontend/src/api/providers/serverQuizProvider.js)

`local` is the default. To move back to a backend later:

1. Set `REACT_APP_QUIZ_PROVIDER="server"`.
2. Set `REACT_APP_FUNCTION_URL` to your backend base URL.
3. Reintroduce the backend endpoints without changing the React screens.

The UI pages call `quizApi` only, so the migration surface is now the provider layer instead of the entire app.

## Deploy

Build the frontend and deploy only Spark-safe surfaces:

```bash
cd frontend
npm run build
cd ..
firebase deploy --only hosting,firestore
```

## Current capabilities

- Browser-side PDF parsing
- Browser-side image OCR
- Source-cited quiz, flashcard, and study-guide drafting
- Teacher review and publish flow
- Public practice mode
- Teacher results summary
- PDF, Word, and QTI export generated in the browser

## Tradeoffs

- Quiz generation quality is heuristic, not model-based.
- Public practice grading is client-side, so this is suitable for study and low-stakes assessment, not secure testing.
- Practice results are stored in Firestore, but original files are not.

## License

MIT. See [LICENSE](/Users/SONY/quizkraft-ai/LICENSE).
