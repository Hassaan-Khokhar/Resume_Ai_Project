"""User profile, follow, education, experience, search & platform stats routes."""
import uuid
from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Body
from app.auth import get_current_user
from app.models import UpdateProfileRequest, EducationItem, ExperienceItem
from app.database import (users_col, posts_col, resumes_col, match_reports_col,
                          pipeline_trending_skills, pipeline_top_missing_skills,
                          pipeline_platform_stats, job_postings_col)

router = APIRouter(prefix="/api/users", tags=["Users"])


# ─── Profile ────────────────────────────────────

@router.get("/me")
async def get_me(user_id: str = Depends(get_current_user)):
    user = await users_col().find_one({"_id": ObjectId(user_id)}, {"password": 0})
    if not user:
        raise HTTPException(404, "User not found")
    user["_id"] = str(user["_id"])
    return {"success": True, "data": user}


@router.get("/profile/{uid}")
async def get_user_profile(uid: str, user_id: str = Depends(get_current_user)):
    user = await users_col().find_one({"_id": ObjectId(uid)}, {"password": 0})
    if not user:
        raise HTTPException(404, "User not found")
    user["_id"] = str(user["_id"])

    # Get their resume skills
    resume = await resumes_col().find_one({"user_id": uid}, sort=[("created_at", -1)])
    user["skills"] = resume.get("skills", []) if resume else []

    # Get avg match score
    pipeline = [{"$match": {"user_id": uid}}, {"$group": {"_id": None, "avg": {"$avg": "$match_score"}}}]
    avg = await match_reports_col().aggregate(pipeline).to_list(length=1)
    user["avg_match_score"] = round(avg[0]["avg"], 1) if avg else None

    # Get their posts (most recent 10) with comment counts
    pipeline = [
        {"$match": {"author_id": uid}},
        {"$sort": {"created_at": -1}},
        {"$limit": 10},
        {"$lookup": {
            "from": "comments",
            "let": {"pid": {"$toString": "$_id"}},
            "pipeline": [{"$match": {"$expr": {"$eq": ["$post_id", "$$pid"]}}}],
            "as": "comments_list",
        }},
        {"$addFields": {"comment_count": {"$size": "$comments_list"}}},
        {"$project": {"comments_list": 0}}
    ]
    user_posts = await posts_col().aggregate(pipeline).to_list(length=10)
    for p in user_posts:
        p["_id"] = str(p["_id"])
    user["posts"] = user_posts

    # Is the current user following this person?
    user["is_following"] = user_id in user.get("followers", [])

    return {"success": True, "data": user}


@router.put("/profile")
async def update_profile(req: UpdateProfileRequest, user_id: str = Depends(get_current_user)):
    update_fields = {}
    if req.name:
        update_fields["name"] = req.name
    if req.headline is not None:
        update_fields["headline"] = req.headline
    if req.location is not None:
        update_fields["location"] = req.location
    if req.about is not None:
        update_fields["about"] = req.about
    if req.avatar is not None:
        update_fields["avatar"] = req.avatar
    if req.cover_photo is not None:
        update_fields["cover_photo"] = req.cover_photo

    if update_fields:
        await users_col().update_one({"_id": ObjectId(user_id)}, {"$set": update_fields})

    user = await users_col().find_one({"_id": ObjectId(user_id)}, {"password": 0})
    user["_id"] = str(user["_id"])
    return {"success": True, "data": user}


# ─── Recommendations ──────────────────────────────

