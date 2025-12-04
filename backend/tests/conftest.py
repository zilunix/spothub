import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Ensure the backend package is importable when tests are run from the repository root.
ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.main import app


@pytest.fixture
def app_client():
    """Provide the FastAPI app with clean dependency overrides per test."""
    app.dependency_overrides = {}
    yield app
    app.dependency_overrides = {}


@pytest.fixture
def client(app_client):
    with TestClient(app_client) as client:
        yield client


@pytest.fixture
def dummy_db():
    class DummySession:
        def close(self):
            pass

    yield DummySession()
