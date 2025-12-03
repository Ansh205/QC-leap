from sqlalchemy import inspect
from app.database import SessionLocal, Base, engine
from app.models import (
    User, Company, InspectionModel, Image, Annotation,
    TrainingJob, Invitation, Notification, ModelRun, InferenceResult
)


def print_separator(title="", width=80):
    """Print a formatted separator line"""
    if title:
        padding = (width - len(title) - 2) // 2
        print(f"\n{'=' * padding} {title} {'=' * padding}")
    else:
        print("=" * width)


def get_model_name(model):
    """Get the table name for a model"""
    return model.__tablename__


def view_all_data():
    """View all data from all tables in the database"""
    db = SessionLocal()
    
    try:
        # List of all models to query
        models = [
            User,
            Company,
            InspectionModel,
            Image,
            Annotation,
            TrainingJob,
            Invitation,
            Notification,
            ModelRun,
            InferenceResult
        ]
        
        print_separator("DATABASE CONTENTS", 80)
        print(f"Database URL: {engine.url}")
        print()
        
        total_records = 0
        
        # Iterate through each model
        for model in models:
            table_name = get_model_name(model)
            records = db.query(model).all()
            count = len(records)
            total_records += count
            
            print_separator(f"TABLE: {table_name}", 80)
            print(f"Total Records: {count}\n")
            
            if count > 0:
                # Get column names from the model
                inspector = inspect(model)
                columns = [c.key for c in inspector.columns]
                
                # Print header
                header = " | ".join(columns)
                print(header)
                print("-" * len(header))
                
                # Print each record
                for record in records:
                    values = []
                    for col in columns:
                        value = getattr(record, col, None)
                        # Truncate long values for display
                        value_str = str(value)
                        if len(value_str) > 50:
                            value_str = value_str[:47] + "..."
                        values.append(value_str)
                    print(" | ".join(values))
            else:
                print("(No records)")
            
            print()
        
        print_separator()
        print(f"TOTAL RECORDS ACROSS ALL TABLES: {total_records}")
        print_separator()
        
    except Exception as e:
        print(f"Error viewing database: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    view_all_data()
