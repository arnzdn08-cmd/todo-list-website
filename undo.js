// ============================================
// UNDO PAGE - Firebase compat SDK
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyDYbdoeIZpxgya0ktpRrcOqtJBz8Y3oNNI",
  authDomain: "todoapp-74fd3.firebaseapp.com",
  projectId: "todoapp-74fd3",
  storageBucket: "todoapp-74fd3.firebasestorage.app",
  messagingSenderId: "640734898506",
  appId: "1:640734898506:web:5b5046336c2339f01e79b3"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const taskList = document.getElementById('taskList');
const currentDateTime = document.getElementById('currentDateTime');
const currentDate = document.getElementById('currentDate');
const TEN_MINUTES = 10 * 60 * 1000;
let currentUser = null;
let undoItems = [];

auth.onAuthStateChanged(user => {
    if (!user) { window.location.href = 'welcome.html'; return; }
    currentUser = user;
    listenToUndoList();
    updateCurrentDateTime();
});

function undoRef() { return db.collection('users').doc(currentUser.uid).collection('undoList'); }
function tasksRef() { return db.collection('users').doc(currentUser.uid).collection('tasks'); }

function listenToUndoList() {
    undoRef().onSnapshot(snapshot => {
        undoItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        cleanupExpiredTasks();
        displayTasks();
    });
}

function formatDateTime(dateTimeString) {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((taskDate - today) / (1000 * 60 * 60 * 24));
    const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    const timeStr = date.toLocaleString('en-US', timeOptions);
    if (diffDays === 0) return `Today, ${timeStr}`;
    if (diffDays === 1) return `Tomorrow, ${timeStr}`;
    const dateOptions = diffDays === 2 ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' };
    return `${date.toLocaleDateString('en-US', dateOptions)}, ${timeStr}`;
}

function updateCurrentDateTime() {
    if (currentDate) currentDate.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    if (currentDateTime) currentDateTime.textContent = new Date().toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

function getTimeRemaining(timestamp) {
    const remaining = TEN_MINUTES - (Date.now() - timestamp);
    if (remaining <= 0) return 'Expired';
    const minutes = Math.ceil(remaining / 60000);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

async function cleanupExpiredTasks() {
    for (const item of undoItems) {
        if (Date.now() - item.timestamp >= TEN_MINUTES) {
            await undoRef().doc(item.id).delete();
        }
    }
}

async function restoreTask(itemId) {
    const item = undoItems.find(i => i.id === itemId);
    if (!item) return;
    const { id, ...taskData } = item.task;
    await tasksRef().add(taskData);
    await undoRef().doc(itemId).delete();
}

async function permanentlyDeleteTask(itemId) {
    await undoRef().doc(itemId).delete();
}

function displayTasks() {
    taskList.innerHTML = '';
    const active = undoItems.filter(i => Date.now() - i.timestamp < TEN_MINUTES);
    if (active.length === 0) {
        const emptyMessage = document.createElement('li');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = 'No deleted or done tasks. Tasks expire after 10 minutes.';
        taskList.appendChild(emptyMessage);
        return;
    }
    for (const item of active) {
        const task = item.task;
        const listItem = document.createElement('li');
        listItem.className = `task-item ${item.type === 'deleted' ? 'task-deleted' : 'task-done'}`;
        const taskContent = document.createElement('div');
        taskContent.className = 'task-content';
        const typeBadge = `<div class="type-badge" style="background-color:${item.type === 'deleted' ? '#e74c3c' : '#2ecc71'}">${item.type === 'deleted' ? 'DELETED' : 'DONE'}</div>`;
        const times = (task.startTime ? `<div class="task-time"><span class="time-label">Start:</span><span>${formatDateTime(task.startTime)}</span></div>` : '') +
                      (task.deadline ? `<div class="task-time"><span class="time-label">Deadline:</span><span>${formatDateTime(task.deadline)}</span></div>` : '');
        taskContent.innerHTML = `
            <span class="task-text">${task.text}</span>
            ${typeBadge}
            ${times ? `<div class="task-times">${times}</div>` : ''}
            <div class="time-remaining">Expires in: ${getTimeRemaining(item.timestamp)}</div>
        `;
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'task-buttons';
        const restoreButton = document.createElement('button');
        restoreButton.className = 'restore-button';
        restoreButton.textContent = 'Restore';
        restoreButton.addEventListener('click', () => restoreTask(item.id));
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => permanentlyDeleteTask(item.id));
        buttonContainer.appendChild(restoreButton);
        buttonContainer.appendChild(deleteButton);
        listItem.appendChild(taskContent);
        listItem.appendChild(buttonContainer);
        taskList.appendChild(listItem);
    }
}

setInterval(updateCurrentDateTime, 60000);
setInterval(() => { cleanupExpiredTasks(); displayTasks(); }, 60000);