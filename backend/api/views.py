from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import joblib
import re
from textblob import TextBlob
from scipy.sparse import hstack
import os

# Get the path to the backend folder to find the .pkl files
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Load your 99% accurate models!
try:
    model = joblib.load(os.path.join(BASE_DIR, 'random_forest_model.pkl'))
    tfidf = joblib.load(os.path.join(BASE_DIR, 'tfidf_vectorizer.pkl'))
    scaler = joblib.load(os.path.join(BASE_DIR, 'scaler.pkl'))
    print("✅ ML Models loaded successfully!")
except Exception as e:
    print(f"❌ Error loading models: {e}")

def clean_text(text):
    text = str(text).lower()
    return re.sub(r'[^a-z\s]', '', text)

@csrf_exempt
def analyze_review(request):
    if request.method == 'POST':
        try:
            # 1. Get data from the Chrome Extension
            data = json.loads(request.body)
            text = data.get('text', '')
            rating = data.get('rating', 5)

            # 2. Process Text using TF-IDF
            cleaned = clean_text(text)
            vec_text = tfidf.transform([cleaned])
            
            # 3. Extract Stylometric & Emotion Features
            words = str(text).split()
            vocab_richness = len(set(words)) / len(words) if len(words) > 0 else 0
            avg_word_len = sum(len(w) for w in words) / len(words) if len(words) > 0 else 0
            
            blob = TextBlob(text)
            subjectivity = blob.sentiment.subjectivity
            polarity = blob.sentiment.polarity
            
            # 4. Scale and Combine
            vec_num = scaler.transform([[rating, vocab_richness, avg_word_len, subjectivity, polarity]])
            vec_final = hstack([vec_text, vec_num])
            
            # 5. Make the Prediction!
            prob = model.predict_proba(vec_final)[0][1] # Probability of being Fake
            is_fake = bool(prob > 0.5)
            
            # 6. Send the verdict back to Chrome
            return JsonResponse({
                "is_fake": is_fake,
                "confidence": round(prob * 100, 2),
                "subjectivity": round(subjectivity, 2)
            })
            
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
            
    return JsonResponse({"error": "Only POST requests are allowed"}, status=405)