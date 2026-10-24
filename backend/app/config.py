"""
Application Configuration Module.
Loads environment variables and provides structured configuration classes for Flask.
"""

import os
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv

# Automatically load environment variables from backend/.env if present
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env', override=True)


import urllib.parse


def normalize_database_url(url: str) -> str:
    """Ensure standard postgresql:// or postgres:// URLs use the psycopg2 driver and handle special characters in password."""
    if not url:
        return url

    # Handle scheme
    scheme = "postgresql+psycopg2"
    if "://" in url:
        raw_scheme, rest = url.split("://", 1)
        if raw_scheme in ("postgres", "postgresql", "postgresql+psycopg2"):
            scheme = "postgresql+psycopg2"
        else:
            return url
    else:
        return url

    # Handle auth and host parts
    if "@" in rest:
        auth_part, host_part = rest.rsplit("@", 1)
        if ":" in auth_part:
            user, pwd = auth_part.split(":", 1)
            # URL-encode password to handle special characters (e.g. '@', '#')
            unquoted_pwd = urllib.parse.unquote_plus(pwd)
            encoded_pwd = urllib.parse.quote_plus(unquoted_pwd)
            return f"{scheme}://{user}:{encoded_pwd}@{host_part}"
        else:
            return f"{scheme}://{auth_part}@{host_part}"

    return f"{scheme}://{rest}"


class Config:
    """Base configuration class with common settings."""
    SECRET_KEY = os.getenv('SECRET_KEY', 'smartcare-default-insecure-dev-key')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'smartcare-jwt-default-dev-key')
    
    # Configurable JWT access token lifetime
    _jwt_days = os.getenv('JWT_ACCESS_TOKEN_EXPIRES_DAYS')
    _jwt_hours = os.getenv('JWT_ACCESS_TOKEN_EXPIRES_HOURS')
    if _jwt_days:
        try:
            JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=float(_jwt_days))
        except ValueError:
            JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=1)
    elif _jwt_hours:
        try:
            JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=float(_jwt_hours))
        except ValueError:
            JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=1)
    else:
        JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=1)

    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    CORS_ORIGINS = os.getenv('CORS_ORIGINS')
    
    # Database Configuration
    SQLALCHEMY_DATABASE_URI = normalize_database_url(
        os.getenv(
            'DATABASE_URL',
            'postgresql://postgres:password@localhost:5432/smartcare'
        )
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False
    
    # File Storage Configuration
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', str(BASE_DIR / 'uploads'))
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 10 * 1024 * 1024))  # 10 MB limit

    # OCR Configuration
    TESSERACT_CMD = os.getenv('TESSERACT_CMD')


class DevelopmentConfig(Config):
    """Development environment configuration."""
    DEBUG = True


class TestingConfig(Config):
    """Testing environment configuration."""
    TESTING = True
    DEBUG = False
    JWT_SECRET_KEY = 'test-jwt-secret-key-for-unit-tests'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    UPLOAD_FOLDER = str(BASE_DIR / 'tests' / 'test_uploads')
    # Use SQLite in-memory for testing isolation
    SQLALCHEMY_DATABASE_URI = normalize_database_url(
        os.getenv('TEST_DATABASE_URL', 'sqlite:///:memory:')
    )


class ProductionConfig(Config):
    """Production environment configuration."""
    DEBUG = False
    TESTING = False
    FLASK_ENV = 'production'


# Map configuration names to classes
config_by_name = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig,
}


def get_config(config_name=None):
    """Return the configuration class based on name or FLASK_ENV."""
    if not config_name:
        config_name = os.getenv('FLASK_ENV', 'development')
    return config_by_name.get(config_name, DevelopmentConfig)
