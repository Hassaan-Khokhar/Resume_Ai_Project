"""Social feed routes: Posts, Likes, Comments + Job posts in feed."""
from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.auth import get_current_user
from app.models import CreatePostRequest, CommentRequest
from app.database import posts_col, comments_col, users_col, pipeline_user_feed, pipeline_feed_jobs, activity_logs_col

router = APIRouter(prefix="/api/posts", tags=["Posts"])


class UpdatePostRequest(BaseModel):
    content: Optional[str] = None


@router.get("/feed")
async def get_feed(skip: int = 0, limit: int = 20, user_id: str = Depends(get_current_user)):
    feed = await pipeline_user_feed(user_id, skip, limit)

    # Mix in recent job postings (only on first page)
    feed_jobs = []
    if skip == 0:
        feed_jobs = await pipeline_feed_jobs(limit=5)

    return {"success": True, "data": feed, "jobs": feed_jobs}


@router.post("/create")
async def create_post(req: CreatePostRequest, user_id: str = Depends(get_current_user)):
    post_doc = {
        "author_id": user_id,
        "content": req.content,
        "media": req.media,
        "tags": req.tags,
        "likes": [],
        "like_count": 0,
        "created_at": datetime.utcnow(),
    }
    result = await posts_col().insert_one(post_doc)
    await activity_logs_col().insert_one({"user_id": user_id, "action": "create_post", "created_at": datetime.utcnow()})
    return {"success": True, "post_id": str(result.inserted_id)}


@router.put("/{post_id}")
async def update_post(post_id: str, req: UpdatePostRequest, user_id: str = Depends(get_current_user)):
    post = await posts_col().find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(404, "Post not found")
    if post.get("author_id") != user_id:
        raise HTTPException(403, "Not your post")
    update = {}
    if req.content is not None:
        update["content"] = req.content
    if update:
        await posts_col().update_one({"_id": ObjectId(post_id)}, {"$set": update})
    return {"success": True}


@router.delete("/{post_id}")
async def delete_post(post_id: str, user_id: str = Depends(get_current_user)):
    post = await posts_col().find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(404, "Post not found")
    if post.get("author_id") != user_id:
        raise HTTPException(403, "Not your post")
    await posts_col().delete_one({"_id": ObjectId(post_id)})
    # Also delete associated comments
    await comments_col().delete_many({"post_id": post_id})
    return {"success": True}


@router.post("/{post_id}/like")
async def toggle_like(post_id: str, user_id: str = Depends(get_current_user)):
    post = await posts_col().find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(404, "Post not found")

    if user_id in post.get("likes", []):
        await posts_col().update_one({"_id": ObjectId(post_id)}, {"$pull": {"likes": user_id}, "$inc": {"like_count": -1}})
        return {"success": True, "liked": False}
    else:
        await posts_col().update_one({"_id": ObjectId(post_id)}, {"$addToSet": {"likes": user_id}, "$inc": {"like_count": 1}})
        return {"success": True, "liked": True}


@router.get("/{post_id}/comments")
async def get_comments(post_id: str, skip: int = 0, limit: int = 10):
    pipeline = [
        {"$match": {"post_id": post_id}},
        {"$sort": {"created_at": -1}},
        {"$skip": skip},
        {"$limit": limit},
        {"$lookup": {
            "from": "users",
            "let": {"uid": "$user_id"},
            "pipeline": [
                {"$addFields": {"_id_str": {"$toString": "$_id"}}},
                {"$match": {"$expr": {"$eq": ["$_id_str", "$$uid"]}}},
                {"$project": {"name": 1, "avatar": 1, "headline": 1}},
            ],
            "as": "author",
        }},
        {"$unwind": {"path": "$author", "preserveNullAndEmptyArrays": True}},
    ]
    result = await comments_col().aggregate(pipeline).to_list(length=limit)
    for r in result:
        r["_id"] = str(r["_id"])
        if "author" in r and isinstance(r["author"], dict) and "_id" in r["author"]:
            r["author"]["_id"] = str(r["author"]["_id"])
    return {"success": True, "data": result}

@router.delete("/{post_id}/comments/{comment_id}")
async def delete_comment(post_id: str, comment_id: str, user_id: str = Depends(get_current_user)):
    comment = await comments_col().find_one({"_id": ObjectId(comment_id)})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Allow post author OR comment author to delete
    post = await posts_col().find_one({"_id": ObjectId(post_id)})
    post_author = post.get("author_id") if post else None
    
    if comment.get("user_id") != user_id and post_author != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
    
    # Delete the comment
    await comments_col().delete_one({"_id": ObjectId(comment_id)})
    # Also delete replies to this comment
    await comments_col().delete_many({"parent_id": comment_id})
    return {"success": True}


@router.post("/{post_id}/comment")
async def add_comment(post_id: str, req: CommentRequest, user_id: str = Depends(get_current_user)):
    comment_doc = {
        "post_id": post_id,
        "user_id": user_id,
        "text": req.text,
        "parent_id": req.parent_id,
        "likes": [],
        "like_count": 0,
        "created_at": datetime.utcnow(),
    }
    await comments_col().insert_one(comment_doc)
    return {"success": True}

@router.post("/{post_id}/comments/{comment_id}/like")
async def like_comment(post_id: str, comment_id: str, user_id: str = Depends(get_current_user)):
    from bson import ObjectId
    comment = await comments_col().find_one({"_id": ObjectId(comment_id)})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    if user_id in comment.get("likes", []):
        await comments_col().update_one({"_id": ObjectId(comment_id)}, {"$pull": {"likes": user_id}, "$inc": {"like_count": -1}})
        return {"success": True, "liked": False}
    else:
        await comments_col().update_one({"_id": ObjectId(comment_id)}, {"$addToSet": {"likes": user_id}, "$inc": {"like_count": 1}})
        return {"success": True, "liked": True}
