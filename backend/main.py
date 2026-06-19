import os
import uuid
import time
import base64
import json
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Header, HTTPException, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from azure.storage.blob import BlobServiceClient, ContentSettings
from pydantic import BaseModel
import bcrypt
import jwt
import pymongo
from pymongo import MongoClient


# Load variables from .env file if present
if os.path.exists(".env"):
    with open(".env", "r") as f:
        for line in f:
            if "=" in line and not line.strip().startswith("#"):
                key, val = line.strip().split("=", 1)
                os.environ[key.strip()] = val.strip().strip('"').strip("'")

AZURE_STORAGE_CONNECTION_STRING = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
AZURE_STORAGE_CONTAINER_NAME = os.environ.get("AZURE_STORAGE_CONTAINER_NAME", "speakflow-recordings")

blob_service_client = None
if AZURE_STORAGE_CONNECTION_STRING:
    try:
        blob_service_client = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
        container_client = blob_service_client.get_container_client(AZURE_STORAGE_CONTAINER_NAME)
        if not container_client.exists():
            container_client.create_container(public_access="blob")
    except Exception as e:
        print(f"Warning: Failed to initialize Azure Blob Storage: {e}")

# MongoDB Database Connection
MONGODB_URI = os.environ.get("MONGODB_URI")
client = None
db = None
users_col = None
recordings_col = None

if MONGODB_URI:
    try:
        if "[YOUR-PASSWORD]" in MONGODB_URI or "<password>" in MONGODB_URI:
            print("Warning: MONGODB_URI contains placeholder. Please set your actual database password in backend/.env. Running with in-memory database fallback.")
        else:
            client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
            # Force connection check
            client.admin.command('ping')
            db = client.get_database("speakflow")
            users_col = db["users"]
            recordings_col = db["recordings"]
            print("Successfully connected to MongoDB Atlas.")
    except Exception as e:
        print(f"Warning: Failed to connect to MongoDB Atlas: {e}. Running with in-memory database fallback.")
else:
    print("Warning: MONGODB_URI is not set in backend/.env. Running with in-memory database fallback.")



# In-memory storage fallback for local development if PostgreSQL is not connected
in_memory_users = {}      # email -> user_doc
in_memory_recordings = []   # list of recording_docs

# --- Database Helper Functions ---
def db_get_user_by_email(email: str):
    email = email.lower().strip()
    if users_col is not None:
        try:
            user = users_col.find_one({"email": email})
            if user:
                # Convert ObjectIds to strings so they are JSON-serializable
                if "_id" in user:
                    user["_id"] = str(user["_id"])
                return user
        except Exception as e:
            print(f"MongoDB error fetching user: {e}")
    return in_memory_users.get(email)

def db_create_user(user_doc: dict):
    email = user_doc["email"].lower().strip()
    user_doc["email"] = email
    if users_col is not None:
        try:
            if users_col.find_one({"email": email}):
                raise Exception("Email already exists")
            users_col.insert_one(user_doc)
            return True
        except Exception as e:
            print(f"MongoDB error inserting user: {e}")
            raise e
    if email in in_memory_users:
        raise Exception("Email already exists")
    in_memory_users[email] = user_doc
    return True

def db_get_recordings_for_user(user_email: str, limit: int = 0):
    user_email = user_email.lower().strip()
    if recordings_col is not None:
        try:
            cursor = recordings_col.find({"user_email": user_email}).sort("created_at", -1)
            if limit > 0:
                cursor = cursor.limit(limit)
            recs = list(cursor)
            for r in recs:
                if "_id" in r:
                    r["_id"] = str(r["_id"])
            return recs
        except Exception as e:
            print(f"MongoDB error fetching recordings: {e}")
    # In-memory fallback
    recs = [r for r in in_memory_recordings if r.get("user_email") == user_email]
    recs.sort(key=lambda x: x.get("created_at", 0), reverse=True)
    if limit > 0:
        return recs[:limit]
    return recs

def db_create_recording(rec_doc: dict):
    rec_doc["user_email"] = rec_doc["user_email"].lower().strip()
    if recordings_col is not None:
        try:
            # Create a copy to avoid mutating the original dict (like adding MongoDB _id)
            doc_to_insert = dict(rec_doc)
            recordings_col.insert_one(doc_to_insert)
            return True
        except Exception as e:
            print(f"MongoDB error saving recording: {e}")
    in_memory_recordings.append(rec_doc)
    return True

