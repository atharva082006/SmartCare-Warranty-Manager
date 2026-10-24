"""
Application Entry Point.
Runs the Flask application development server.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Explicitly load .env before creating the application
load_dotenv(Path(__file__).resolve().parent / '.env', override=True)

from app import create_app

app = create_app()

if __name__ == '__main__':
    host = os.getenv('HOST', '127.0.0.1')
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'development') == 'development'
    
    print(f" * Starting SmartCare API on http://{host}:{port}")
    print(f" * Environment: {app.config.get('FLASK_ENV', 'development')}")
    print(f" * Frontend origin allowed: {app.config.get('FRONTEND_URL')}")
    
    app.run(host=host, port=port, debug=debug)
