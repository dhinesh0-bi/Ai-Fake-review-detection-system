document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById("logout-btn");

    logoutBtn.addEventListener("click", () => {
        chrome.storage.local.remove(["firebaseToken", "userEmail", "isLoggedIn"], () => {
            window.location.href = "login.html";
        });
    });
});
