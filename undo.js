// ============================================
// UNDO PAGE - Shows deleted and done tasks
// ============================================

import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-auth.js";
import {
    collection, doc, addDoc, deleteDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.6.1/firebase-firestore.js";

const taskList = document.getElementById('taskList');
const currentDateTime = document.getElementById('currentDateTime');
const currentDate = document.getElementById('currentDate');

const TEN_MINUTES = 10 * 60 * 1000;
let currentUser = null;
let undoItems = [];

// ---- Auth guard ----
onAuthStateChanged(auth, (user) => {
    if (!user) { window.location.href = 'welcome.html'; return; }
    currentUser = user;
    listenToUndoList();
    updateCurrentDateTime();
});

function undoRef() {
    return collection(db, 'users', currentUser.uid, 'undoList');
}
function tasksRef() {
    return collection(db, 'users', currentUser.uid, 'tasks');
}

function listenToUndoList() {
    onSnapshot(undoRef(), (snapshot) => {
        undoItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        cleanupExpiredTasks();
        displayTasks();
    });
}

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

function formatCurrentDateTime() {
    return new Date().toLocaleString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true
    });
}

function formatCurrentDate() {
    return new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
}

function updateCurrentDateTime() {
    if (currentDate) currentDate.textContent = formatCurrentDate();
    if (currentDateTime) currentDateTime.textContent = formatCurrentDateTime();
}

function getTimeRemaining(timestamp) {
    const remaining = TEN_MINUTES - (Date.now() - timestamp);
    if (remaining <= 0) return 'Expired';
    const minutes = Math.ceil(remaining / 60000);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

// ============================================
// CLEANUP EXPIRED
// ============================================

async function cleanupExpiredTasks() {
    const now = Date.now();
    for (const item of undoItems) {
        if (now - item.timestamp >= TEN_MINUTES) {
            await deleteDoc(doc(db, 'users', currentUser.uid, 'undoList', item.id));
        }
    }
}

// ============================================
// RESTORE TASK
// ============================================

async function restoreTask(itemId) {
    const item = undoItems.find(i => i.id === itemId);
    if (!item) return;
    const { id, ...taskData } = item.task;
    await addDoc(tasksRef(), taskData);
    await deleteDoc(doc(db, 'users', currentUser.uid, 'undoList', itemId));
}

async function permanentlyDeleteTask(itemId) {
    await deleteDoc(doc(db, 'users', currentUser.uid, 'undoList', itemId));
}

// ============================================
// DISPLAY
// ============================================

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

        const taskText = document.createElement('span');
        taskText.className = 'task-text';
        taskText.textContent = task.text;

        const typeBadge = document.createElement('div');
        typeBadge.className = 'type-badge';
        typeBadge.textContent = item.type === 'deleted' ? 'DELETED' : 'DONE';
        typeBadge.style.backgroundColor = item.type === 'deleted' ? '#e74c3c' : '#2ecc71';

        const timeRemaining = document.createElement('div');
        timeRemaining.className = 'time-remaining';
        timeRemaining.textContent = `Expires in: ${getTimeRemaining(item.timestamp)}`;

        const taskTimes = document.createElement('div');
        taskTimes.className = 'task-times';
        if (task.startTime || task.deadline) {
            if (task.startTime) {
                taskTimes.innerHTML += `<div class="task-time"><span class="time-label">Start:</span><span>${formatDateTime(task.startTime)}</span></div>`;
            }
            if (task.deadline) {
                taskTimes.innerHTML += `<div class="task-time"><span class="time-label">Deadline:</span><span>${formatDateTime(task.deadline)}</span></div>`;
            }
        }

        taskContent.appendChild(taskText);
        taskContent.appendChild(typeBadge);
        if (task.startTime || task.deadline) taskContent.appendChild(taskTimes);
        taskContent.appendChild(timeRemaining);

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

// ---- Timers ----
setInterval(updateCurrentDateTime, 60000);
setInterval(() => { cleanupExpiredTasks(); displayTasks(); }, 60000);