@router.get("/recommendations")
async def get_recommendations(user_id: str = Depends(get_current_user)):
    user = await users_col().find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(404, "User not found")
        
    my_following = set(user.get("following", []))
    exclude_ids = list(my_following) + [user_id]
    exclude_object_ids = [ObjectId(uid) for uid in exclude_ids if ObjectId.is_valid(uid)]
    
    # Get 10 users we don't follow
    pipeline = [
        {"$match": {"_id": {"$nin": exclude_object_ids}}},
        {"$sample": {"size": 10}},
        {"$project": {"password": 0, "email": 0}}
    ]
    recs = await users_col().aggregate(pipeline).to_list(length=10)
    
    formatted_recs = []
    for rec in recs:
        rec_id = str(rec["_id"])
        rec["_id"] = rec_id
        
        # Social proof logic
        # Who among my_following is in this user's followers?
        rec_followers = set(rec.get("followers", []))
        mutual_followers = list(my_following.intersection(rec_followers))
        
        social_proof = None
        if mutual_followers:
            # Need to get names of the mutual followers
            mutual_docs = await users_col().find({"_id": {"$in": [ObjectId(m) for m in mutual_followers[:2]]}}).to_list(length=2)
            names = [doc.get("name", "").split(" ")[0] for doc in mutual_docs]
            
            if len(mutual_followers) == 1:
                social_proof = f"{names[0]} follows them"
            elif len(mutual_followers) == 2:
                social_proof = f"{names[0]} and {names[1]} follow them"
            else:
                others_count = len(mutual_followers) - 2
                social_proof = f"{names[0]}, {names[1]} and {others_count} others follow them"
                
        rec["social_proof"] = social_proof
        formatted_recs.append(rec)
        
    # Split into companies and people
    companies = [r for r in formatted_recs if r.get("role") == "company"]
    people = [r for r in formatted_recs if r.get("role") != "company"]
    
    return {
        "success": True, 
        "data": {
            "people": people[:5],
            "companies": companies[:5]
        }
    }


# ─── Education CRUD ─────────────────────────────

@router.post("/education")
async def add_education(item: EducationItem, user_id: str = Depends(get_current_user)):
    edu_doc = item.model_dump()
    edu_doc["id"] = str(uuid.uuid4())[:8]  # Short unique ID for frontend reference
    await users_col().update_one({"_id": ObjectId(user_id)}, {"$push": {"education": edu_doc}})
    return {"success": True, "education": edu_doc}


@router.put("/education/{edu_id}")
async def update_education(edu_id: str, item: EducationItem, user_id: str = Depends(get_current_user)):
    update = {f"education.$.{k}": v for k, v in item.model_dump().items()}
    result = await users_col().update_one(
        {"_id": ObjectId(user_id), "education.id": edu_id},
        {"$set": update}
    )
    if result.modified_count == 0:
        raise HTTPException(404, "Education entry not found")
    return {"success": True}


@router.delete("/education/{edu_id}")
async def delete_education(edu_id: str, user_id: str = Depends(get_current_user)):
    await users_col().update_one({"_id": ObjectId(user_id)}, {"$pull": {"education": {"id": edu_id}}})
    return {"success": True}


# ─── Experience CRUD ────────────────────────────

@router.post("/experience")
async def add_experience(item: ExperienceItem, user_id: str = Depends(get_current_user)):
    exp_doc = item.model_dump()
    exp_doc["id"] = str(uuid.uuid4())[:8]
    await users_col().update_one({"_id": ObjectId(user_id)}, {"$push": {"experience": exp_doc}})
    return {"success": True, "experience": exp_doc}


@router.put("/experience/{exp_id}")
async def update_experience(exp_id: str, item: ExperienceItem, user_id: str = Depends(get_current_user)):
    update = {f"experience.$.{k}": v for k, v in item.model_dump().items()}
    result = await users_col().update_one(
        {"_id": ObjectId(user_id), "experience.id": exp_id},
        {"$set": update}
    )
    if result.modified_count == 0:
        raise HTTPException(404, "Experience entry not found")
    return {"success": True}


@router.delete("/experience/{exp_id}")
async def delete_experience(exp_id: str, user_id: str = Depends(get_current_user)):
    await users_col().update_one({"_id": ObjectId(user_id)}, {"$pull": {"experience": {"id": exp_id}}})
    return {"success": True}


