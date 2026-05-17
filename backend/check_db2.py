import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from app.database import convert_srv_to_standard

async def main():
    uri = convert_srv_to_standard(settings.MONGODB_URI)
    client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=5000, tls=True)
    db = client[settings.DATABASE_NAME]
    docs = await db.comments.find().to_list(10)
    print("Found comments:", len(docs))
    for doc in docs:
        print("Comment:", doc)

asyncio.run(main())
