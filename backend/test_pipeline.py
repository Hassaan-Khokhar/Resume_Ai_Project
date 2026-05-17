import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from app.database import convert_srv_to_standard
import app.database

async def main():
    uri = convert_srv_to_standard(settings.MONGODB_URI)
    client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=5000, tls=True)
    app.database.db = client[settings.DATABASE_NAME]
    app.database.client = client
    
    docs = await app.database.pipeline_user_feed("6a00cf5034c5a6aa39d9c4ee", 0, 1)
    for doc in docs:
        print("Post ID:", doc['_id'])
        print("Comment count:", doc.get('comment_count'))

asyncio.run(main())
