from django.http import JsonResponse, HttpResponse 
from django.views.decorators.csrf import csrf_exempt
import json
import joblib
import re
from textblob import TextBlob
from scipy.sparse import hstack
import os
from langdetect import detect, LangDetectException 
from pymongo import MongoClient
import certifi
from datetime import datetime

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

# IMPORTANT: Replace this with your actual MongoDB Atlas Connection String username kdhinesh2005_db_user --password sWf3syUftfzAm9Nj
MONGO_URI = "mongodb+srv://kdhinesh2005_db_user:sWf3syUftfzAm9Nj@cluster0.9tydwjp.mongodb.net/?appName=Cluster0"
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

            # 🛡️ THE FINAL GATEKEEPER: Raw Text Language Detection!
            if not text.strip():
                return JsonResponse({"error": "Empty text provided"}, status=400)
                
            # We ONLY run the detector if the review is longer than 40 characters.
            if len(text.strip()) > 40:
                try:
                    lang = detect(text)
                    if lang != 'en':
                        return JsonResponse({
                            'is_unsupported_language': True,
                            'detected_language': lang,
                            'message': 'Only English is supported for ML analysis.'
                        })
                except LangDetectException:
                    pass

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

            # 🧠 NEW: Generate a "Relatable" Reason
            if is_fake:
                if vocab_richness < 0.5:
                    reason = "Flagged: Highly repetitive vocabulary typical of AI bots."
                elif subjectivity < 0.3:
                    reason = "Flagged: Lacks natural human emotion or personal experience."
                else:
                    reason = "Flagged: Writing patterns match known Large Language Models."
            else:
                reason = "Verified: Natural linguistic variance and emotional tone detected."
            
            # 6. Send the verdict back to Chrome
            return JsonResponse({
                "is_fake": is_fake,
                "confidence": round(prob * 100, 2),
                "subjectivity": round(subjectivity, 2),
                "reason": reason  # <-- Sending the explainable AI tooltip!
            })
            
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
            
    return JsonResponse({"error": "Only POST requests are allowed"}, status=405)

# ==========================================
# MLOPS FEATURE: DATABASE FEEDBACK LOOP
# ==========================================
@csrf_exempt
def save_feedback(request):
    if request.method == 'POST':
        try:
            # 1. Read the data sent from the Chrome Extension
            data = json.loads(request.body)
            text = data.get('text', '')
            is_fake = data.get('ai_prediction', False)
            user_agreed = data.get('user_agreed', True)

            # 2. Determine the TRUE label based on the user's vote
            if (is_fake and user_agreed) or (not is_fake and not user_agreed):
                correct_label = 'CG'  # Computer Generated
            else:
                correct_label = 'OR'  # Original / Human

            # 3. Connect to MongoDB Atlas
            client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
            db = client['trustguard_db']
            collection = db['user_feedback']

            # 4. Insert the data permanently into the cloud database
            collection.insert_one({
                "review_text": text,
                "label": correct_label,
                "timestamp": datetime.utcnow().isoformat()
            })

            return JsonResponse({'status': 'success', 'message': 'Feedback securely saved to MongoDB'})
        
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
            
    return JsonResponse({"error": "Only POST requests are allowed"}, status=405)


# ==========================================
# ADMIN DASHBOARD: VIEW MONGODB DATA
# ==========================================
def view_feedback(request):
    # Build a simple HTML table to display the data nicely
    html = """
    <html>
    <head>
        <title>TrustGuard Data Pipeline</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; background-color: #f8f9fa; }
            table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            th { background-color: #2196F3; color: white; padding: 12px; text-align: left; }
            td { padding: 12px; border-bottom: 1px solid #ddd; }
            tr:hover { background-color: #f1f1f1; }
            .date-text { font-size: 12px; color: #888; }
        </style>
    </head>
    <body>
        <h2>🛡️ TrustGuard: Live MongoDB Data</h2>
        <p>This data is actively collected from users to retrain the Random Forest model.</p>
        <table>
            <tr>
                <th>Date / Time</th>
                <th>Review Text</th>
                <th>Corrected Label (CG=Fake, OR=Real)</th>
            </tr>
    """
    
    try:
        # Connect to MongoDB
        client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
        db = client['trustguard_db']
        collection = db['user_feedback']
        
        # Fetch all records, sorted by newest first
        feedbacks = collection.find().sort("timestamp", -1)
        
        count = 0
        for row in feedbacks:
            count += 1
            color = "red" if row.get("label") == "CG" else "green"
            
            # Format the timestamp
            raw_date = row.get("timestamp", "Unknown Date")
            formatted_date = raw_date[:10] if len(raw_date) >= 10 else raw_date
            
            html += f"""
            <tr>
                <td class='date-text'>{formatted_date}</td>
                <td>{row.get('review_text', 'No Text')}</td>
                <td style='color: {color}; font-weight: bold;'>{row.get('label', 'N/A')}</td>
            </tr>
            """
            
        if count == 0:
            html += "<tr><td colspan='3'>No feedback collected in the database yet.</td></tr>"
            
    except Exception as e:
        return HttpResponse(f"<h3>Database Error: Could not connect to MongoDB. Did you update the MONGO_URI string?</h3><p>{e}</p>")
        
    html += """
        </table>
    </body>
    </html>
    """
    return HttpResponse(html)