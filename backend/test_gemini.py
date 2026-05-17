"""Quick diagnostic: test the Gemini engine inside the same Python env as the server."""
import asyncio
import sys
import traceback

async def test():
    try:
        from app.gemini_engine import analyze_with_gemini
        from app.config import settings
        
        print(f"Python: {sys.version}")
        print(f"Model: {settings.GEMINI_MODEL}")
        print(f"API Key: {settings.GEMINI_API_KEY[:15]}...")
        print(f"stdout encoding: {sys.stdout.encoding}")
        print()
        
        print("Calling analyze_with_gemini...")
        result = await analyze_with_gemini(
            "Hassaan Ali Skills Flutter JavaScript PHP Laravel React Node.js SQL Database Design Machine Learning Git",
            "Looking for Junior Full-Stack Developer with Flutter React Node.js SQL Machine Learning Git experience"
        )
        print(f"SUCCESS! Score: {result['match_score']}")
        print(f"Model used: {result.get('_meta', {}).get('model')}")
        print(f"Summary: {result.get('rewritten_summary', '')[:150]}")
        
    except Exception as e:
        print(f"EXCEPTION TYPE: {type(e).__name__}")
        print(f"EXCEPTION MSG: {e}")
        traceback.print_exc()

asyncio.run(test())
