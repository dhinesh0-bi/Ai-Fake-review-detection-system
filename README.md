<div align="center">

<img src="extension/icon.jpeg" alt="TrustGuard Logo" width="120" style="border-radius: 20px;"/>

# 🛡️ TrustGuard — AI Fake Review Detection System

**A full-stack machine learning system that detects AI-generated and fake product reviews in real-time, directly inside your browser.**

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Django](https://img.shields.io/badge/Django-6.0-092E20?style=for-the-badge&logo=django&logoColor=white)](https://djangoproject.com)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-RandomForest-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension%20MV3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![Render](https://img.shields.io/badge/Deployed%20on-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

[Live API](https://ai-fake-review-detection-system.onrender.com) · [Report Bug](../../issues) · [Request Feature](../../issues)

</div>

---

## 📖 Table of Contents

- [About the Project](#about-the-project)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [ML Model Details](#-ml-model-details)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Backend Setup](#backend-setup)
  - [Chrome Extension Setup](#chrome-extension-setup)
- [API Reference](#-api-reference)
- [Supported Platforms](#-supported-platforms)
- [MLOps — Feedback Loop](#-mlops--feedback-loop)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [License](#-license)

---

## About the Project

The rise of AI-generated content has made fake product reviews harder to detect than ever. **TrustGuard** is a final-year academic project that combats this using a real-world machine learning pipeline — not just a prototype, but a live, deployed system.

It works by:
1. Injecting a content script into e-commerce pages (Amazon, Flipkart, YouTube, Meesho, Shopify).
2. Sending each review to a **Django REST API** hosted on Render.
3. Running a **Random Forest classifier** (trained on stylometric + NLP features) to determine if the review is **Fake (AI-generated)** or **Human (Genuine)**.
4. Overlaying the verdict as a live badge directly on the page, with a confidence score.
5. Collecting user feedback to power a **continuous MLOps training loop**.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🤖 **AI-Powered Detection** | Random Forest model trained on 5,000+ TF-IDF features + stylometric signals |
| 🧠 **Hybrid Feature Engineering** | Combines text vectorization, sentiment polarity, subjectivity & vocabulary richness |
| 🌐 **Multi-Platform Support** | Works on Amazon, Flipkart, YouTube, Meesho & Shopify |
| 🌍 **Language Guard** | Auto-detects non-English reviews and skips ML analysis gracefully |
| 📊 **Live Trust Score** | Floating scoreboard shows real-time page trust percentage |
| 👍👎 **MLOps Feedback Loop** | Users can correct predictions, feeding a CSV dataset for future retraining |
| 🔐 **User Auth** | Secure login/signup flow built into the Chrome Extension |
| ☁️ **Cloud Deployed** | Django backend hosted on Render with production-ready Gunicorn |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CHROME BROWSER                         │
│                                                             │
│  ┌─────────────────┐      ┌──────────────────────────────┐ │
│  │  Extension UI   │      │       content.js             │ │
│  │  (popup/login)  │      │  (Injected into e-commerce   │ │
│  │                 │      │   pages, scans reviews every  │ │
│  │  login.html     │      │   3 seconds)                 │ │
│  │  signup.html    │      └──────────────┬───────────────┘ │
│  │  dashboard.html │                     │                 │
│  └─────────────────┘                     │ POST /api/analyze│
└─────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────┐
│              DJANGO REST API (Render Cloud)                 │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   views.py                           │  │
│  │                                                      │  │
│  │  1. Language Detection (langdetect)                  │  │
│  │  2. Text Cleaning + TF-IDF Vectorization             │  │
│  │  3. Stylometric Feature Extraction (TextBlob)        │  │
│  │  4. Feature Scaling (StandardScaler)                 │  │
│  │  5. Random Forest Prediction                         │  │
│  │  6. Return: { is_fake, confidence, subjectivity }    │  │
│  └────────────┬────────────────────┬─────────────────── ┘  │
│               │                    │                        │
│  ┌────────────▼──┐      ┌──────────▼──────────┐           │
│  │  random_forest│      │  tfidf_vectorizer   │           │
│  │  _model.pkl   │      │  .pkl + scaler.pkl  │           │
│  └───────────────┘      └─────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    MLOPS PIPELINE                           │
│                                                             │
│   User Feedback (👍/👎) ──► user_feedback.csv              │
│   user_feedback.csv + data-fake.csv ──► trainedmodel.py    │
│   trainedmodel.py ──► Retrained .pkl files                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧠 ML Model Details

The core classifier is a **Random Forest** trained on a hybrid feature matrix combining NLP and stylometric signals.

### Feature Engineering Pipeline

```
Raw Review Text
      │
      ├──► Text Cleaning (lowercase, remove punctuation)
      │         │
      │         └──► TF-IDF Vectorization (5,000 features, English stop words removed)
      │
      ├──► Stylometric Features:
      │         ├── vocab_richness     = unique_words / total_words
      │         └── avg_word_length    = mean character length per word
      │
      ├──► Sentiment Features (TextBlob):
      │         ├── polarity           = [-1.0 (negative) to +1.0 (positive)]
      │         └── subjectivity       = [0.0 (objective) to 1.0 (subjective)]
      │
      └──► Rating (1–5 stars, provided by extension)

All numerical features → StandardScaler → Combined with TF-IDF via scipy.sparse.hstack
                                                    │
                                                    ▼
                                    RandomForestClassifier(n_estimators=100)
                                                    │
                                                    ▼
                              { is_fake: bool, confidence: float% }
```

### Labels
| Label | Meaning |
|---|---|
| `CG` | Computer Generated — **Fake** review |
| `OR` | Original — **Genuine** human review |

---

## 💻 Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Python 3.10+** | Core language |
| **Django 6.0** | REST API framework |
| **scikit-learn** | Random Forest, TF-IDF, StandardScaler |
| **TextBlob** | Sentiment & subjectivity analysis |
| **langdetect** | Non-English review detection |
| **scipy** | Sparse matrix operations (hstack) |
| **joblib** | Model serialisation (`.pkl` files) |
| **django-cors-headers** | Cross-origin request handling |
| **Gunicorn** | Production WSGI server |

### Chrome Extension
| Technology | Purpose |
|---|---|
| **Manifest V3** | Latest Chrome extension standard |
| **Vanilla JavaScript** | Content scripting & DOM manipulation |
| **Chrome Storage API** | Persisting auth state |
| **Google OAuth2** | User identity (via Chrome Identity API) |
| **HTML/CSS** | Popup, login, signup, dashboard UIs |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Render** | Cloud hosting for Django API |
| **SQLite** | Lightweight database for auth |
| **CSV** | MLOps data collection pipeline |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- pip
- Google Chrome browser
- Git

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/dhinesh0-bi/Ai-Fake-review-detection-system.git
   cd Ai-Fake-review-detection-system
   ```

2. **Create and activate a virtual environment**
   ```bash
   # Windows
   python -m venv .venv
   .venv\Scripts\activate

   # macOS/Linux
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. **Train the model** *(skip if `.pkl` files are already present)*
   ```bash
   # Ensure data-fake.csv is in the backend/ directory
   python trainedmodel.py
   ```
   This will generate:
   - `random_forest_model.pkl`
   - `tfidf_vectorizer.pkl`
   - `scaler.pkl`

5. **Run database migrations**
   ```bash
   python manage.py migrate
   ```

6. **Start the development server**
   ```bash
   python manage.py runserver
   ```
   The API will be live at: `http://127.0.0.1:8000/`

---

### Chrome Extension Setup

1. Open **Google Chrome** and navigate to `chrome://extensions/`

2. Enable **Developer Mode** (toggle in the top-right corner)

3. Click **"Load unpacked"** and select the `extension/` folder from this repository

4. The **TrustGuard** icon will appear in your Chrome toolbar

5. Navigate to any supported e-commerce site — reviews will be analysed automatically!

> **Note:** By default, the extension sends requests to the live Render API. To use your local server instead, update the `fetch` URL in `extension/content.js` from `https://ai-fake-review-detection-system.onrender.com` to `http://localhost:8000`.

---

## 📡 API Reference

**Base URL:** `https://ai-fake-review-detection-system.onrender.com`

### `POST /api/analyze`

Analyses a review text and returns a fake/genuine verdict.

**Request Body:**
```json
{
  "text": "This product is absolutely amazing! Best purchase ever!!!",
  "rating": 5
}
```

**Response (English review):**
```json
{
  "is_fake": true,
  "confidence": 87.34,
  "subjectivity": 0.85
}
```

**Response (Non-English review):**
```json
{
  "is_unsupported_language": true,
  "detected_language": "ar",
  "message": "Only English is supported for ML analysis."
}
```

---

### `POST /api/feedback`

Submits user correction feedback to improve the model.

**Request Body:**
```json
{
  "text": "The review text here...",
  "ai_prediction": true,
  "user_agreed": false
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Feedback added to dataset"
}
```

---

### `GET /api/view-feedback`

*(Admin use only)* Returns an HTML table of all collected user feedback.

---

## 🌐 Supported Platforms

| Platform | Status | Selector Strategy |
|---|---|---|
| **Amazon** (.com / .in) | ✅ Supported | `[data-hook="review-body"]` |
| **Flipkart** | ✅ Supported | `div.t-ZTKy > div > div` |
| **YouTube** (comments) | ✅ Supported | `#content-text` |
| **Meesho** | ✅ Supported | `span.sc-jSUZER` |
| **Shopify stores** | ✅ Supported | `.jdgm-rev__body`, `.spr-review-content` |

---

## 🔄 MLOps — Feedback Loop

TrustGuard implements a lightweight **MLOps pipeline** for continuous model improvement:

```
User sees a badge on a review
        │
        ├── Clicks 👍 → "Prediction is Correct"
        │       └── Label confirmed: same as AI prediction
        │
        └── Clicks 👎 → "Prediction is Wrong"
                └── Label flipped: opposite of AI prediction
                        │
                        ▼
              Appended to user_feedback.csv
              (Review_Text, Corrected_Label)
                        │
                        ▼
         Can be merged with data-fake.csv
         and fed back into trainedmodel.py
         to retrain the Random Forest model
```

This creates a **human-in-the-loop** feedback system that grows the training dataset organically over time.

---

## 📁 Project Structure

```
Ai-Fake-review-detection-system/
│
├── 📂 backend/                         # Django REST API
│   ├── 📂 api/                         # Core API application
│   │   ├── views.py                    # Analyze + Feedback endpoints
│   │   ├── urls.py                     # API URL routing
│   │   ├── models.py
│   │   └── apps.py
│   │
│   ├── 📂 trustguard_backend/          # Django project settings
│   │   ├── settings.py                 # CORS, installed apps, DB config
│   │   ├── urls.py                     # Root URL dispatcher
│   │   ├── wsgi.py                     # Production WSGI entry point
│   │   └── asgi.py
│   │
│   ├── trainedmodel.py                 # ML training script
│   ├── data-fake.csv                   # Training dataset (CG/OR labels)
│   ├── random_forest_model.pkl         # Serialised Random Forest model
│   ├── tfidf_vectorizer.pkl            # Serialised TF-IDF vectorizer
│   ├── scaler.pkl                      # Serialised StandardScaler
│   ├── user_feedback.csv               # MLOps feedback collection
│   ├── requirements.txt                # Python dependencies
│   ├── manage.py                       # Django management CLI
│   └── db.sqlite3                      # SQLite database
│
├── 📂 extension/                       # Chrome Extension (Manifest V3)
│   ├── manifest.json                   # Extension configuration & permissions
│   ├── content.js                      # Page injection & review scanning logic
│   ├── popup.html / popup.js           # Extension toolbar popup
│   ├── login.html / login.js           # User login UI
│   ├── login.css                       # Login page styling
│   ├── signup.html / signup.js         # User registration UI
│   ├── dashboard.html / dashboard.js   # Post-login dashboard
│   └── icon.jpeg                       # Extension icon
│
├── .gitignore
└── README.md
```

---

## 🤝 Contributing

Contributions make the open-source community an amazing place to learn and grow. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">

**Built as a Final Year Project**

*TrustGuard — Because every fake review costs a real decision.*

</div>
