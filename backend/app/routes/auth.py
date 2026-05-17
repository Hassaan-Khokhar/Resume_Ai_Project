"""Auth routes: Register & Login."""
from datetime import datetime
from fastapi import APIRouter, HTTPException
from app.models import RegisterRequest, LoginRequest, TokenResponse
from app.auth import hash_password, verify_password, create_access_token
from app.database import users_col, activity_logs_col

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest):
    # Check existing
    if await users_col().find_one({"email": req.email}):
        raise HTTPException(400, "Email already registered")
    if await users_col().find_one({"username": req.username}):
        raise HTTPException(400, "Username already taken")

    user_doc = {
        "name": req.name,
        "username": req.username,
        "email": req.email,
        "password": hash_password(req.password),
        "role": req.role,
        "headline": "",
        "location": "",
        "about": "",
        "avatar": "",
        "cover_photo": "",
        "education": [],
        "experience": [],
        "followers": [],
        "following": [],
        "created_at": datetime.utcnow(),
    }
    result = await users_col().insert_one(user_doc)
    user_id = str(result.inserted_id)

    token = create_access_token({"sub": user_id})
    await activity_logs_col().insert_one({"user_id": user_id, "action": "register", "created_at": datetime.utcnow()})

    return TokenResponse(
        access_token=token,
        user={"id": user_id, "name": req.name, "email": req.email, "role": req.role,
              "avatar": "", "cover_photo": "", "username": req.username, "headline": ""},
    )


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    user = await users_col().find_one({"email": req.email})
    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(401, "Invalid email or password")

    user_id = str(user["_id"])
    token = create_access_token({"sub": user_id})
    await activity_logs_col().insert_one({"user_id": user_id, "action": "login", "created_at": datetime.utcnow()})

    return TokenResponse(
        access_token=token,
        user={"id": user_id, "name": user["name"], "email": user["email"], "role": user["role"],
              "avatar": user.get("avatar", ""), "cover_photo": user.get("cover_photo", ""), 
              "username": user["username"], "headline": user.get("headline", "")},
    )
