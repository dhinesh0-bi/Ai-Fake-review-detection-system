from django.http import JsonResponse, HttpResponse # <-- Added HttpResponse here
from django.views.decorators.csrf import csrf_exempt
import json
import joblib
import re
from textblob import TextBlob
from scipy.sparse import hstack
import os
import csv  

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


# ==========================================
# MLOPS FEATURE: FEEDBACK LOOP
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
                correct_label = 'CG' 
            else:
                correct_label = 'OR'

            # 3. Define the path for the new feedback dataset
            csv_file_path = os.path.join(BASE_DIR, 'user_feedback.csv')
            file_exists = os.path.isfile(csv_file_path)

            # 4. Append the new data to the CSV securely
            with open(csv_file_path, mode='a', newline='', encoding='utf-8') as file:
                writer = csv.writer(file)
                if not file_exists:
                    writer.writerow(['Review_Text', 'label']) 
                writer.writerow([text, correct_label])

            return JsonResponse({'status': 'success', 'message': 'Feedback added to dataset'})
        
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
            
    return JsonResponse({"error": "Only POST requests are allowed"}, status=405)


# ==========================================
# HIDDEN ADMIN DASHBOARD: VIEW COLLECTED DATA
# ==========================================
def view_feedback(request):
    csv_file_path = os.path.join(BASE_DIR, 'user_feedback.csv')
    
    # Check if the file has been created yet
    if not os.path.exists(csv_file_path):
        return HttpResponse("<h3>No feedback collected yet! The file doesn't exist. Click some 👍/👎 buttons first.</h3>")
        
    # Build a simple HTML table to display the data nicely
    html = """
    <html>
    <head>
        <title>TrustGuard Data Pipeline</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; background-color: #f8f9fa; }
            table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            th { background-color: #ff9900; color: white; padding: 12px; text-align: left; }
            td { padding: 12px; border-bottom: 1px solid #ddd; }
            tr:hover { background-color: #f1f1f1; }
        </style>
    </head>
    <body>
        <h2>🛡️ TrustGuard: Collected MLOps Data</h2>
        <p>This data is actively collected from users to retrain the Random Forest model.</p>
        <table>
            <tr>
                <th>Review Text</th>
                <th>Corrected Label (CG=Fake, OR=Real)</th>
            </tr>
    """
    
    try:
        with open(csv_file_path, mode='r', encoding='utf-8') as file:
            reader = csv.reader(file)
            next(reader, None) # Skip the header row
            for row in reader:
                if len(row) >= 2:
                    # Color-code the labels for easier reading
                    color = "red" if row[1] == "CG" else "green"
                    html += f"<tr><td>{row[0]}</td><td style='color: {color}; font-weight: bold;'>{row[1]}</td></tr>"
    except Exception as e:
        return HttpResponse(f"Error reading file: {e}")
        
    html += """
        </table>
    </body>
    </html>
    """
    return HttpResponse(html)