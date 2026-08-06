import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"), http_options={"api_version": "v1"})

for model_name in ["text-embedding-004", "embedding-001"]:
    try:
        res = client.models.embed_content(model=model_name, contents="Hello")
        print(f"SUCCESS: {model_name}")
    except Exception as e:
        print(f"FAIL: {model_name} - {e}")
