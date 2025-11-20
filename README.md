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

##  9. Optional: Run All Services Together

You’ll need **4 terminals**:

| Terminal | Command | Description |
|-----------|----------|-------------|
| 1️⃣ | `ollama serve` | Start LLM server |
| 2️⃣ | `uvicorn main:app --reload --port 8001` | Start FastAPI |
| 3️⃣ | `node src/app.cjs` | Start Node backend |
| 4️⃣ | `npm start` | Start React frontend |

---

##  10. Troubleshooting

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
  A["React Frontend"] --> B["Node.js Backend"]
  B --> C["MySQL Database"]
  B --> D["FastAPI (Python API)"]
  D --> E["Ollama LLM"]
```

---

##  13. Learn More

- **React Docs:** [https://react.dev](https://react.dev)  
- **FastAPI Docs:** [https://fastapi.tiangolo.com](https://fastapi.tiangolo.com)  
- **Ollama Docs:** [https://github.com/ollama/ollama](https://github.com/ollama/ollama)


# Lab 2 - Continues

A microservices-based Airbnb clone with asynchronous booking processing using Kafka, deployed on Kubernetes.

## Current Status

✅ **Completed:**
- Part 1: Docker & Kubernetes Setup
- Part 2: Kafka Async Messaging
- Part 3: MongoDB Database

⏳ **In Progress:**
- Part 4: [To be completed by Ann]
- Part 5: [To be completed by Ann]

## Architecture

### Services
- **Frontend**: React application (serves both Traveler and Owner UI)
- **Backend Producer**: API server handling requests
- **Backend Consumer**: Processes async booking events via Kafka
- **AI Agent**: Agentic AI service
- **MongoDB**: Database with sessions and encrypted passwords
- **Kafka + Zookeeper**: Message broker for async processing

## Quick Start

### Prerequisites
- Docker Desktop (with Kubernetes enabled)
- kubectl CLI

### Deploy Application
```bash
# Navigate to k8s directory
cd k8s

# Deploy all services
kubectl apply -f .

# Check deployment status
kubectl get pods -n airbnb-app
```

### Access Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost:4000

### Login Credentials

**Owner:**
- Email: `owner@example.com`
- Password: `password`

**Traveler:**
- Email: `traveler@example.com`
- Password: `password`

## Key Features

### Booking Flow (Kafka-based)
1. Traveler creates booking → Published to Kafka `booking-requests` topic
2. Consumer processes booking → Saves to MongoDB as `PENDING`
3. Owner accepts/cancels → Published to Kafka `booking-updates` topic
4. Consumer updates status → Status changed to `ACCEPTED` or `CANCELLED`

## Useful Commands

### View Status
```bash
# Check all pods
kubectl get pods -n airbnb-app

# Check services
kubectl get services -n airbnb-app

# Check deployments
kubectl get deployments -n airbnb-app
```

### View Logs
```bash
# Backend Producer logs
kubectl logs -n airbnb-app -l app=backend-producer --tail=50

# Backend Consumer logs (Kafka processing)
kubectl logs -n airbnb-app -l app=backend-consumer --tail=50

# Frontend logs
kubectl logs -n airbnb-app -l app=frontend --tail=50
```

### Access MongoDB
```bash
# Port-forward MongoDB
kubectl port-forward -n airbnb-app svc/mongodb-service 27018:27017

# Connect with MongoDB Compass:
# mongodb://admin:mongopassword123@localhost:27018/airbnb_lab?authSource=admin
```

## Safely Stop Everything

### Option 1: Scale Down (Keeps data)
```bash
# Scale all deployments to 0
kubectl scale deployment --all --replicas=0 -n airbnb-app

# Verify pods stopped
kubectl get pods -n airbnb-app
```

### Option 2: Quit Docker Desktop
```bash
# Click Docker icon → Quit Docker Desktop
# All containers stop automatically
```

## Restart Application
```bash
# Scale everything back up
kubectl scale deployment --all --replicas=1 -n airbnb-app

# Scale frontend to 2 replicas
kubectl scale deployment frontend --replicas=2 -n airbnb-app

# Check status
kubectl get pods -n airbnb-app
```

Wait until all pods show `1/1 READY` and `Running` status.

## Project Structure
```
LAB2-AIRBNB/
├── data236-lab1-backend/
│   └── server/
│       ├── src/                    # Backend code
│       ├── Dockerfile.producer     # Producer Docker config
│       └── Dockerfile.consumer     # Consumer Docker config
├── data236-lab1-frontend/
│   ├── src/                        # React frontend
│   └── Dockerfile                  # Frontend Docker config
└── k8s/
    ├── 00-namespace.yaml
    ├── 01-configmap.yaml
    ├── 02-secrets.yaml
    ├── 04-ai-agent.yaml
    ├── 05-frontend.yaml
    ├── 06-zookeeper.yaml
    ├── 07-kafka.yaml
    ├── 08-backend-producer.yaml
    └── 09-backend-consumer.yaml
```

## MongoDB Collections:

- **users**: User accounts (passwords encrypted with bcrypt)
- **user_profiles**: User details
- **properties**: Property listings
- **bookings**: Booking records
- **favorites**: Favorite properties
- **sessions**: Active sessions

## Troubleshooting

### Pods not starting?
```bash
kubectl describe pod <pod-name> -n airbnb-app
kubectl logs <pod-name> -n airbnb-app
```

### Can't access frontend?
```bash
# Check frontend service
kubectl get svc frontend-service -n airbnb-app
```

### MongoDB connection issues?
```bash
# Check MongoDB pod
kubectl get pods -n airbnb-app | grep mongodb
kubectl logs -n airbnb-app -l app=mongodb
```

## Notes for Team

- **Parts 1-3 are complete** and fully functional
- All Docker images are built and deployed
- Kafka messaging is working for bookings
- MongoDB stores all data with encrypted passwords
- Partner can continue with Parts 4 & 5

## Technical Details

- **Kubernetes Namespace**: `airbnb-app`
- **MongoDB Connection**: `mongodb://admin:mongopassword123@mongodb-service:27017/airbnb_lab`
- **Kafka Broker**: `kafka-service:9092`
- **Kafka Topics**: `booking-requests`, `booking-updates`
