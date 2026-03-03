document.getElementById("scanBtn").addEventListener("click", () => {
    document.getElementById("status").innerText = "Scanning page... Please wait.";
    document.getElementById("status").style.color = "#007bff";
    
    // Send a message to the content script running on the Amazon page
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {action: "analyze_page"});
    });
});