# ─── Follow / Unfollow ──────────────────────────

@router.post("/{uid}/follow")
async def toggle_follow(uid: str, user_id: str = Depends(get_current_user)):
    if uid == user_id:
        raise HTTPException(400, "Cannot follow yourself")
    target = await users_col().find_one({"_id": ObjectId(uid)})
    if not target:
        raise HTTPException(404, "User not found")

    if user_id in target.get("followers", []):
        await users_col().update_one({"_id": ObjectId(uid)}, {"$pull": {"followers": user_id}})
        await users_col().update_one({"_id": ObjectId(user_id)}, {"$pull": {"following": uid}})
        return {"success": True, "following": False}
    else:
        await users_col().update_one({"_id": ObjectId(uid)}, {"$addToSet": {"followers": user_id}})
        await users_col().update_one({"_id": ObjectId(user_id)}, {"$addToSet": {"following": uid}})
        return {"success": True, "following": True}


# ─── Followers & Following Lists ────────────────
@router.get("/{uid}/followers")
async def get_followers(uid: str):
    user = await users_col().find_one({"_id": ObjectId(uid)})
    if not user: raise HTTPException(404, "User not found")
    follower_ids = [ObjectId(fid) for fid in user.get("followers", [])[:100]] # Limit to 100
    users = await users_col().find({"_id": {"$in": follower_ids}}, {"password": 0}).to_list(length=100)
    for u in users: u["_id"] = str(u["_id"])
    return {"success": True, "data": users}

@router.get("/{uid}/following")
async def get_following(uid: str):
    user = await users_col().find_one({"_id": ObjectId(uid)})
    if not user: raise HTTPException(404, "User not found")
    following_ids = [ObjectId(fid) for fid in user.get("following", [])[:100]] # Limit to 100
    users = await users_col().find({"_id": {"$in": following_ids}}, {"password": 0}).to_list(length=100)
    for u in users: u["_id"] = str(u["_id"])
    return {"success": True, "data": users}

# ─── Global Search (People + Jobs) ─────────────
@router.get("/search/global")
async def global_search(q: str = "", user_id: str = Depends(get_current_user)):
    if not q or len(q) < 1:
        return {"success": True, "people": [], "jobs": []}

    # Advanced Database Concept: Text Search Index
    people_query = {"$text": {"$search": q}}
    # Fallback to regex if text search yields no results (for partial matches)
    people = await users_col().find(people_query, {"password": 0, "score": {"$meta": "textScore"}}).sort([("score", {"$meta": "textScore"})]).limit(20).to_list(length=20)
    
    if not people:
        people_fallback = {"$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"username": {"$regex": q, "$options": "i"}},
            {"headline": {"$regex": q, "$options": "i"}}
        ]}
        people = await users_col().find(people_fallback, {"password": 0}).limit(20).to_list(length=20)

    for p in people: p["_id"] = str(p["_id"])
    
    job_query = {"$text": {"$search": q}}
    jobs = await job_postings_col().find(job_query, {"score": {"$meta": "textScore"}}).sort([("score", {"$meta": "textScore"})]).limit(20).to_list(length=20)
    
    if not jobs:
        job_fallback = {"$or": [
            {"title": {"$regex": q, "$options": "i"}},
            {"company_name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}}
        ]}
        jobs = await job_postings_col().find(job_fallback).limit(20).to_list(length=20)

    for j in jobs: j["_id"] = str(j["_id"])
    
    return {"success": True, "people": people, "jobs": jobs}

# ─── Platform Stats ─────────────────────────────
@router.get("/stats/trending-skills")
async def trending_skills():
    data = await pipeline_trending_skills()
    return {"success": True, "data": data}

@router.get("/stats/missing-skills")
async def missing_skills():
    data = await pipeline_top_missing_skills()
    return {"success": True, "data": data}

@router.get("/stats/platform")
async def platform_stats():
    data = await pipeline_platform_stats()
    return {"success": True, "data": data}
