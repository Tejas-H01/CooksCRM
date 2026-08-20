# Event-Driven Operational Intelligence Sales CRM (Backend Foundation)

This is the backend foundation for the hackathon project based on **PS-02 — Event-Driven Sales Intelligence & Actionable CRM**.

## Prerequisites
- Python 3.10+
- PostgreSQL (Either running locally on Windows or running via Docker Compose)

## Project Structure
```text
project-root/
│
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers (/health, /events/ingest)
│   │   ├── core/         # Settings and configurations (pydantic-settings)
│   │   ├── db/           # Session management & seeds
│   │   ├── engine/       # Action engine placeholder
│   │   ├── events/       # InMemoryEventBus abstraction
│   │   ├── models/       # SQLAlchemy tables
│   │   ├── schemas/      # Pydantic schemas (Event, Action, etc.)
│   │   ├── services/     # Event ingestion services
│   │   └── main.py       # FastAPI Entrypoint
│   │
│   ├── tests/            # Pytest test suite
│   ├── alembic/          # Database migrations
│   ├── requirements.txt  # Project dependencies
│   └── .env.example      # Environment variables template
│
├── docker-compose.yml    # Docker Compose for PostgreSQL
└── README.md
```

## Setup Instructions

### 1. Set Up Virtual Environment & Install Requirements
From the project root:
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
```

### 2. Configure Environment Variables
Create a `.env` file in the `backend/` directory by copying `.env.example`:
```bash
cp backend/.env.example backend/.env
```
Ensure `DATABASE_URL` is set with the correct credentials. E.g., for local postgres:
```env
DATABASE_URL=postgresql://postgres:<your_password>@localhost:5432/crm_db
```

### 3. Run Database Migrations
Run the migrations to create all schemas in PostgreSQL:
```bash
cd backend
alembic upgrade head
```

### 4. Seed Database
Insert the development seeds (1 manager, 2 RMs, customers, leads, targets, benchmarks):
```bash
python app/db/seeds.py
```

### 5. Run the Application
Start the FastAPI server:
```bash
python -m uvicorn app.main:app --reload
```
You can access the health endpoints at:
- Service Health: http://127.0.0.1:8000/health
- DB Connection Health: http://127.0.0.1:8000/api/v1/health/db

### 6. Run Unit Tests
To run the test suite:
```bash
python -m pytest
```
# CooksCRM
