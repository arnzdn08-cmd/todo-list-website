// ============================================
// MAIN TODO PAGE - Firebase compat SDK
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyDYbdoeIZpxgya0ktpRrcOqtJBz8Y3oNNI",
  authDomain: "todoapp-74fd3.firebaseapp.com",
  projectId: "todoapp-74fd3",
  storageBucket: "todoapp-74fd3.firebasestorage.app",
  messagingSenderId: "640734898506",
  appId: "1:640734898506:web:5b5046336c2339f01e79b3"
};

// Only initialize if not already initialized
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ---- Element refs ----
const taskInput = document.getElementById('taskInput');
const startTimeInput = document.getElementById('startTimeInput');
const deadlineInput = document.getElementById('deadlineInput');
const addButton = document.getElementById('addButton');
const taskList = document.getElementById('taskList');
const undoNotification = document.getElementById('undoNotification');
const undoButton = document.getElementById('undoButton');
const deleteUndoNotification = document.getElementById('deleteUndoNotification');
const deleteUndoButton = document.getElementById('deleteUndoButton');
const timePopup = document.getElementById('timePopup');
const popupTaskText = document.getElementById('popupTaskText');
const confirmButton = document.getElementById('confirmButton');
const cancelButton = document.getElementById('cancelButton');
const currentDate = document.getElementById('currentDate');
const showAddButton = document.getElementById('showAddButton');
const inputSection = document.getElementById('inputSection');

let tasks = [];
let currentUser = null;
let completedTask = null;
let undoTimeout = null;
let deletedTask = null;
let deleteUndoTimeout = null;
let pendingTaskText = '';
let unsubscribeTasks = null;

// ---- Auth guard ----
auth.onAuthStateChanged(user => {
    if (!user) { window.location.href = 'welcome.html'; return; }
    currentUser = user;
    listenToTasks();
    updateHeader();
});

function logOut() {
    if (unsubscribeTasks) unsubscribeTasks();
    auth.signOut().then(() => { window.location.href = 'welcome.html'; });
}

// ---- Firestore helpers ----
function tasksRef() {
    return db.collection('users').doc(currentUser.uid).collection('tasks');
}
function undoRef() {
    return db.collection('users').doc(currentUser.uid).collection('undoList');
}

function listenToTasks() {
    if (unsubscribeTasks) unsubscribeTasks();
    unsubscribeTasks = tasksRef().onSnapshot(snapshot => {
        tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        displayTasks();
    });
}

// ---- Helpers ----
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

function formatCurrentDate() {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function updateHeader() {
    if (currentDate) currentDate.textContent = formatCurrentDate();
}

function getCurrentDateTimeForInput() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

// ---- Time popup ----
function showTimePopup() {
    const taskText = taskInput.value.trim();
    if (!taskText) return;
    pendingTaskText = taskText;
    popupTaskText.textContent = taskText;
    const now = getCurrentDateTimeForInput();
    startTimeInput.value = now;
    deadlineInput.value = now;
    timePopup.style.display = 'flex';
}

function hideTimePopup() {
    timePopup.style.display = 'none';
    pendingTaskText = '';
    startTimeInput.value = '';
    deadlineInput.value = '';
}

async function confirmAddTask() {
    if (!pendingTaskText) return;
    const newTask = { text: pendingTaskText, startTime: startTimeInput.value, deadline: deadlineInput.value, createdAt: Date.now() };
    taskInput.value = '';
    hideTimePopup();
    inputSection.style.display = 'none';
    showAddButton.style.display = 'block';
    await tasksRef().add(newTask);
}

async function skipAndAddTask() {
    if (!pendingTaskText) return;
    const newTask = { text: pendingTaskText, startTime: '', deadline: '', createdAt: Date.now() };
    taskInput.value = '';
    hideTimePopup();
    inputSection.style.display = 'none';
    showAddButton.style.display = 'block';
    await tasksRef().add(newTask);
}

// ---- Display ----
function displayTasks() {
    taskList.innerHTML = '';
    if (tasks.length === 0) {
        const emptyMessage = document.createElement('li');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = 'No tasks yet. Add one above!';
        taskList.appendChild(emptyMessage);
        return;
    }

    const sorted = [...tasks].sort((a, b) => {
        const aTime = a.deadline || a.startTime || '';
        const bTime = b.deadline || b.startTime || '';
        if (aTime && bTime) return new Date(aTime) - new Date(bTime);
        if (aTime) return -1;
        if (bTime) return 1;
        return (a.text || '').localeCompare(b.text || '');
    });

    for (const task of sorted) {
        const listItem = document.createElement('li');
        listItem.className = 'task-item';

        const taskContent = document.createElement('div');
        taskContent.className = 'task-content';

        const taskText = document.createElement('span');
        taskText.className = 'task-text';
        taskText.textContent = task.text;
        taskContent.appendChild(taskText);

        if (task.startTime || task.deadline) {
            const taskTimes = document.createElement('div');
            taskTimes.className = 'task-times';
            if (task.startTime) taskTimes.innerHTML += `<div class="task-time"><span class="time-label">Start:</span><span>${formatDateTime(task.startTime)}</span></div>`;
            if (task.deadline) taskTimes.innerHTML += `<div class="task-time"><span class="time-label">Deadline:</span><span>${formatDateTime(task.deadline)}</span></div>`;
            taskContent.appendChild(taskTimes);
        }

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'task-buttons';

        const doneButton = document.createElement('button');
        doneButton.className = 'done-button';
        doneButton.textContent = 'Done';
        doneButton.addEventListener('click', () => completeTask(task));

        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => deleteTask(task));

        buttonContainer.appendChild(doneButton);
        buttonContainer.appendChild(deleteButton);
        listItem.appendChild(taskContent);
        listItem.appendChild(buttonContainer);
        taskList.appendChild(listItem);
    }
}

