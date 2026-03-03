// ============================================
// WELCOME PAGE - Name input and welcome message
// ============================================

const nameInput = document.getElementById('nameInput');
const saveNameButton = document.getElementById('saveNameButton');
const nameInputSection = document.getElementById('nameInputSection');
const welcomeMessageSection = document.getElementById('welcomeMessageSection');
const goToTasksButton = document.getElementById('goToTasksButton');
const greetingSection = document.getElementById('greetingSection');
const greetingText = document.getElementById('greetingText');

// ============================================
// FUNCTION: Get user name from localStorage
// ============================================
function getUserName() {
    return localStorage.getItem('userName') || '';
}

// ============================================
// FUNCTION: Save user name to localStorage
// ============================================
function saveUserName(name) {
    localStorage.setItem('userName', name.trim());
}

// ============================================
// FUNCTION: Show welcome message
// ============================================
function showWelcomeMessage() {
    const name = getUserName();
    if (name) {
        // Show greeting outside the container
        greetingText.textContent = `Hello ${name}!`;
        greetingSection.style.display = 'block';
        nameInputSection.style.display = 'none';
        welcomeMessageSection.style.display = 'block';
    } else {
        // Hide greeting when no name
        greetingSection.style.display = 'none';
        nameInputSection.style.display = 'block';
        welcomeMessageSection.style.display = 'none';
    }
}

// ============================================
// FUNCTION: Handle name save
// ============================================
function handleSaveName() {
    const name = nameInput.value.trim();
    if (name) {
        saveUserName(name);
        showWelcomeMessage();
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

saveNameButton.addEventListener('click', handleSaveName);

nameInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        handleSaveName();
    }
});

goToTasksButton.addEventListener('click', function() {
    window.location.href = 'index.html';
});

// ============================================
// INITIAL SETUP
// ============================================
showWelcomeMessage();

