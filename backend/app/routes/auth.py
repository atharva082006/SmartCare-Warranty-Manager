"""
Authentication Routes Module.
Provides user registration, login, and current-user (/auth/me) endpoints.
"""

import re
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity
)
from app.extensions import db
from app.models.user import User

auth_bp = Blueprint('auth', __name__, url_prefix='/api/v1/auth')

EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')


@auth_bp.route('/register', methods=['POST'])
def register():
    """
    User Registration Endpoint.
    Validates input fields, hashes password with bcrypt, and creates a new user record.
    """
    if not request.is_json:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({"error": "Request payload must be a JSON object"}), 400

    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    phone = data.get('phone')

    # 1. Username validation
    if not username or not isinstance(username, str) or not username.strip():
        return jsonify({"error": "Username is required"}), 400
    username = username.strip()
    if len(username) < 3 or len(username) > 80:
        return jsonify({"error": "Username must be between 3 and 80 characters"}), 400

    # 2. Email validation
    if not email or not isinstance(email, str) or not email.strip():
        return jsonify({"error": "Email is required"}), 400
    email = email.strip().lower()
    if not EMAIL_REGEX.match(email):
        return jsonify({"error": "Invalid email format"}), 400

    # 3. Password validation
    if not password or not isinstance(password, str):
        return jsonify({"error": "Password is required"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters long"}), 400

    # 4. Phone validation (optional)
    if phone is not None:
        if isinstance(phone, str):
            phone = phone.strip() or None
        else:
            phone = str(phone).strip() or None

    # 5. Check uniqueness
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email is already registered"}), 409

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username is already taken"}), 409

    # 6. Create user record
    try:
        user = User(
            username=username,
            email=email,
            phone=phone
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        return jsonify({
            "message": "User registered successfully",
            "user": user.to_dict()
        }), 201

    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to create user account"}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    User Login Endpoint.
    Authenticates user credentials using bcrypt and returns a JWT access token.
    Uses generic error responses to prevent account enumeration.
    """
    if not request.is_json:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({"error": "Request payload must be a JSON object"}), 400

    email = data.get('email')
    password = data.get('password')

    if not email or not isinstance(email, str) or not email.strip():
        return jsonify({"error": "Email is required"}), 400

    if not password or not isinstance(password, str):
        return jsonify({"error": "Password is required"}), 400

    email = email.strip().lower()

    # Query user by normalized email
    user = User.query.filter_by(email=email).first()

    # Generic check to prevent account discovery
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    # Generate JWT token using user id as identity
    access_token = create_access_token(identity=str(user.id))

    return jsonify({
        "message": "Login successful",
        "access_token": access_token,
        "user": user.to_dict()
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """
    Current User Profile Endpoint.
    Returns the authenticated user's information from the JWT access token.
    """
    identity = get_jwt_identity()

    try:
        user_id = int(identity)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid token identity"}), 401

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found or session invalid"}), 401

    return jsonify({
        "user": user.to_dict()
    }), 200