def db_delete_recording(rec_id: str, user_email: str) -> bool:
    user_email = user_email.lower().strip()
    if recordings_col is not None:
        try:
            res = recordings_col.delete_one({"id": rec_id, "user_email": user_email})
            if res.deleted_count > 0:
                return True
        except Exception as e:
            print(f"MongoDB error deleting recording: {e}")
    # In-memory fallback
    global in_memory_recordings
    initial_len = len(in_memory_recordings)
    in_memory_recordings = [
        r for r in in_memory_recordings 
        if not (r.get("id") == rec_id and r.get("user_email") == user_email)
    ]
    return len(in_memory_recordings) < initial_len



# --- Authentication Helpers ---
JWT_SECRET = os.environ.get("JWT_SECRET", "speakflow-super-secret-key-change-in-prod-19283746")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 168  # 7 days

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

def create_access_token(email: str, name: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "sub": email.lower().strip(),
        "name": name,
        "exp": expire
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except jwt.PyJWTError:
        return None

def get_current_user(authorization: str = Header(None)) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication token is required")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header. Must start with 'Bearer '")
    token = authorization.split(" ")[1]
    email = decode_access_token(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid or expired session token. Please log in again.")
    return email

# --- API Request Models ---
class SignupRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

app = FastAPI(title="SpeakFlow Speech Coach Backend")

# Enable CORS for frontend querying
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "https://speakflow-jet.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

COACH_PROMPT = """You are an expert speech and communication coach.

Input:

* Topic (optional)
* Speaker audio

Evaluate universal speaking skills, not domain-specific performance.

Assess:

Delivery:

* Confidence
* Fluency
* Clarity
* Pronunciation
* Pace

Language:

* Vocabulary
* Grammar

Communication:

* Structure
* Topic Relevance
* Engagement

Speech Habits:

* Fillers
* Repetitions
* Pauses
* Sentence Restarts

Score each category from 0-10 with concise reasoning.

Speaker Levels:
0-2 Novice
2-4 Beginner
4-6 Developing
6-8 Intermediate
8-9 Advanced
9-10 Exceptional

Return ONLY valid JSON matching this schema:

{
"overall_score": 0,
"speaker_level": "",
"category_scores": {
"delivery": 0,
"language": 0,
"communication": 0,
"speech_habits": 0
},
"scores": {
"confidence": {"score": 0, "reason": ""},
"fluency": {"score": 0, "reason": ""},
"clarity": {"score": 0, "reason": ""},
"pronunciation": {"score": 0, "reason": ""},
"pace": {"score": 0, "reason": ""},
"vocabulary": {"score": 0, "reason": ""},
"grammar": {"score": 0, "reason": ""},
"structure": {"score": 0, "reason": ""},
"topic_relevance": {"score": 0, "reason": ""},
"engagement": {"score": 0, "reason": ""}
},
"metrics": {
"estimated_speaking_duration_seconds": 0,
"estimated_total_words": 0,
"estimated_words_per_minute": 0,
"total_fillers": 0,
"total_repetitions": 0,
"estimated_long_pauses": 0,
"sentence_restarts": 0
},
"top_strength": "",
"top_weakness": "",
"strengths": [],
"weaknesses": [],
"filler_words": [{"word": "", "count": 0}],
"repeated_words": [{"word": "", "count": 0}],
"focus_for_next_session": [],
"improvements": [{
"priority": "high|medium|low",
"issue": "",
"why_it_matters": "",
"suggestion": ""
}],
"speech_moments": [{
"issue_type": "",
"example": "",
"improved_version": ""
}],
"practice_exercises": [],
"summary": "",
"improved_response": ""
}

Rules:

* Output JSON only.
* No markdown or extra text.
* Base analysis on actual audio.
* Identify fillers, pauses, repetitions, hesitation, pacing, and confidence signals.
* Keep feedback specific, actionable, and concise.
* Prioritize highest-impact improvements first.
* Preserve intent when generating improved_response.

"""

def upload_to_azure(file_bytes: bytes, original_filename: str, mime_type: str) -> str:
    if not blob_service_client:
        return ""
    try:
        ext = original_filename.split(".")[-1] if "." in original_filename else "webm"
        unique_name = f"session_{int(time.time())}_{uuid.uuid4().hex[:8]}.{ext}"
        
        blob_client = blob_service_client.get_blob_client(
            container=AZURE_STORAGE_CONTAINER_NAME,
            blob=unique_name
        )
        content_settings = ContentSettings(content_type=mime_type)
        blob_client.upload_blob(
            file_bytes,
            overwrite=True,
            content_settings=content_settings
        )
        return blob_client.url
    except Exception as e:
        print(f"Error uploading blob to Azure Storage: {e}")
        return ""

# --- Authentication Routes ---
@app.post("/api/auth/signup")
async def signup(req: SignupRequest):
    email = req.email.lower().strip()
    if not email or not req.password or not req.name.strip():
        raise HTTPException(status_code=400, detail="All fields (name, email, password) are required")
    
    existing = db_get_user_by_email(email)
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email address already exists")
    
    pw_hash = hash_password(req.password)
    user_doc = {
        "name": req.name.strip(),
        "email": email,
        "password_hash": pw_hash,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    try:
        db_create_user(user_doc)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration database error: {str(e)}")
        
    token = create_access_token(email, req.name.strip())
    return {
        "token": token,
        "user": {
            "name": req.name.strip(),
            "email": email
        }
    }

@app.post("/api/auth/login")
async def login(req: LoginRequest):
    email = req.email.lower().strip()
    if not email or not req.password:
        raise HTTPException(status_code=400, detail="Email and password are required")
        
    user = db_get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email address or password")
        
    if not verify_password(req.password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Incorrect email address or password")
        
    token = create_access_token(email, user.get("name", ""))
    return {
        "token": token,
        "user": {
            "name": user.get("name", ""),
            "email": email
        }
    }

# --- Audio Analysis & Recordings Routes ---
@app.post("/api/analyze")
async def analyze_audio(
    file: UploadFile = File(...),
    topic: Optional[str] = Form(None),
    x_gemini_api_key: str = Header(None),
    current_user: str = Depends(get_current_user)
):
    try:
        # Read the uploaded audio bytes
        audio_content = await file.read()
        mime_type = file.content_type or "audio/webm"
        
        # Upload to Azure Blob Storage if configured
        azure_url = upload_to_azure(audio_content, file.filename, mime_type)
    except Exception as upload_err:
        print(f"Warning: Azure Blob Storage upload failed: {upload_err}")
        azure_url = ""

    # Fetch last 3 recordings for history context
    past_recordings = db_get_recordings_for_user(current_user, limit=3)
    history_context = ""
    if past_recordings:
        history_context += "\n\n--- PREVIOUS PERFORMANCE HISTORY ---\n"
        history_context += "The speaker has completed previous speech coaching sessions. Here is the feedback they received on their last recordings:\n"
        for i, prec in enumerate(reversed(past_recordings)):
            analysis = prec.get("analysis", {})
            date_str = prec.get("timestamp", "Unknown time")
            history_context += f"\nPrevious Recording {i+1} (Date: {date_str}):\n"
            history_context += f"- Overall Score: {analysis.get('overall_score', 'N/A')}/10\n"
            history_context += f"- Top Strength: {analysis.get('top_strength', 'N/A')}\n"
            history_context += f"- Top Weakness: {analysis.get('top_weakness', 'N/A')}\n"
            
            weaknesses = analysis.get("weaknesses", [])
            if weaknesses:
                history_context += f"- Areas for Improvement: {', '.join(weaknesses)}\n"
                
            focus = analysis.get("focus_for_next_session", [])
            if focus:
                history_context += f"- Suggested Focus: {', '.join(focus)}\n"
        
        history_context += "\nINSTRUCTIONS FOR PROGRESS TRACKING:\n"
        history_context += "1. Examine the 'PREVIOUS PERFORMANCE HISTORY' provided above.\n"
        history_context += "2. In your evaluation of the current audio, determine if the speaker has made progress regarding their previous weaknesses and suggested focus areas.\n"
        history_context += "3. In the 'summary' of your JSON response, explicitly comment on whether the speaker has shown improvement, what they did better, and what still needs work relative to their history.\n"
        history_context += "4. Keep the evaluation objective: if they did not improve, state it constructively and refine the suggestion. if they improved, acknowledge their progress.\n"
        history_context += "-------------------------------------\n"

    # Handle Mock API Key
    if x_gemini_api_key == "mock-gemini-key":
        mock_json_text = """{
  "overall_score": 8,
  "speaker_level": "Intermediate",
  "category_scores": {
    "delivery": 8,
    "language": 8,
    "communication": 7,
    "speech_habits": 8
  },
  "scores": {
    "confidence": {"score": 8, "reason": "Vocal authority is strong, but minor hesitation in transitions."},
    "fluency": {"score": 8, "reason": "Flow is steady with minor pauses."},
    "clarity": {"score": 8, "reason": "Articulation is clear and easy to follow."},
    "pronunciation": {"score": 9, "reason": "Standard accent with precise vowels."},
    "pace": {"score": 7, "reason": "Speaking speed was slightly fast at start but settled down."},
    "vocabulary": {"score": 8, "reason": "Varied lexicon, good choice of professional words."},
    "grammar": {"score": 9, "reason": "Accurate grammar, no syntax errors detected."},
    "structure": {"score": 7, "reason": "Introduction was clear, body had good detail, needs a stronger conclusion."},
    "topic_relevance": {"score": 9, "reason": "Kept close focus on the speaking theme."},
    "engagement": {"score": 7, "reason": "Tone is informative but could use more vocal variety to excite listeners."}
  },
  "metrics": {
    "estimated_speaking_duration_seconds": 12,
    "estimated_total_words": 30,
    "estimated_words_per_minute": 150,
    "total_fillers": 1,
    "total_repetitions": 0,
    "estimated_long_pauses": 1,
    "sentence_restarts": 0
  },
  "top_strength": "Clear articulation and grammatical accuracy.",
  "top_weakness": "Slightly fast initial pacing and lack of vocal variety.",
  "strengths": [
    "Excellent vocabulary and structure in the opening statement.",
    "Very few filler words used during the recording."
  ],
  "weaknesses": [
    "Vocal modulation was somewhat flat during explanations.",
    "Ending was abrupt without a structured wrap-up."
  ],
  "filler_words": [
    {"word": "um", "count": 1}
  ],
  "repeated_words": [],
  "focus_for_next_session": [
    "Practice pausing before transitions rather than speaking continuously.",
    "Vary pitch when introducing key takeaways."
  ],
  "improvements": [
    {
      "priority": "high",
      "issue": "Abrupt ending",
      "why_it_matters": "Reduces the impact and recall of your core message.",
      "suggestion": "End with a summary sentence: 'In conclusion, key takeaway is...'"
    },
    {
      "priority": "medium",
      "issue": "Flat pitch",
      "why_it_matters": "Listener engagement drops when tone lacks variety.",
      "suggestion": "Emphasize nouns and action verbs with higher pitch."
    }
  ],
  "speech_moments": [
    {
      "issue_type": "filler word",
      "example": "I think... um, we should focus on...",
      "improved_version": "I think we should focus on..."
    }
  ],
  "summary": "Overall, you demonstrated strong communication control. By slowing down transitions and concluding with intention, you will elevate your delivery from intermediate to advanced.",
  "improved_response": "We should prioritize developing a clean structured message. Articulation is excellent, and focus on pacing will maximize audience engagement."
}"""
        evaluation_json = json.loads(mock_json_text)
        
        # Save recording to database
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %I:%M %p")
        rec_id = uuid.uuid4().hex
        rec_doc = {
            "id": rec_id,
            "user_email": current_user,
            "url": azure_url or f"blob:http://localhost:5173/{rec_id}",
            "name": f"Recording #{len(db_get_recordings_for_user(current_user)) + 1}",
            "topic": topic if (topic and topic.strip()) else "General Speech",
            "timestamp": timestamp,
            "duration": "12s",
            "analysis": evaluation_json,
            "created_at": datetime.now(timezone.utc).timestamp()
        }
        db_create_recording(rec_doc)
        
        return {
            "id": rec_id,
            "url": rec_doc["url"],
            "name": rec_doc["name"],
            "topic": rec_doc["topic"],
            "timestamp": rec_doc["timestamp"],
            "duration": rec_doc["duration"],
            "analysis": rec_doc["analysis"],
            "audio_url": azure_url or f"blob:http://localhost:5173/{rec_id}",
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "text": mock_json_text
                            }
                        ]
                    }
                }
            ]
        }

    try:
        api_key_to_use = os.environ.get("GEMINI_API_KEY") or x_gemini_api_key
        if not api_key_to_use:
            raise HTTPException(
                status_code=400,
                detail="Missing Gemini API Key. Please enter a key or configure GEMINI_API_KEY in the backend .env"
            )

        # Initialize the Google GenAI client
        client = genai.Client(api_key=api_key_to_use)
        
        prompt_content = COACH_PROMPT
        if topic and topic.strip():
            prompt_content += f"\n\n--- TARGET SPEAKING TOPIC ---\n"
            prompt_content += f"The speaker was asked to address the following topic: \"{topic}\"\n"
            prompt_content += "In your evaluation under 'Communication' -> 'Topic Relevance', you MUST evaluate whether they addressed this topic, kept on track, and stayed relevant to the theme.\n"
            prompt_content += "-------------------------------\n"
        if history_context:
            prompt_content += history_context

        # Generate content using the official SDK
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=[
                prompt_content,
                types.Part.from_bytes(
                    data=audio_content,
                    mime_type=mime_type
                )
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        candidate_text = response.text
        if not candidate_text:
            raise HTTPException(
                status_code=500,
                detail="Empty text response returned by Gemini API"
            )
            
        # Parse text into JSON
        try:
            clean_text = candidate_text.strip()
            if clean_text.startswith("```"):
                lines = clean_text.splitlines()
                if lines[0].startswith("```json") or lines[0].startswith("```"):
                    lines = lines[1:-1]
                clean_text = "\n".join(lines).strip()
            evaluation_json = json.loads(clean_text)
        except Exception as json_err:
            print(f"Warning: Failed to parse Gemini response as JSON: {json_err}. Raw text: {candidate_text}")
            raise HTTPException(status_code=500, detail="Gemini response was not valid JSON speech analysis data.")

        # Save to database
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %I:%M %p")
        duration_sec = evaluation_json.get("metrics", {}).get("estimated_speaking_duration_seconds", 0)
        if duration_sec == 0:
            duration_sec = 10  # default fallback
        
        rec_id = uuid.uuid4().hex
        rec_doc = {
            "id": rec_id,
            "user_email": current_user,
            "url": azure_url or f"blob:http://localhost:5173/{rec_id}",
            "name": f"Recording #{len(db_get_recordings_for_user(current_user)) + 1}",
            "topic": topic if (topic and topic.strip()) else "General Speech",
            "timestamp": timestamp,
            "duration": f"{duration_sec}s",
            "analysis": evaluation_json,
            "created_at": datetime.now(timezone.utc).timestamp()
        }
        
        db_create_recording(rec_doc)
        
        return {
            "id": rec_id,
            "url": rec_doc["url"],
            "name": rec_doc["name"],
            "topic": rec_doc["topic"],
            "timestamp": rec_doc["timestamp"],
            "duration": rec_doc["duration"],
            "analysis": rec_doc["analysis"],
            "audio_url": azure_url,
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "text": candidate_text
                            }
                        ]
                    }
                }
            ]
        }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/recordings")
async def get_recordings(current_user: str = Depends(get_current_user)):
    try:
        recordings = db_get_recordings_for_user(current_user)
        formatted_recs = []
        for rec in recordings:
            formatted_recs.append({
                "id": rec.get("id") or str(rec.get("_id")),
                "url": rec.get("url"),
                "name": rec.get("name"),
                "topic": rec.get("topic") or "General Speech",
                "timestamp": rec.get("timestamp"),
                "duration": rec.get("duration"),
                "analysis": rec.get("analysis")
            })
        return formatted_recs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/recordings/{recording_id}")
async def delete_recording(recording_id: str, current_user: str = Depends(get_current_user)):
    try:
        success = db_delete_recording(recording_id, current_user)
        if not success:
            raise HTTPException(status_code=404, detail="Recording not found or unauthorized")
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy", 
        "mongodb_connected": users_col is not None,
        "gemini_configured": bool(os.environ.get("GEMINI_API_KEY"))
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

