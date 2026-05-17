import asyncio
from app.database import pipeline_user_feed, connect_db, users_col
async def main():
    await connect_db()
    user = await users_col().find_one()
    if user:
        feed = await pipeline_user_feed(str(user["_id"]))
        print(f"Feed length: {len(feed)}")
        for p in feed:
            print(p)
    else:
        print("No user")
asyncio.run(main())
