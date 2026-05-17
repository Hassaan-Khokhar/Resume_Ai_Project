import asyncio
from app.database import pipeline_user_feed, connect_db, users_col, posts_col
async def main():
    await connect_db()
    
    posts = await posts_col().find().to_list(10)
    print("Total posts:", len(posts))
    
    user = await users_col().find_one()
    print("Testing with user:", user["_id"])
    feed = await pipeline_user_feed(str(user["_id"]))
    print("Feed length:", len(feed))
    for f in feed:
        print(f"ID: {f['_id']}, Score: {f['score']}, Network: {f.get('is_network', 'Removed')}")

asyncio.run(main())
