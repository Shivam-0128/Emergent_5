from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import re
import uuid
import logging
from datetime import datetime, timezone, timedelta, date

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

app = FastAPI()
api = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
TOKEN_DAYS = 7
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    return bcrypt.checkpw(p.encode(), h.encode())


def create_token(user_id: str) -> str:
    payload = {"sub": user_id, "type": "access", "exp": datetime.now(timezone.utc) + timedelta(days=TOKEN_DAYS)}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


def public_user(u: dict) -> dict:
    return {"id": u["id"], "email": u["email"], "display_name": u["display_name"]}


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid or expired session")
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


def auth_response(response: Response, user: dict) -> dict:
    token = create_token(user["id"])
    response.set_cookie("access_token", token, httponly=True, secure=True, samesite="none",
                        max_age=TOKEN_DAYS * 86400, path="/")
    return {"user": public_user(user), "token": token}


class SignUpIn(BaseModel):
    display_name: str = Field(min_length=1, max_length=60)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class SignInIn(BaseModel):
    email: EmailStr
    password: str


class HabitIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    when_i_do_it: str = Field(default="", max_length=2000)
    shared: bool = False


class TickIn(BaseModel):
    date: str
    done: bool


class CommentIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


@api.post("/auth/register")
async def register(body: SignUpIn, response: Response):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "An account with this email already exists")
    user = {"id": str(uuid.uuid4()), "email": email, "display_name": body.display_name.strip(),
            "password_hash": hash_password(body.password), "created_at": now_iso()}
    if not user["display_name"]:
        raise HTTPException(400, "Display name is required")
    await db.users.insert_one(dict(user))
    return auth_response(response, user)


@api.post("/auth/login")
async def login(body: SignInIn, response: Response):
    user = await db.users.find_one({"email": body.email.lower().strip()}, {"_id": 0})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Incorrect email or password")
    return auth_response(response, user)


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/", secure=True, samesite="none")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


def compute_stats(dates: list) -> dict:
    ds = sorted({date.fromisoformat(d) for d in dates}, reverse=True)
    streak = 0
    if ds:
        streak = 1
        for prev, cur in zip(ds, ds[1:]):
            if (prev - cur).days == 1:
                streak += 1
            else:
                break
    return {"days_done": len(ds), "current_streak": streak}


async def habit_out(h: dict, user: dict, with_comments: bool = False) -> dict:
    owner = await db.users.find_one({"id": h["owner_id"]}, {"_id": 0, "display_name": 1})
    out = {
        "id": h["id"], "name": h["name"], "when_i_do_it": h["when_i_do_it"], "shared": h["shared"],
        "owner_id": h["owner_id"], "owner_name": owner["display_name"] if owner else "Unknown",
        "is_owner": h["owner_id"] == user["id"], "completions": sorted(h.get("completions", [])),
        "created_at": h["created_at"], **compute_stats(h.get("completions", [])),
    }
    if with_comments:
        out["comments"] = await db.comments.find({"habit_id": h["id"]}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return out


async def get_visible_habit(habit_id: str, user: dict) -> dict:
    h = await db.habits.find_one({"id": habit_id}, {"_id": 0})
    if not h or (not h["shared"] and h["owner_id"] != user["id"]):
        raise HTTPException(404, "Habit not found")
    return h


@api.get("/habits/mine")
async def my_habits(user: dict = Depends(get_current_user)):
    habits = await db.habits.find({"owner_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [await habit_out(h, user) for h in habits]


@api.post("/habits")
async def add_habit(body: HabitIn, user: dict = Depends(get_current_user)):
    name = body.name.strip()
    if not name:
        raise HTTPException(400, "Habit name is required")
    h = {"id": str(uuid.uuid4()), "owner_id": user["id"], "name": name,
         "when_i_do_it": body.when_i_do_it.strip(), "shared": body.shared, "completions": [],
         "created_at": now_iso()}
    await db.habits.insert_one(dict(h))
    return await habit_out(h, user)


@api.get("/habits/community")
async def community(user: dict = Depends(get_current_user)):
    habits = await db.habits.find({"shared": True}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [await habit_out(h, user) for h in habits]


@api.get("/habits/{habit_id}")
async def get_habit(habit_id: str, user: dict = Depends(get_current_user)):
    h = await get_visible_habit(habit_id, user)
    return await habit_out(h, user, with_comments=True)


@api.put("/habits/{habit_id}/ticks")
async def set_tick(habit_id: str, body: TickIn, user: dict = Depends(get_current_user)):
    h = await get_visible_habit(habit_id, user)
    if h["owner_id"] != user["id"]:
        raise HTTPException(403, "Only the owner can change this habit")
    if not DATE_RE.match(body.date):
        raise HTTPException(400, "Date must be YYYY-MM-DD")
    try:
        date.fromisoformat(body.date)
    except ValueError:
        raise HTTPException(400, "Invalid date")
    op = "$addToSet" if body.done else "$pull"
    await db.habits.update_one({"id": habit_id}, {op: {"completions": body.date}})
    h = await db.habits.find_one({"id": habit_id}, {"_id": 0})
    return await habit_out(h, user)


@api.post("/habits/{habit_id}/comments")
async def add_comment(habit_id: str, body: CommentIn, user: dict = Depends(get_current_user)):
    h = await get_visible_habit(habit_id, user)
    if not h["shared"]:
        raise HTTPException(400, "Comments are only available on shared habits")
    text = body.text.strip()
    if not text:
        raise HTTPException(400, "Comment cannot be empty")
    c = {"id": str(uuid.uuid4()), "habit_id": habit_id, "author_id": user["id"],
         "author_name": user["display_name"], "text": text, "created_at": now_iso()}
    await db.comments.insert_one(dict(c))
    return c


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ['CORS_ORIGINS'].split(','),
    allow_origin_regex=os.environ.get('CORS_ORIGIN_REGEX'),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.habits.create_index("id", unique=True)
    await db.habits.create_index("owner_id")
    await db.comments.create_index("habit_id")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
