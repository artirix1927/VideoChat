from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine(r"sqlite:///D:\\VideoChat\\auth_service\\db.sqlite3")

SessionLocal = sessionmaker(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
