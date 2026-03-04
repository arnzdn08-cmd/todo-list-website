// ============================================
// WELCOME PAGE - Firebase Login & Signup
// Uses Firebase compat SDK (no imports needed)
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyDYbdoeIZpxgya0ktpRrcOqtJBz8Y3oNNI",
  authDomain: "todoapp-74fd3.firebaseapp.com",
  projectId: "todoapp-74fd3",
  storageBucket: "todoapp-74fd3.firebasestorage.app",
  messagingSenderId: "640734898506",
  appId: "1:640734898506:web:5b5046336c2339f01e79b3"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

function toEmail(username) {
    return `${username.toLowerCase().trim()}@todoapp-user.com`;
}

// If already logged in, redirect to app
auth.onAuthStateChanged(user => {
    if (user) {
        window.location.href = 'index.html';
    }
});

const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const loginButton = document.getElementById('loginButton');
const signupButton = document.getElementById('signupButton');
const message = document.getElementById('message');

// ============================================
// SIGN UP
// ============================================
signupButton.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    message.textContent = '';

    if (!username || !password) {
        message.textContent = 'Please enter a username and password.';
        return;
    }
    if (username.length < 3) {
        message.textContent = 'Username must be at least 3 characters.';
        return;
    }
    if (password.length < 6) {
        message.textContent = 'Password must be at least 6 characters.';
        return;
    }

    try {
        await auth.createUserWithEmailAndPassword(toEmail(username), password);
        window.location.href = 'index.html';
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            message.textContent = 'That username is already taken. Try a different one.';
        } else {
            message.textContent = error.message;
        }
    }
});

// ============================================
// LOGIN
// ============================================
loginButton.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    message.textContent = '';

    if (!username || !password) {
        message.textContent = 'Please enter your username and password.';
        return;
    }

    try {
        await auth.signInWithEmailAndPassword(toEmail(username), password);
        window.location.href = 'index.html';
    } catch (error) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            message.textContent = 'Incorrect username or password.';
        } else {
            message.textContent = error.message;
        }
    }
});

// Allow pressing Enter to log in
passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loginButton.click();
});