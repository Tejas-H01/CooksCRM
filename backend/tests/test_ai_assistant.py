import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_headers(username, password):
    res = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_ai_chat_rm_performance_query():
    headers = get_auth_headers("rm_alice", "alicepass")
    res = client.post("/api/v1/ai/chat", json={"message": "What is my target gap?"}, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "RM"
    assert "get_my_performance" in data["tool_calls_executed"]
    assert "106.7%" in data["message"] or "target" in data["message"].lower()

def test_ai_chat_rm_priority_actions_query():
    headers = get_auth_headers("rm_alice", "alicepass")
    res = client.post("/api/v1/ai/chat", json={"message": "Which leads need my attention today?"}, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "RM"
    assert "get_my_priority_actions" in data["tool_calls_executed"]
    assert "priority" in data["message"].lower() or "lead" in data["message"].lower()

def test_ai_chat_bm_query():
    headers = get_auth_headers("branch_mgr_1", "mgrpass")
    res = client.post("/api/v1/ai/chat", json={"message": "Which RM needs attention?"}, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "BRANCH_MANAGER"
    assert "get_branch_performance" in data["tool_calls_executed"]

def test_ai_chat_regional_head_query():
    headers = get_auth_headers("regional_head_1", "regpass")
    res = client.post("/api/v1/ai/chat", json={"message": "Which branch needs attention?"}, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "REGIONAL_HEAD"
    assert "get_regional_performance" in data["tool_calls_executed"]

def test_ai_chat_empty_prompt_validation():
    headers = get_auth_headers("rm_alice", "alicepass")
    res = client.post("/api/v1/ai/chat", json={"message": "   "}, headers=headers)
    assert res.status_code == 400
