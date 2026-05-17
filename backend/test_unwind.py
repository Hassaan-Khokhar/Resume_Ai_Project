import asyncio
from app.database import pipeline_user_feed, connect_db, posts_col
async def main():
    await connect_db()
    from bson import ObjectId
    user_id = '6a00cf5034c5a6aa39d9c4ee'
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
                {"$project": {"name": 1}},
            ],
            "as": "author",
        }},
    ]
    posts = await posts_col().aggregate(pipeline).to_list(10)
    print("After lookup:")
    for p in posts:
        print(f"ID: {p['_id']}, author array: {p.get('author')}")
        
    pipeline.append({"$unwind": {"path": "$author", "preserveNullAndEmptyArrays": True}})
    posts = await posts_col().aggregate(pipeline).to_list(10)
    print("After unwind:")
    for p in posts:
        print(f"ID: {p['_id']}, author: {p.get('author')}")
asyncio.run(main())
