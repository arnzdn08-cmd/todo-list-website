// ============================================
// SCHEDULE PAGE - Firebase compat SDK
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

const scheduleContent = document.getElementById('scheduleContent');
const currentDate = document.getElementById('currentDate');
let currentUser = null;

auth.onAuthStateChanged(user => {
    if (!user) { window.location.href = 'welcome.html'; return; }
    currentUser = user;
    if (currentDate) currentDate.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    listenToTasks();
});

function tasksRef() { return db.collection('users').doc(currentUser.uid).collection('tasks'); }

function listenToTasks() {
    tasksRef().onSnapshot(snapshot => {
        const tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        displaySchedule(tasks);
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
    return taskDate.getDate() === today.getDate() && taskDate.getMonth() === today.getMonth() && taskDate.getFullYear() === today.getFullYear();
}

function displaySchedule(tasks) {
    scheduleContent.innerHTML = '';
    const todayTasks = tasks.filter(task => (task.startTime && isToday(task.startTime)) || (task.deadline && isToday(task.deadline)));
    if (todayTasks.length === 0) {
        scheduleContent.innerHTML = '<div class="schedule-empty">No todos for today yet</div>';
        return;
    }
    todayTasks.sort((a, b) => {
        const aTime = a.startTime || a.deadline || '';
        const bTime = b.startTime || b.deadline || '';
        if (aTime && bTime) return new Date(aTime) - new Date(bTime);
        return aTime ? -1 : 1;
    });
    const timetable = document.createElement('div');
    timetable.className = 'timetable';
    todayTasks.forEach(task => {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        const timeColumn = document.createElement('div');
        timeColumn.className = 'time-column';
        timeColumn.textContent = formatTime((task.startTime && isToday(task.startTime)) ? task.startTime : task.deadline);
        const taskColumn = document.createElement('div');
        taskColumn.className = 'task-column';
        taskColumn.innerHTML = `<div class="schedule-task-text">${task.text}</div>`;
        if (task.startTime && task.deadline) {
            let timeInfo = '<div class="schedule-time-info">';
            if (isToday(task.startTime)) timeInfo += `<span>Start: ${formatTime(task.startTime)}</span>`;
            if (isToday(task.deadline)) timeInfo += `<span>Deadline: ${formatTime(task.deadline)}</span>`;
            timeInfo += '</div>';
            taskColumn.innerHTML += timeInfo;
        }
        timeSlot.appendChild(timeColumn);
        timeSlot.appendChild(taskColumn);
        timetable.appendChild(timeSlot);
    });
    scheduleContent.appendChild(timetable);
}