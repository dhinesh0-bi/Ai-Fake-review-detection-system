document.getElementById("scanBtn").addEventListener("click", () => {
    document.getElementById("status").innerText = "Scanning page...";
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        // 1. Crash Prevention: Check if the tab exists and is a valid webpage
        if (!tabs[0] || !tabs[0].url || tabs[0].url.startsWith("chrome://") || tabs[0].url.startsWith("edge://") || tabs[0].url.startsWith("about:")) {
            document.getElementById("status").innerText = "Cannot scan this system page.";
            return;
        }

        // 2. Send the message to your content.js file
        chrome.tabs.sendMessage(tabs[0].id, { action: "analyze_page" }, (response) => {
            
            // 3. Silently catch the "Receiving end does not exist" error
            if (chrome.runtime.lastError) {
                console.log("TrustGuard: Content script not ready.");
                // Tell the user to refresh the page instead of crashing!
                document.getElementById("status").innerText = "Please refresh this webpage first!";
            } else {
                document.getElementById("status").innerText = "Scan triggered!";
            }
        });
    });
});