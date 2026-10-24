"""
Flask Extensions Initialization.
Instantiates database, migration, CORS, and JWT extensions to be initialized in create_app().
"""

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager

db = SQLAlchemy()
migrate = Migrate()
cors = CORS()
jwt = JWTManager()
