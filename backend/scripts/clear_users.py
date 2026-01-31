#!/usr/bin/env python3
"""
Script to clear all users from the database for testing.
WARNING: This will delete all user accounts!
"""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.db.client import get_db


async def clear_all_users():
    """Delete all users from the database."""
    try:
        db_client = get_db()
        db = db_client.get_default_database()
        users_col = db.get_collection("users")
        
        # Get count before deletion
        count_before = await users_col.count_documents({})
        print(f"📊 Users in database: {count_before}")
        
        if count_before == 0:
            print("✅ Database already empty!")
            return
        
        # Confirm deletion
        response = input(f"\n⚠️  Are you sure you want to delete ALL {count_before} user(s)? (type 'YES' to confirm): ")
        if response.strip() != "YES":
            print("❌ Deletion cancelled")
            return
        
        # Delete all users
        result = await users_col.delete_many({})
        print(f"✅ Deleted {result.deleted_count} user(s)")
        
        # Verify
        count_after = await users_col.count_documents({})
        print(f"📊 Users remaining: {count_after}")
        
        if count_after == 0:
            print("✅ Database cleared successfully!")
        else:
            print("⚠️  Some users may still remain")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    print("🗑️  Security Dashboard - Clear All Users")
    print("=" * 50)
    asyncio.run(clear_all_users())
