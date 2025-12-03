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


def count_records():
    """Count records in all tables"""
    db = SessionLocal()
    
    try:
        models = [
            User,
            Company,
            InspectionModel,
            Image,
            Annotation,
            TrainingJob,
            Invitation,
            Invitation,
            Notification,
            ModelRun,
            InferenceResult
        ]
        
        counts = {}
        total = 0
        
        for model in models:
            table_name = get_model_name(model)
            count = db.query(model).count()
            counts[table_name] = count
            total += count
        
        return counts, total
    finally:
        db.close()


def delete_all_data(confirm=True):
    """Delete all data from all tables in the database"""
    
    # First, show current data counts
    print_separator("CURRENT DATABASE STATE", 80)
    counts, total = count_records()
    
    for table_name, count in counts.items():
        print(f"{table_name}: {count} records")
    
    print()
    print(f"TOTAL RECORDS: {total}")
    print_separator()
    
    if total == 0:
        print("\n✓ Database is already empty. No records to delete.")
        return
    
    # Confirmation prompt
    if confirm:
        print("\n⚠️  WARNING: This will DELETE ALL DATA from the database!")
        print("⚠️  This action CANNOT be undone!")
        print()
        response = input("Type 'DELETE ALL' to confirm: ")
        
        if response != "DELETE ALL":
            print("\n✗ Deletion cancelled. Database unchanged.")
            return
    
    # Perform deletion
    db = SessionLocal()
    
    try:
        # Models in deletion order (respecting foreign key constraints)
        # Delete child records before parent records
        models_in_order = [
            Notification,      # Has foreign keys to User
            Invitation,        # Has foreign keys to Company and User
            InferenceResult,   # Has foreign keys to ModelRun and Image
            ModelRun,          # Has foreign keys to InspectionModel
            Annotation,        # Has foreign keys to Image and User
            TrainingJob,       # Has foreign keys to InspectionModel and User
            Image,             # Has foreign keys to InspectionModel and User
            InspectionModel,   # Has foreign keys to Company and User
            User,              # Has foreign key to Company
            Company,           # No foreign keys (root table)
        ]
        
        print_separator("DELETING DATA", 80)
        deleted_counts = {}
        
        for model in models_in_order:
            table_name = get_model_name(model)
            count = db.query(model).count()
            
            if count > 0:
                db.query(model).delete()
                deleted_counts[table_name] = count
                print(f"✓ Deleted {count} records from {table_name}")
        
        # Commit the transaction
        db.commit()
        
        print_separator()
        print(f"\n✓ Successfully deleted {sum(deleted_counts.values())} total records")
        print("✓ Database is now empty")
        print_separator()
        
    except Exception as e:
        db.rollback()
        print(f"\n✗ Error deleting database: {e}")
        print("✗ Changes have been rolled back")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    delete_all_data(confirm=True)
