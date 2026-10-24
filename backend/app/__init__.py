"""
SmartCare Flask Application Factory.
Initializes the Flask app, configuration, database extensions, CORS, JWT, error handlers, and routes.
"""

import os
from flask import Flask, jsonify
from app.config import get_config
from app.extensions import db, migrate, cors, jwt
from app.routes import register_routes
import app.models  # Ensure models are discovered for migrations


def create_app(config_name=None):
    """
    Application factory pattern for creating and configuring the Flask app.
    
    Args:
        config_name (str, optional): Configuration mode ('development', 'testing', 'production').
        
    Returns:
        Flask: The configured Flask application instance.
    """
    app = Flask(__name__)

    # 1. Load configuration
    config_class = get_config(config_name)
    app.config.from_object(config_class)

    # Ensure dynamic DATABASE_URL from environment is applied with normalization
    db_url = os.getenv('DATABASE_URL')
    if db_url and config_name != 'testing':
        from app.config import normalize_database_url
        app.config['SQLALCHEMY_DATABASE_URI'] = normalize_database_url(db_url)

    # 2. Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # Configure JWT custom error responses (clean JSON without leaked internals)
    @jwt.unauthorized_loader
    def handle_missing_token(err_str):
        return jsonify({"error": "Missing or invalid token"}), 401

    @jwt.invalid_token_loader
    def handle_invalid_token(err_str):
        return jsonify({"error": "Invalid token"}), 401

    @jwt.expired_token_loader
    def handle_expired_token(jwt_header, jwt_payload):
        return jsonify({"error": "Token has expired"}), 401

    @jwt.revoked_token_loader
    def handle_revoked_token(jwt_header, jwt_payload):
        return jsonify({"error": "Token has been revoked"}), 401

    # 3. Configure CORS (allow configured frontend origins with environment separation)
    cors_origins_env = app.config.get('CORS_ORIGINS')
    frontend_url = app.config.get('FRONTEND_URL')
    is_prod = (app.config.get('FLASK_ENV') == 'production') or not app.config.get('DEBUG', False)

    if cors_origins_env:
        allowed_origins = [o.strip() for o in cors_origins_env.split(',') if o.strip()]
    elif is_prod and frontend_url:
        allowed_origins = [frontend_url.strip()]
    else:
        # Development / testing fallback origins
        default_dev_origins = [
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:3000',
            'http://127.0.0.1:3000'
        ]
        if frontend_url:
            default_dev_origins.append(frontend_url.strip())
        allowed_origins = list(set(filter(None, default_dev_origins)))

    cors.init_app(
        app,
        resources={r"/api/*": {"origins": allowed_origins}},
        supports_credentials=True
    )

    # Attach baseline HTTP security headers
    @app.after_request
    def set_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        return response

    # 4. Register error handlers (clean JSON responses)
    @app.errorhandler(400)
    def handle_bad_request(error):
        return jsonify({"error": "Bad Request"}), 400

    @app.errorhandler(403)
    def handle_forbidden(error):
        return jsonify({"error": "Forbidden"}), 403

    @app.errorhandler(404)
    def handle_not_found(error):
        return jsonify({"error": "Not Found"}), 404

    @app.errorhandler(405)
    def handle_method_not_allowed(error):
        return jsonify({"error": "Method Not Allowed"}), 405

    @app.errorhandler(413)
    def handle_payload_too_large(error):
        return jsonify({"error": "File size exceeds the 10 MB limit"}), 413

    @app.errorhandler(415)
    def handle_unsupported_media_type(error):
        return jsonify({"error": "Unsupported Media Type"}), 415

    @app.errorhandler(422)
    def handle_unprocessable_entity(error):
        return jsonify({"error": "Unprocessable Entity"}), 422

    @app.errorhandler(429)
    def handle_too_many_requests(error):
        return jsonify({"error": "Too Many Requests"}), 429

    @app.errorhandler(500)
    def handle_internal_server_error(error):
        return jsonify({"error": "Internal Server Error"}), 500

    # Ensure uploads directory structure exists
    upload_folder = app.config.get('UPLOAD_FOLDER')
    if upload_folder:
        try:
            os.makedirs(os.path.join(upload_folder, 'documents'), exist_ok=True)
        except OSError:
            pass

    # 5. Register routes
    register_routes(app)

    return app