// ---- Complete / Delete ----
async function completeTask(task) {
    completedTask = task;
    await tasksRef().doc(task.id).delete();
    showUndoNotification();
    if (undoTimeout) clearTimeout(undoTimeout);
    undoTimeout = setTimeout(async () => {
        hideUndoNotification();
        if (completedTask) { await undoRef().add({ task: completedTask, type: 'done', timestamp: Date.now() }); completedTask = null; }
    }, 3000);
}

async function deleteTask(task) {
    deletedTask = task;
    await tasksRef().doc(task.id).delete();
    showDeleteUndoNotification();
    if (deleteUndoTimeout) clearTimeout(deleteUndoTimeout);
    deleteUndoTimeout = setTimeout(async () => {
        hideDeleteUndoNotification();
        if (deletedTask) { await undoRef().add({ task: deletedTask, type: 'deleted', timestamp: Date.now() }); deletedTask = null; }
    }, 3000);
}

async function undoCompleteTask() {
    if (!completedTask) return;
    const { id, ...taskData } = completedTask;
    await tasksRef().add(taskData);
    completedTask = null;
    if (undoTimeout) { clearTimeout(undoTimeout); undoTimeout = null; }
    hideUndoNotification();
}

async function undoDeleteTask() {
    if (!deletedTask) return;
    const { id, ...taskData } = deletedTask;
    await tasksRef().add(taskData);
    deletedTask = null;
    if (deleteUndoTimeout) { clearTimeout(deleteUndoTimeout); deleteUndoTimeout = null; }
    hideDeleteUndoNotification();
}

function showUndoNotification() { undoNotification.style.display = 'flex'; }
function hideUndoNotification() { undoNotification.style.display = 'none'; }
function showDeleteUndoNotification() { hideUndoNotification(); deleteUndoNotification.style.display = 'flex'; }
function hideDeleteUndoNotification() { deleteUndoNotification.style.display = 'none'; }

// ---- Events ----
showAddButton.addEventListener('click', () => { inputSection.style.display = 'flex'; showAddButton.style.display = 'none'; taskInput.focus(); });
addButton.addEventListener('click', showTimePopup);
taskInput.addEventListener('keypress', e => { if (e.key === 'Enter') showTimePopup(); });
confirmButton.addEventListener('click', confirmAddTask);
cancelButton.addEventListener('click', skipAndAddTask);
timePopup.addEventListener('click', e => { if (e.target === timePopup) hideTimePopup(); });
undoButton.addEventListener('click', undoCompleteTask);
deleteUndoButton.addEventListener('click', undoDeleteTask);
setInterval(updateHeader, 60000);