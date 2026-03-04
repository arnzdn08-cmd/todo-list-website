// ============================================
// SCHEDULE PAGE - Shows todos organized by time
// ============================================

import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-auth.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-firestore.js";

const scheduleContent = document.getElementById('scheduleContent');
const currentDate = document.getElementById('currentDate');

let currentUser = null;

// ---- Auth guard ----
onAuthStateChanged(auth, (user) => {
    if (!user) { window.location.href = 'welcome.html'; return; }
    currentUser = user;
    listenToTasks();
    updateDate();
});

function tasksRef() {
    return collection(db, 'users', currentUser.uid, 'tasks');
}

function listenToTasks() {
    onSnapshot(tasksRef(), (snapshot) => {
        const tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        displaySchedule(tasks);
    });
}

// ============================================
// HELPERS
// ============================================

function formatCurrentDate() {
    return new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
}

function formatTime(dateTimeString) {
    if (!dateTimeString) return '';
    return new Date(dateTimeString).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function isToday(dateTimeString) {
    if (!dateTimeString) return false;
    const taskDate = new Date(dateTimeString);
    const today = new Date();
    return taskDate.getDate() === today.getDate() &&
           taskDate.getMonth() === today.getMonth() &&
           taskDate.getFullYear() === today.getFullYear();
}

function updateDate() {
    if (currentDate) currentDate.textContent = formatCurrentDate();
}

// ============================================
// DISPLAY
// ============================================

function displaySchedule(tasks) {
    scheduleContent.innerHTML = '';

    const todayTasks = tasks.filter(task =>
        (task.startTime && isToday(task.startTime)) ||
        (task.deadline && isToday(task.deadline))
    );

    if (todayTasks.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'schedule-empty';
        emptyMessage.textContent = 'No todos for today yet';
        scheduleContent.appendChild(emptyMessage);
        return;
    }

    todayTasks.sort((a, b) => {
        const aTime = a.startTime || a.deadline || '';
        const bTime = b.startTime || b.deadline || '';
        if (aTime && bTime) return new Date(aTime) - new Date(bTime);
        if (aTime) return -1;
        if (bTime) return 1;
        return 0;
    });

    const timetable = document.createElement('div');
    timetable.className = 'timetable';

    todayTasks.forEach(task => {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';

        const timeColumn = document.createElement('div');
        timeColumn.className = 'time-column';
        timeColumn.textContent = formatTime(
            (task.startTime && isToday(task.startTime)) ? task.startTime : task.deadline
        );

        const taskColumn = document.createElement('div');
        taskColumn.className = 'task-column';

        const taskText = document.createElement('div');
        taskText.className = 'schedule-task-text';
        taskText.textContent = task.text;
        taskColumn.appendChild(taskText);

        if (task.startTime && task.deadline) {
            const timeInfo = document.createElement('div');
            timeInfo.className = 'schedule-time-info';
            if (isToday(task.startTime)) timeInfo.innerHTML += `<span>Start: ${formatTime(task.startTime)}</span>`;
            if (isToday(task.deadline)) timeInfo.innerHTML += `<span>Deadline: ${formatTime(task.deadline)}</span>`;
            taskColumn.appendChild(timeInfo);
        }

        timeSlot.appendChild(timeColumn);
        timeSlot.appendChild(taskColumn);
        timetable.appendChild(timeSlot);
    });

    scheduleContent.appendChild(timetable);
}