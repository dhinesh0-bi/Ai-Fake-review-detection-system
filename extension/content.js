chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "analyze_page") {
        scanReviews();
    }
});
async function scanReviews() {
    let reviews = [];
    let currentURL = window.location.hostname;

    // 1. Identify the website and grab the correct review elements
    if (currentURL.includes("amazon")) {
        reviews = document.querySelectorAll('[data-hook="review-body"]');
        
    } else if (currentURL.includes("youtube")) {
        reviews = document.querySelectorAll('#content-text');
        
    } else if (currentURL.includes("flipkart")) {
        // Flipkart usually stores review text inside this specific div class
        reviews = document.querySelectorAll('div.t-ZTKy > div > div');
        
    } else if (currentURL.includes("meesho")) {
        // Meesho's classes change often, but this targets standard comment spans
        reviews = document.querySelectorAll('span.sc-jSUZER, div.sc-ftvSup'); 
        
    } else if (currentURL.includes("shopify") || document.querySelector('.jdgm-rev-widg')) {
        // Shopify stores use different review plugins. These are the top 3 most common:
        // Judge.me (.jdgm-rev__body), Shopify Reviews (.spr-review-content), Loox (.loox-review-content)
        reviews = document.querySelectorAll('.jdgm-rev__body, .spr-review-content, .loox-review-content');
    }

    // 2. Check if we found anything
    if(reviews.length === 0) {
        alert("TrustGuard: No reviews found on this page. (The website layout might have changed!)");
        return;
    }

    // 3. Process the reviews through your Django API
    for (let review of reviews) {
        let reviewText = review.innerText;
        let rating = 5; // Default assumption
        
        try {
            let response = await fetch("http://127.0.0.1:8000/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: reviewText, rating: rating })
            });

            let data = await response.json();

            // 4. Inject Red/Green UI Highlighting
            // 4. Inject Sleek Underline UI Highlighting
            if (data.is_fake) {
                // Apply a thick red underline
                review.style.borderBottom = "4px solid #ff4d4d";
                review.style.paddingBottom = "2px"; // Give it a tiny bit of breathing room

                // Create a small, non-intrusive badge at the top of the review
                let badge = document.createElement('div');
                badge.style.marginBottom = "5px"; // Space between badge and text
                badge.style.fontSize = "12px";
                badge.innerHTML = `<span style="background-color: #ff4d4d; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;">⚠️ TrustGuard: Fake AI (${data.confidence}%)</span>`;
                review.prepend(badge);

            } else {
                // Apply a thick green underline
                review.style.borderBottom = "4px solid #4CAF50";
                review.style.paddingBottom = "2px";

                // Create a small, non-intrusive badge at the top
                let badge = document.createElement('div');
                badge.style.marginBottom = "5px";
                badge.style.fontSize = "12px";
                badge.innerHTML = `<span style="background-color: #4CAF50; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;">✅ TrustGuard: Human (${100 - data.confidence}%)</span>`;
                review.prepend(badge);
            }
        } catch (error) {
            console.error("TrustGuard Server Error:", error);
        }
    }
}