import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['career_connect']
    docs = await db.comments.find().to_list(2)
    for doc in docs:
        print("Comment:", doc)

asyncio.run(main())
