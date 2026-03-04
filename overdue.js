// ============================================
// OVERDUE PAGE - Shows tasks past their deadline
// ============================================

import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-auth.js";
import {
    collection, doc, getDocs, addDoc, deleteDoc, updateDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.6.1/firebase-firestore.js";

const taskList = document.getElementById('taskList');
const reschedulePopup = document.getElementById('reschedulePopup');
const rescheduleTaskText = document.getElementById('rescheduleTaskText');
const newDeadlineInput = document.getElementById('newDeadlineInput');
const confirmRescheduleButton = document.getElementById('confirmRescheduleButton');
const cancelRescheduleButton = document.getElementById('cancelRescheduleButton');

let currentUser = null;
let allTasks = [];
let reschedulingTaskId = null;

// ---- Auth guard ----
onAuthStateChanged(auth, (user) => {
    if (!user) { window.location.href = 'welcome.html'; return; }
    currentUser = user;
    listenToTasks();
});

function tasksRef() {
    return collection(db, 'users', currentUser.uid, 'tasks');
}
function undoRef() {
    return collection(db, 'users', currentUser.uid, 'undoList');
}

function listenToTasks() {
    onSnapshot(tasksRef(), (snapshot) => {
        allTasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
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

function getCurrentDateTimeForInput() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function isOverdue(task) {
    return task.deadline && new Date(task.deadline) < new Date();
}

function getOverdueTasks() {
    return allTasks.filter(isOverdue);
}

function getOverdueTime(deadline) {
    const diff = new Date() - new Date(deadline);
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.max(1, Math.floor((diff % 3600000) / 60000));
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
}

// ============================================
// COMPLETE OVERDUE TASK
// ============================================

async function completeOverdueTask(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    await deleteDoc(doc(db, 'users', currentUser.uid, 'tasks', taskId));
    await addDoc(undoRef(), { task, type: 'done', timestamp: Date.now() });
}

// ============================================
// RESCHEDULE
// ============================================

function showReschedulePopup(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    reschedulingTaskId = taskId;
    rescheduleTaskText.textContent = task.text;
    newDeadlineInput.value = getCurrentDateTimeForInput();
    reschedulePopup.style.display = 'flex';
}

function hideReschedulePopup() {
    reschedulePopup.style.display = 'none';
    reschedulingTaskId = null;
    newDeadlineInput.value = '';
}

async function confirmReschedule() {
    if (!reschedulingTaskId) return;
    const newDeadline = newDeadlineInput.value;
    if (!newDeadline) { alert('Please select a new deadline'); return; }
    await updateDoc(doc(db, 'users', currentUser.uid, 'tasks', reschedulingTaskId), { deadline: newDeadline });
    hideReschedulePopup();
}

// ============================================
// DISPLAY
// ============================================

function displayTasks() {
    taskList.innerHTML = '';
    const overdueTasks = getOverdueTasks();
    if (overdueTasks.length === 0) {
        const emptyMessage = document.createElement('li');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = 'No overdue tasks! Great job staying on track!';
        taskList.appendChild(emptyMessage);
        return;
    }

    for (const task of overdueTasks) {
        const listItem = document.createElement('li');
        listItem.className = 'task-item overdue-task';

        const taskContent = document.createElement('div');
        taskContent.className = 'task-content';

        const taskText = document.createElement('span');
        taskText.className = 'task-text';
        taskText.textContent = task.text;

        const overdueBadge = document.createElement('div');
        overdueBadge.className = 'overdue-badge';
        overdueBadge.textContent = 'OVERDUE';

        const overdueTime = document.createElement('div');
        overdueTime.className = 'overdue-time';
        overdueTime.textContent = `Overdue: ${getOverdueTime(task.deadline)}`;

        const taskTimes = document.createElement('div');
        taskTimes.className = 'task-times';
        if (task.deadline) {
            taskTimes.innerHTML = `<div class="task-time"><span class="time-label">Deadline was:</span><span>${formatDateTime(task.deadline)}</span></div>`;
        }

        taskContent.appendChild(taskText);
        taskContent.appendChild(overdueBadge);
        if (task.deadline) taskContent.appendChild(taskTimes);
        taskContent.appendChild(overdueTime);

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'task-buttons';

        const doneButton = document.createElement('button');
        doneButton.className = 'done-button';
        doneButton.textContent = 'Done';
        doneButton.addEventListener('click', () => completeOverdueTask(task.id));

        const rescheduleButton = document.createElement('button');
        rescheduleButton.className = 'reschedule-button';
        rescheduleButton.textContent = 'Reschedule';
        rescheduleButton.addEventListener('click', () => showReschedulePopup(task.id));

        buttonContainer.appendChild(doneButton);
        buttonContainer.appendChild(rescheduleButton);

        listItem.appendChild(taskContent);
        listItem.appendChild(buttonContainer);
        taskList.appendChild(listItem);
    }
}

// ---- Events ----
confirmRescheduleButton.addEventListener('click', confirmReschedule);
cancelRescheduleButton.addEventListener('click', hideReschedulePopup);
reschedulePopup.addEventListener('click', (e) => { if (e.target === reschedulePopup) hideReschedulePopup(); });

setInterval(displayTasks, 30000);