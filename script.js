// ============================================
// SIMPLE TODO LIST - With Firebase/Firestore sync
// ============================================

import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-auth.js";
import {
    collection, doc, getDocs, addDoc, deleteDoc, updateDoc, setDoc, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.6.1/firebase-firestore.js";

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

// ---- State ----
let tasks = [];           // local cache of tasks from Firestore
let currentUser = null;
let completedTask = null;
let undoTimeout = null;
let deletedTask = null;
let deleteUndoTimeout = null;
let pendingTaskText = '';
let unsubscribeTasks = null; // Firestore listener cleanup

// ============================================
// FIRESTORE HELPERS
// ============================================

function tasksRef() {
    return collection(db, 'users', currentUser.uid, 'tasks');
}

function undoRef() {
    return collection(db, 'users', currentUser.uid, 'undoList');
}

// Load tasks from Firestore and listen for real-time changes
function listenToTasks() {
    if (unsubscribeTasks) unsubscribeTasks();
    unsubscribeTasks = onSnapshot(tasksRef(), (snapshot) => {
        tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        displayTasks();
    });
}

async function addTaskToFirestore(task) {
    const docRef = await addDoc(tasksRef(), task);
    return docRef.id;
}

async function removeTaskFromFirestore(taskId) {
    await deleteDoc(doc(db, 'users', currentUser.uid, 'tasks', taskId));
}

async function saveUndoItemToFirestore(task, type) {
    await addDoc(undoRef(), {
        task,
        type,
        timestamp: Date.now()
    });
}

// ============================================
// AUTH GUARD - wait for login before doing anything
// ============================================
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'welcome.html';
        return;
    }
    currentUser = user;
    listenToTasks();
    updateHeader();
});

// ============================================
// LOGOUT (used by Home button — optional)
// ============================================
window.logOut = async function() {
    if (unsubscribeTasks) unsubscribeTasks();
    await signOut(auth);
    window.location.href = 'welcome.html';
};

// ============================================
// HELPERS
// ============================================

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
    const dateOptions = diffDays === 2
        ? { month: 'short', day: 'numeric' }
        : { month: 'short', day: 'numeric', year: 'numeric' };
    return `${date.toLocaleDateString('en-US', dateOptions)}, ${timeStr}`;
}

function formatCurrentDate() {
    return new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
}

function updateHeader() {
    if (currentDate) currentDate.textContent = formatCurrentDate();
}

function getCurrentDateTimeForInput() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

// ============================================
// TIME POPUP
// ============================================

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
    const newTask = {
        text: pendingTaskText,
        startTime: startTimeInput.value,
        deadline: deadlineInput.value,
        createdAt: Date.now()
    };
    taskInput.value = '';
    hideTimePopup();
    inputSection.style.display = 'none';
    showAddButton.style.display = 'block';
    await addTaskToFirestore(newTask);
}

async function skipAndAddTask() {
    if (!pendingTaskText) return;
    const newTask = {
        text: pendingTaskText,
        startTime: '',
        deadline: '',
        createdAt: Date.now()
    };
    taskInput.value = '';
    hideTimePopup();
    inputSection.style.display = 'none';
    showAddButton.style.display = 'block';
    await addTaskToFirestore(newTask);
}

// ============================================
// DISPLAY TASKS
// ============================================

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

        const taskTimes = document.createElement('div');
        taskTimes.className = 'task-times';

        if (task.startTime || task.deadline) {
            if (task.startTime) {
                const div = document.createElement('div');
                div.className = 'task-time';
                div.innerHTML = `<span class="time-label">Start:</span><span>${formatDateTime(task.startTime)}</span>`;
                taskTimes.appendChild(div);
            }
            if (task.deadline) {
                const div = document.createElement('div');
                div.className = 'task-time';
                div.innerHTML = `<span class="time-label">Deadline:</span><span>${formatDateTime(task.deadline)}</span>`;
                taskTimes.appendChild(div);
            }
        }

        taskContent.appendChild(taskText);
        if (task.startTime || task.deadline) taskContent.appendChild(taskTimes);

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

// ============================================
// COMPLETE / DELETE TASKS
// ============================================

async function completeTask(task) {
    completedTask = task;
    await removeTaskFromFirestore(task.id);
    showUndoNotification();
    if (undoTimeout) clearTimeout(undoTimeout);
    undoTimeout = setTimeout(async () => {
        hideUndoNotification();
        if (completedTask) {
            await saveUndoItemToFirestore(completedTask, 'done');
            completedTask = null;
        }
    }, 3000);
}

async function deleteTask(task) {
    deletedTask = task;
    await removeTaskFromFirestore(task.id);
    showDeleteUndoNotification();
    if (deleteUndoTimeout) clearTimeout(deleteUndoTimeout);
    deleteUndoTimeout = setTimeout(async () => {
        hideDeleteUndoNotification();
        if (deletedTask) {
            await saveUndoItemToFirestore(deletedTask, 'deleted');
            deletedTask = null;
        }
    }, 3000);
}

async function undoCompleteTask() {
    if (!completedTask) return;
    const { id, ...taskData } = completedTask;
    await addTaskToFirestore(taskData);
    completedTask = null;
    if (undoTimeout) { clearTimeout(undoTimeout); undoTimeout = null; }
    hideUndoNotification();
}

async function undoDeleteTask() {
    if (!deletedTask) return;
    const { id, ...taskData } = deletedTask;
    await addTaskToFirestore(taskData);
    deletedTask = null;
    if (deleteUndoTimeout) { clearTimeout(deleteUndoTimeout); deleteUndoTimeout = null; }
    hideDeleteUndoNotification();
}

function showUndoNotification() { undoNotification.style.display = 'flex'; }
function hideUndoNotification() { undoNotification.style.display = 'none'; }
function showDeleteUndoNotification() { hideUndoNotification(); deleteUndoNotification.style.display = 'flex'; }
function hideDeleteUndoNotification() { deleteUndoNotification.style.display = 'none'; }

// ============================================
// EVENT LISTENERS
// ============================================

showAddButton.addEventListener('click', () => {
    inputSection.style.display = 'flex';
    showAddButton.style.display = 'none';
    taskInput.focus();
});

addButton.addEventListener('click', showTimePopup);

taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') showTimePopup();
});

confirmButton.addEventListener('click', confirmAddTask);
cancelButton.addEventListener('click', skipAndAddTask);

timePopup.addEventListener('click', (e) => {
    if (e.target === timePopup) hideTimePopup();
});

undoButton.addEventListener('click', undoCompleteTask);
deleteUndoButton.addEventListener('click', undoDeleteTask);

setInterval(updateHeader, 60000);