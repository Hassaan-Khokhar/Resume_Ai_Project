"""Test Gemini through the LIVE SERVER and capture full error details."""
import requests
import fitz
import json

# Create test PDF
doc = fitz.open()
page = doc.new_page()
page.insert_text((72, 72), """Hassaan Ali
Skills: Flutter JavaScript PHP Laravel React Node.js SQL MongoDB 
Machine Learning Git Python Java C++ AI Artificial Intelligence
Database Design Bootstrap Tailwind HTML CSS
Soft Skills: Problem-Solving Teamwork Communication
Experience: Web Development Trainee ICT Trainings Jul-Oct 2024
Freelancer
Projects: Campus Portal (Flutter), Steel City Engineering (Laravel)
PawHab Pet Rehab (Node.js MySQL)""")
pdf_bytes = doc.tobytes()
doc.close()
with open('_test_live.pdf', 'wb') as f:
    f.write(pdf_bytes)

# Login
r = requests.post('http://localhost:8000/api/auth/login', 
    json={'email': 'alihassaan435@gmail.com', 'password': 'test123'})
token = r.json().get('access_token', '')
print(f"Login OK: {bool(token)}")

# Call analyze  
headers = {'Authorization': f'Bearer {token}'}
files = {'file': ('resume.pdf', open('_test_live.pdf', 'rb'), 'application/pdf')}
jd = """Job Title: Junior Full-Stack Web & Mobile Developer
Description: We are looking for a highly motivated Full-Stack Developer. 
Requirements: Flutter, PHP, Laravel, JavaScript, React, Node.js, SQL, Database Design, Machine Learning, Git
Location: Islamabad"""
form = {'job_description': jd}

print("Sending request to live server...")
r2 = requests.post('http://localhost:8000/api/analyze/', 
    headers=headers, files=files, data=form, timeout=120)
print(f"Status: {r2.status_code}")

result = r2.json()
print(f"Success: {result.get('success')}")

if result.get('success'):
    d = result['data']
    print(f"\n=== RESULTS ===")
    print(f"Match Score: {d.get('match_score')}")
    print(f"Model: {d.get('_meta', {}).get('model', 'UNKNOWN')}")
    print(f"Skills Score: {d.get('skills_score')}")
    print(f"Experience Score: {d.get('experience_score')}")  
    print(f"Keyword Score: {d.get('keyword_score')}")
    print(f"Summary (first 200): {d.get('rewritten_summary', '')[:200]}")
    print(f"Strengths: {d.get('strengths', [])[:2]}")
    print(f"Matched Skills: {d.get('matched_skills', [])[:10]}")
else:
    print(f"Error: {json.dumps(result, indent=2)[:500]}")

import os
try:
    os.remove('_test_live.pdf')
except:
    pass
