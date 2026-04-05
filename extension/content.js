// Master Tracking Variables for the Floating Scoreboard
let totalScanned = 0;
let fakeCount = 0;
let realCount = 0;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "analyze_page") { scanReviews(); }
});

// Auto-scan every 3 seconds
setInterval(() => { scanReviews(); }, 3000);

async function scanReviews() {
    let reviews = [];
    let currentURL = window.location.hostname;

    if (currentURL.includes("amazon")) {
        reviews = document.querySelectorAll('[data-hook="review-body"]');
    } else if (currentURL.includes("youtube")) {
        reviews = document.querySelectorAll('#content-text');
    } else if (currentURL.includes("flipkart")) {
        reviews = document.querySelectorAll('div.t-ZTKy > div > div');
    } else if (currentURL.includes("meesho")) {
        reviews = document.querySelectorAll('span.sc-jSUZER, div.sc-ftvSup'); 
    } else if (currentURL.includes("shopify") || document.querySelector('.jdgm-rev-widg')) {
        reviews = document.querySelectorAll('.jdgm-rev__body, .spr-review-content, .loox-review-content');
    }

    if(reviews.length === 0) return; 

    for (let review of reviews) {
        if (review.getAttribute("data-tg-scanned") === "true") continue;
        review.setAttribute("data-tg-scanned", "true");

        let reviewText = review.innerText;
        if (!reviewText || reviewText.trim() === "") continue; 

        try {
            // 1. Send the review to Django for analysis
            let response = await fetch("http://localhost:8000/analyze/", { 
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: reviewText, rating: 5 })
            });

            let data = await response.json();

            // 3. Setup the UI Container
            review.style.position = "relative"; 
            
            let statusLine = document.createElement('div');
            statusLine.style.height = "4px";
            statusLine.style.width = "100%";
            statusLine.style.marginBottom = "8px"; 
            
            let badgeContainer = document.createElement('div');
            badgeContainer.style.marginBottom = "5px"; 
            badgeContainer.style.fontSize = "12px";
            badgeContainer.style.display = "flex";
            badgeContainer.style.alignItems = "center";
            badgeContainer.style.gap = "10px";

            let badgeLabel = document.createElement('span');
            badgeLabel.style.padding = "3px 8px";
            badgeLabel.style.borderRadius = "4px";
            badgeLabel.style.fontWeight = "bold";
            badgeLabel.style.color = "white";

            // 🌐 NEW FEATURE: The Unsupported Language Fallback
            if (data.is_unsupported_language) {
                statusLine.style.backgroundColor = "#2196F3"; // 🔵 Striking Blue color
                badgeLabel.style.backgroundColor = "#2196F3";
                badgeLabel.innerText = `🌐 TrustGuard: English Only`;
                
                badgeContainer.appendChild(badgeLabel);
                review.prepend(statusLine); 
                review.prepend(badgeContainer); 
                
                // CRITICAL: We 'continue' here so we don't count this in our Master Scoreboard or show the 👍/👎 buttons
                continue; 
            }

            // 2. Update Master Counters (Only if it's English!)
            totalScanned++;
            if (data.is_fake) fakeCount++;
            else realCount++;

            // 4. Create the ML Badges
            if (data.is_fake) {
                statusLine.style.backgroundColor = "#ff4d4d"; 
                badgeLabel.style.backgroundColor = "#ff4d4d";
                badgeLabel.innerText = `⚠️ TrustGuard: Fake AI (${Math.round(data.confidence)}%)`;
            } else {
                statusLine.style.backgroundColor = "#4CAF50"; 
                badgeLabel.style.backgroundColor = "#4CAF50";
                badgeLabel.innerText = `✅ TrustGuard: Human (${Math.round(100 - data.confidence)}%)`;
            }

            // 5. Create the Feedback Buttons
            let feedbackWrapper = document.createElement('div');
            feedbackWrapper.style.display = "flex";
            feedbackWrapper.style.gap = "8px";
            feedbackWrapper.style.fontSize = "14px";
            
            let btnUp = document.createElement('span');
            btnUp.innerText = "👍";
            btnUp.style.cursor = "pointer";
            btnUp.title = "Prediction is Correct";
            
            let btnDown = document.createElement('span');
            btnDown.innerText = "👎";
            btnDown.style.cursor = "pointer";
            btnDown.title = "Prediction is Wrong";

            btnUp.onclick = () => submitFeedback(reviewText, data.is_fake, true, feedbackWrapper);
            btnDown.onclick = () => submitFeedback(reviewText, data.is_fake, false, feedbackWrapper);

            feedbackWrapper.appendChild(btnUp);
            feedbackWrapper.appendChild(btnDown);

            // Put everything together
            badgeContainer.appendChild(badgeLabel);
            badgeContainer.appendChild(feedbackWrapper);
            review.prepend(statusLine); 
            review.prepend(badgeContainer); 

        } catch (error) {
            console.error("TrustGuard Server Error:", error);
            review.removeAttribute("data-tg-scanned");
        }
    }

    updateTrustScoreUI();
}

// Function to send user feedback back to the Django Backend
async function submitFeedback(text, isPredictedFake, isUserAgree, wrapperElement) {
    // Immediately hide the buttons and show a "Thank you" message
    wrapperElement.innerHTML = `<span style="color: #666; font-style: italic; font-size: 11px;">✅ Feedback saved for ML training!</span>`;

    try {
        await fetch("http://localhost:8000/feedback/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                text: text, 
                ai_prediction: isPredictedFake, 
                user_agreed: isUserAgree 
            })
        });
    } catch (e) {
        console.error("Failed to send feedback:", e);
    }
}

function updateTrustScoreUI() {
    if (totalScanned === 0) return;

    let trustPercentage = Math.round((realCount / totalScanned) * 100);
    
    let scoreBoard = document.getElementById("trustguard-floating-score");
    
    if (!scoreBoard) {
        scoreBoard = document.createElement("div");
        scoreBoard.id = "trustguard-floating-score";
        scoreBoard.style.position = "fixed";
        scoreBoard.style.bottom = "20px";
        scoreBoard.style.right = "20px";
        scoreBoard.style.zIndex = "999999"; 
        scoreBoard.style.padding = "15px";
        scoreBoard.style.borderRadius = "10px";
        scoreBoard.style.fontWeight = "bold";
        scoreBoard.style.fontFamily = "Arial, sans-serif";
        scoreBoard.style.boxShadow = "0 4px 15px rgba(0,0,0,0.3)";
        scoreBoard.style.transition = "all 0.3s ease";
        document.body.appendChild(scoreBoard);
    }

    if (trustPercentage >= 70) {
        scoreBoard.style.backgroundColor = "#e8f5e9";
        scoreBoard.style.border = "2px solid #4CAF50";
        scoreBoard.style.color = "#2e7d32";
        scoreBoard.innerHTML = `
            <div style="font-size:16px; margin-bottom:5px;">🛡️ Trust Score: ${trustPercentage}%</div>
            <div style="font-size: 12px; font-weight: normal; color: #333;">${totalScanned} Scanned | ${fakeCount} Fake Detected</div>
        `;
    } else {
        scoreBoard.style.backgroundColor = "#ffebee";
        scoreBoard.style.border = "2px solid #ff4d4d";
        scoreBoard.style.color = "#c62828";
        scoreBoard.innerHTML = `
            <div style="font-size:16px; margin-bottom:5px;">⚠️ Trust Score: ${trustPercentage}%</div>
            <div style="font-size: 12px; font-weight: normal; color: #333;">High Risk! | ${totalScanned} Scanned | ${fakeCount} Fake</div>
        `;
    }
}