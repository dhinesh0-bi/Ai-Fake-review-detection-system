document.addEventListener("DOMContentLoaded", () => {
    // 1. Check if the user is already logged in securely
    chrome.storage.local.get(["firebaseToken"], (result) => {
        if (result.firebaseToken) {
            window.location.href = "dashboard.html"; // Skip login page entirely
        }
    });

    const loginForm = document.getElementById("login-form");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const loginBtn = document.getElementById("login-btn");
    const btnText = document.getElementById("btn-text");
    const btnSpinner = document.getElementById("btn-spinner");
    const statusMessage = document.getElementById("status-message");

    // 🚀 YOUR FIREBASE API KEY GOES HERE
    const FIREBASE_API_KEY = "AIzaSyDXF8aIyeLXCBrA980JnXMqkcp6WF1iwuc"; 

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        setLoadingState(true);
        hideStatus();

        try {
            // 2. Call the Firebase Authentication REST API
            const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    returnSecureToken: true
                })
            });

            const data = await response.json();

            // 3. Handle Firebase's Response
            if (response.ok) {
                showStatus("Login successful! Redirecting...", "success");
                
                // Save the real secure token to Chrome Storage
                chrome.storage.local.set({ 
                    firebaseToken: data.idToken, 
                    userEmail: data.email 
                }, () => {
                    setTimeout(() => {
                        window.location.href = "dashboard.html";
                    }, 800);
                });
            } else {
                // Firebase returns specific error messages (e.g., INVALID_PASSWORD)
                console.error("Firebase Auth Error:", data.error.message);
                showStatus("Invalid email or password.", "error");
                setLoadingState(false);
            }

        } catch (error) {
            showStatus("Network error. Please try again later.", "error");
            console.error("Login Error:", error);
            setLoadingState(false);
        }
    });

    function setLoadingState(isLoading) {
        loginBtn.disabled = isLoading;
        if (isLoading) {
            btnText.classList.add("hidden");
            btnSpinner.classList.remove("hidden");
        } else {
            btnText.classList.remove("hidden");
            btnSpinner.classList.add("hidden");
        }
    }

    function showStatus(message, type) {
        statusMessage.innerText = message;
        statusMessage.className = `status-${type}`;
        statusMessage.classList.remove("hidden");
    }

    function hideStatus() {
        statusMessage.className = "hidden";
    }
});
// Google Sign-In Logic
    