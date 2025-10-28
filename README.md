# 🏠 Airbnb-LAB1 Full Stack Setup Guide

Welcome to the Airbnb-LAB1 project!  
This document explains how to clone, configure, and run the **complete full-stack application** locally.

This README is for the **main branch** and explains how to run the complete Airbnb-Lab1 project,  
including instructions for both frontend (`yianyao` branch) and backend (`feature/backend-yianyao` branch).

This project includes three integrated components:

1. **Frontend (React)** – branch: `yianyao`  
2. **Backend (Node.js + Express + MySQL)** – branch: `feature/backend-yianyao`  
3. **Python API (FastAPI)** – integrates with **Ollama LLM** for AI features  

---

## Project Overview

```
📦 Airbnb-LAB1
 ┣ 📂 frontend/                ← branch: yianyao
 ┃ ┣ 📂 src/
 ┃ ┣ 📜 App.js
 ┃ ┗ 📜 package.json
 ┣ 📂 backend/                 ← branch: feature/backend-yianyao
 ┃ ┣ 📂 server/
 ┃ ┣ 📂 database/
 ┃ ┣ 📂 src/
 ┃ ┃ ┗ 📜 init-db.cjs
 ┃ ┗ 📜 app.cjs
 ┣ 📂 public/
 ┣ 📜 README.md
 ┗ 📜 docker-compose.yml (optional)
```

---

##  1. Clone the Repositories

Since frontend and backend are on separate branches, clone both:

```bash
# Clone frontend
git clone -b yianyao https://github.com/<your-repo>.git frontend

# Clone backend
git clone -b feature/backend-yianyao https://github.com/<your-repo>.git backend
```

Make sure both folders exist side by side in your workspace.

---

##  2. Prerequisites

Ensure you have installed:

- **Node.js (LTS)** and **npm**
- **Python 3.10+** and **pip**
- **MySQL 8.x** (running locally)
- **Ollama** (local LLM runtime)

---

##  3. Install & Run Ollama

Ollama provides local LLM serving for the Python API.

### Install Ollama
- macOS:  
  ```bash
  brew install ollama
  ```
- Linux / Windows:  
  [Download installer](https://ollama.com)

### Start the Ollama service
```bash
ollama serve
```

### Pull a model (example: Llama 3)
```bash
ollama pull llama3
```

###  Check Ollama Port
By default, Ollama runs on port **11434**,  
but your setup might be different (for example, **11500**).

To check which port Ollama is using, run:

```bash
ps aux | grep ollama
```

Then update your `.env` accordingly, for example:

```bash
OLLAMA_HOST=http://localhost:11500
OLLAMA_MODEL=llama3
```

> Make sure the Python API and Node backend both point to the same Ollama host and port.

---

##  4. Python API (FastAPI)

From your backend folder (where `main.py` exists):

### Run the API
```bash
cd backend/server
uvicorn main:app --reload --port 8001
```

Your FastAPI service will now be available at:  
👉 `http://localhost:8001`

---

##  5. MySQL Database Setup

Initialize MySQL database

```bash
cd backend/src/db
node init-db.cjs
```
---

##  6. Environment Variables

Create a `.env` file in the **backend** directory:

```bash
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=app_user
MYSQL_PASSWORD=strong_password_here
MYSQL_DATABASE=airbnb_lab

# Ollama settings
OLLAMA_HOST=http://localhost:11500
OLLAMA_MODEL=llama3
```

Create a `.env` file in the **frontend** directory:

```bash
REACT_APP_API_URL=http://localhost:5000
```

> Update ports if needed.

---

##  7. Start the Node.js Backend

From your backend folder:

```bash
cd backend
npm install
node src/app.cjs
```

The Node backend will start on port **4000** by default.

---

##  8. Start the React Frontend

From your frontend folder:

```bash
cd frontend
npm install
npm start
```

Then open 👉 [http://localhost:3000](http://localhost:3000)

---

## 🧠 9. Optional: Run All Services Together

You’ll need **4 terminals**:

| Terminal | Command | Description |
|-----------|----------|-------------|
| 1️⃣ | `ollama serve` | Start LLM server |
| 2️⃣ | `uvicorn main:app --reload --port 8001` | Start FastAPI |
| 3️⃣ | `node src/app.cjs` | Start Node backend |
| 4️⃣ | `npm start` | Start React frontend |

---

## 🔍 10. Troubleshooting

| Problem | Possible Fix |
|----------|---------------|
| `ollama: command not found` | Install Ollama (`brew install ollama`) |
| `model not found` | Run `ollama pull llama3` |
| `MySQL connection failed` | Check `.env` credentials and running MySQL |
| `Port already in use` | Free it: `lsof -i :8001` |
| `CORS error` | Verify frontend `.env` and API URLs |
| `.env not loaded` | Ensure `dotenv` is imported in `app.cjs`:<br>```js<br>import dotenv from 'dotenv';<br>dotenv.config();<br>``` |

---

##  11. Typical Development Flow

```bash
# 1️⃣ Start Ollama
ollama serve
ollama pull llama3

# 2️⃣ Start Python FastAPI
cd backend/server
uvicorn main:app --reload --port 8001

# 3️⃣ Initialize MySQL database
cd backend/src/db
node init-db.cjs

# 4️⃣ Start Node backend
cd backend
node src/app.cjs

# 5️⃣ Start frontend
cd frontend
npm start
```

---

##  12. System Architecture

```mermaid
flowchart LR
  A[React Frontend] --> B[Node.js Backend]
  B --> C[(MySQL Database)]
  B --> D[FastAPI (Python API)]
  D --> E[Ollama LLM]
```

---

##  13. Learn More

- **React Docs:** [https://react.dev](https://react.dev)  
- **FastAPI Docs:** [https://fastapi.tiangolo.com](https://fastapi.tiangolo.com)  
- **Ollama Docs:** [https://github.com/ollama/ollama](https://github.com/ollama/ollama)
