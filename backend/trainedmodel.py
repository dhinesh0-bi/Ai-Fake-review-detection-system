import pandas as pd
import numpy as np
import re
from textblob import TextBlob
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from scipy.sparse import hstack
import joblib

print("Loading data...")
# Make sure your dataset 'data-fake.csv' is in this folder!
# Assuming columns: 'Review_Text', 'rating', 'label' (CG = Fake, OR = Real)
try:
    df = pd.read_csv(r'D:\finalyearproject\backend\data-fake.csv')
except FileNotFoundError:
    print("Error: data-fake.csv not found. Please add your dataset to the backend folder.")
    exit()

# 1. Clean Text
def clean_text(text):
    text = str(text).lower()
    return re.sub(r'[^a-z\s]', '', text)

df['clean_text'] = df['Review_Text'].apply(clean_text)

# 2. Extract Hybrid Features (Metadata + Sentiment)
def extract_features(row):
    text = str(row['Review_Text'])
    words = text.split()
    
    # Metadata
    vocab_richness = len(set(words)) / len(words) if len(words) > 0 else 0
    avg_word_len = sum(len(w) for w in words) / len(words) if len(words) > 0 else 0
    
    # Sentiment & Subjectivity
    blob = TextBlob(text)
    subjectivity = blob.sentiment.subjectivity
    polarity = blob.sentiment.polarity
    
    return pd.Series([vocab_richness, avg_word_len, subjectivity, polarity])

print("Extracting features (this may take a moment)...")
df[['vocab_richness', 'avg_word_len', 'subjectivity', 'polarity']] = df.apply(extract_features, axis=1)

# Target: 1 for Fake (CG), 0 for Real (OR)
y = df['label'].apply(lambda x: 1 if x == 'CG' else 0)

# 3. Textual Vectorization (TF-IDF)
print("Vectorizing text...")
tfidf = TfidfVectorizer(max_features=5000, stop_words='english')
X_text = tfidf.fit_transform(df['clean_text'])

# 4. Scale Numerical Features
numerical_features = ['rating', 'vocab_richness', 'avg_word_len', 'subjectivity', 'polarity']
scaler = StandardScaler()
X_num = scaler.fit_transform(df[numerical_features])

# Combine TF-IDF and Numerical Features
X_combined = hstack([X_text, X_num])

# 5. Train Random Forest Model
X_train, X_test, y_train, y_test = train_test_split(X_combined, y, test_size=0.2, random_state=42)

print("Training Random Forest Classifier...")
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

print(f"Model Training Complete! Accuracy on test set: {model.score(X_test, y_test):.4f}")

# 6. Save the models so the API can use them
joblib.dump(model, 'random_forest_model.pkl')
joblib.dump(tfidf, 'tfidf_vectorizer.pkl')
joblib.dump(scaler, 'scaler.pkl')
print("Model, Vectorizer, and Scaler saved successfully.")