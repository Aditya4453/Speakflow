# SpeakFlow

> **SpeakFlow** – an AI‑powered speech coaching platform that lets users record, analyse, and improve their speaking skills.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Setup & Development](#setup--development)
  - [Prerequisites](#prerequisites)
  - [Backend (FastAPI)](#backend-fastapi)
  - [Frontend (React + Vite)](#frontend-react--vite)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview
SpeakFlow helps users become better public speakers. Users can:
1. **Record** short audio snippets directly in the browser.
2. **Analyse** recordings with Google Gemini (or a mock response) to receive detailed, structured feedback.
3. **Track progress** over time – each analysis is stored in MongoDB Atlas and displayed in a personal dashboard.
4. **Securely authenticate** via email/password using JWT tokens.

The backend is a FastAPI service written in Python, while the frontend is a modern React app built with Vite.

---

## Features
- **Audio recording & playback** with visual waveform.
- **AI‑driven feedback** – JSON‑structured scores, strengths, weaknesses, and actionable suggestions.
- **User management** – sign‑up, login, JWT‑protected routes.
- **History view** – previous recordings and analysis are persisted.
- **Azure Blob Storage (optional)** – uploaded audio files can be stored in Azure.
- **Responsive UI** with a clean, modern design system.
- **Docker support** (see `docker-compose.yml` if present) for easy local deployment.

---

## Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | React, Vite, Tailwind‑compatible CSS (custom design system), Axios |
| Backend  | FastAPI, Python 3.11, Pydantic, PyMongo, Bcrypt, PyJWT |
| Database | MongoDB Atlas (via `MONGODB_URI`), fallback in‑memory store |
| Storage  | Azure Blob Storage (optional) |
| AI      | Google Gemini (via `google‑genai` SDK) |
| Auth    | JWT (HS256) |
| Dev Tools | npm, poetry/pip, uvicorn |

---

## Setup & Development
### Prerequisites
- **Node.js** (>= 18) and **npm**
- **Python** (>= 3.11) and **pip**
- **MongoDB Atlas** account (or use the provided in‑memory fallback)
- (Optional) **Azure Blob Storage** account if you want to store recordings remotely.

### Backend (FastAPI)
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create a `.env` file (copy from the sample below) and fill in your secrets:
   ```env
   MONGODB_URI="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority"
   JWT_SECRET="<your‑jwt‑secret>"
   GEMINI_API_KEY="<your‑gemini‑api‑key>"
   # Optional Azure settings
   AZURE_STORAGE_CONNECTION_STRING="<your‑connection‑string>"
   AZURE_STORAGE_CONTAINER_NAME="speakflow-recordings"
   ```
4. Run the development server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   The API will be available at `http://localhost:8000`.

### Frontend (React + Vite)
1. Navigate to the app folder:
   ```bash
   cd my-app
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Create a `.env.local` (optional) to override the default API URL:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   The UI will be served at `http://localhost:5173`.

---

## Environment Variables
| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | Connection string for MongoDB Atlas. Required for production. |
| `JWT_SECRET` | Secret key used to sign JWT tokens. Keep it secret! |
| `GEMINI_API_KEY` | Google Gemini API key for real analysis. If omitted, the backend returns a mock response. |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob Storage connection string (optional). |
| `AZURE_STORAGE_CONTAINER_NAME` | Container name for recordings (defaults to `speakflow-recordings`). |

---

## Running the Application
1. **Start the backend** (see Backend section).
2. **Start the frontend** (see Frontend section).
3. Open `http://localhost:5173` in your browser.
4. Register a new account, record a snippet, and watch the AI feedback appear!

---

## Deployment
- **GitHub** – the repository is already set up with a remote `origin`. Push your changes and enable GitHub Actions (if a workflow file exists) for CI.
- **Docker** – you can containerise both services. Example `Dockerfile` for the backend:
  ```dockerfile
  FROM python:3.11-slim
  WORKDIR /app
  COPY backend/requirements.txt .
  RUN pip install --no-cache-dir -r requirements.txt
  COPY backend/ .
  CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
  ```
  Build and run with:
  ```bash
  docker build -t speakflow-backend .
  docker run -p 8000:8000 speakflow-backend
  ```
- **Frontend** – Vite builds a static bundle that can be served via any static host (Netlify, Vercel, GitHub Pages with a custom server). Use `npm run build` to generate `dist/`.

---

## Contributing
Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a feature branch:
   ```bash
   git checkout -b feature/your‑feature
   ```
3. Make your changes, ensuring the code follows the existing style.
4. Write or update tests where applicable.
5. Commit with clear messages and push.
6. Open a Pull Request.

Make sure to run both the backend (`pytest` if tests exist) and frontend linting (`npm run lint`) before submitting.

---

## License
This project is licensed under the **MIT License** – see the `LICENSE` file for details.

---

*Happy speaking!*
