import asyncio
from app.database import connect_db, posts_col
async def main():
    await connect_db()
    pipeline = [
        {"$addFields": {
            "author_id_str": {"$toString": "$author_id"},
        }},
        {"$lookup": {
            "from": "users",
            "let": {"aid": "$author_id_str"},
            "pipeline": [
                {"$addFields": {"_id_str": {"$toString": "$_id"}}},
                {"$match": {"$expr": {"$eq": ["$_id_str", "$$aid"]}}},
                {"$project": {"name": 1, "avatar": 1, "role": 1, "headline": 1, "username": 1}},
            ],
            "as": "author",
        }}
    ]
    posts = await posts_col().aggregate(pipeline).to_list(10)
    for p in posts:
        print(f"Post {p['_id']}, author: {p.get('author')}")
asyncio.run(main())
