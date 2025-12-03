import sys
import os

# Add current directory to sys.path
sys.path.append(os.getcwd())

from app.database import engine
from sqlalchemy import inspect

def check_database():
    print("Connecting to database...")
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    if not tables:
        print("No tables found.")
    else:
        print(f"Found {len(tables)} tables: {', '.join(tables)}")

if __name__ == "__main__":
    check_database()
