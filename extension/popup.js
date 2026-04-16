document.getElementById("scanBtn").addEventListener("click", () => {
    document.getElementById("status").innerText = "Scanning page...";
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0] || !tabs[0].url || tabs[0].url.startsWith("chrome://") || tabs[0].url.startsWith("edge://") || tabs[0].url.startsWith("about:")) {
            document.getElementById("status").innerText = "Cannot scan this system page.";
            return;
        }

        chrome.tabs.sendMessage(tabs[0].id, { action: "analyze_page" }, (response) => {
            
            if (chrome.runtime.lastError) {
                console.log("TrustGuard: Content script not ready.");
                document.getElementById("status").innerText = "Please refresh this webpage first!";
            } else {
                document.getElementById("status").innerText = "Scan triggered!";
            }
        });
    });
});
