document.addEventListener("DOMContentLoaded", () => {
    const signupForm = document.getElementById("signup-form");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const signupBtn = document.getElementById("signup-btn");
    const btnText = document.getElementById("btn-text");
    const btnSpinner = document.getElementById("btn-spinner");
    const statusMessage = document.getElementById("status-message");

    const FIREBASE_API_KEY = "AIzaSyDXF8aIyeLXCBrA980JnXMqkcp6WF1iwuc"; 

    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        setLoadingState(true);
        hideStatus();

        try {
            const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    returnSecureToken: true
                })
            });

            const data = await response.json();

            if (response.ok) {
                showStatus("Account created! Logging you in...", "success");
                
                chrome.storage.local.set({ 
                    firebaseToken: data.idToken, 
                    userEmail: data.email,
                    loginTime: Date.now()
                }, () => {
                    setTimeout(() => {
                        window.location.href = "dashboard.html";
                    }, 1000);
                });
            } else {
                let errorMessage = "Registration failed.";
                if (data.error.message === "EMAIL_EXISTS") {
                    errorMessage = "This email is already registered. Please log in.";
                } else if (data.error.message === "WEAK_PASSWORD") {
                    errorMessage = "Password must be at least 6 characters.";
                }
                
                showStatus(errorMessage, "error");
                setLoadingState(false);
            }

        } catch (error) {
            showStatus("Network error. Please try again later.", "error");
            console.error("Signup Error:", error);
            setLoadingState(false);
        }
    });

    function setLoadingState(isLoading) {
        signupBtn.disabled = isLoading;
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
