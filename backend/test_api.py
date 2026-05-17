import requests
from pymongo import MongoClient

try:
    client = MongoClient("mongodb://localhost:27017")
    db = client["resume_analyzer"]
    user = db.users.find_one()
    
    login_data = {"email": user["email"], "password": "password123"}
    r = requests.post("http://localhost:8000/api/auth/login", json=login_data)
    token = r.json().get("token")
    if not token:
        print("Login failed:", r.text)
    else:
        headers = {"Authorization": f"Bearer {token}"}
        r = requests.get("http://localhost:8000/api/posts/feed?skip=0", headers=headers)
        print("Status code:", r.status_code)
        if r.status_code != 200:
            print("Response:", r.text)
        else:
            print("Success! Data length:", len(r.json().get("data", [])))
            print("Feed data:", r.json().get("data")[:1])
except Exception as e:
    print(e)
