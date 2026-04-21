import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from services.ai_service import ai_service

try:
    print("Testing Azure OpenAI Chat Completion (Deployment: gpt-4o-mini)...")
    res = ai_service.chat("You are a helpful assistant.", "Respond with exactly 'HELLO OPENAI'")
    print(f"Response: {res}")
    if "HELLO" in res:
        print("[SUCCESS] Chat API is working!")
    else:
        print("[WARNING] Chat API responded but unexpected output.")
except Exception as e:
    print(f"[ERROR] Chat API Failed: {e}")

try:
    print("\nTesting Azure OpenAI Embeddings (Deployment: text-embedding-ada-002)...")
    emb = ai_service.embed(["Test string"])
    if emb and len(emb[0]) > 0:
        print(f"[SUCCESS] Embeddings API working! Generated vector of size {len(emb[0])}")
    else:
        print("[WARNING] Embeddings API response was empty or zero vector fallback.")
except Exception as e:
    print(f"[ERROR] Embeddings API Failed: {e}")
