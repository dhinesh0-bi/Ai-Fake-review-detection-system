document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById("logout-btn");

    logoutBtn.addEventListener("click", () => {
        // Clear BOTH the new Firebase token and the old hardcoded login state
        chrome.storage.local.remove(["firebaseToken", "userEmail", "isLoggedIn"], () => {
            // Redirect back to the login page
            window.location.href = "login.html";
        });
    });
});