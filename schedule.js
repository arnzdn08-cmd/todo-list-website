// ============================================
// SCHEDULE PAGE - Shows todos organized by time
// ============================================

const scheduleContent = document.getElementById('scheduleContent');
const currentDate = document.getElementById('currentDate');

// ============================================
// FUNCTION: Format current date for display
// ============================================
function formatCurrentDate() {
    const now = new Date();
    const options = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    };
    return now.toLocaleDateString('en-US', options);
}

// ============================================
// FUNCTION: Get tasks from localStorage
// ============================================
function getTasks() {
    const savedTasks = localStorage.getItem('todoTasks');
    return savedTasks ? JSON.parse(savedTasks) : [];
}

// ============================================
// FUNCTION: Format time for display (HH:MM AM/PM)
// ============================================
function formatTime(dateTimeString) {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    const options = { hour: 'numeric', minute: '2-digit', hour12: true };
    return date.toLocaleString('en-US', options);
}

// ============================================
// FUNCTION: Check if task is for today
// ============================================
function isToday(dateTimeString) {
    if (!dateTimeString) return false;
    const taskDate = new Date(dateTimeString);
    const today = new Date();
    return taskDate.getDate() === today.getDate() &&
           taskDate.getMonth() === today.getMonth() &&
           taskDate.getFullYear() === today.getFullYear();
}

// ============================================
// FUNCTION: Get tasks for today
// ============================================
function getTodayTasks() {
    const tasks = getTasks();
    return tasks.filter(task => {
        // Check if task has start time or deadline for today
        return (task.startTime && isToday(task.startTime)) || 
               (task.deadline && isToday(task.deadline));
    });
}

// ============================================
// FUNCTION: Display schedule
// ============================================
function displaySchedule() {
    scheduleContent.innerHTML = '';
    
    const todayTasks = getTodayTasks();
    
    if (todayTasks.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'schedule-empty';
        emptyMessage.textContent = 'No todos for today yet';
        scheduleContent.appendChild(emptyMessage);
        return;
    }
    
    // Sort tasks by start time, then deadline
    todayTasks.sort((a, b) => {
        const aTime = a.startTime || a.deadline || '';
        const bTime = b.startTime || b.deadline || '';
        if (aTime && bTime) {
            return new Date(aTime) - new Date(bTime);
        }
        if (aTime) return -1;
        if (bTime) return 1;
        return 0;
    });
    
    // Create timetable
    const timetable = document.createElement('div');
    timetable.className = 'timetable';
    
    todayTasks.forEach((task, index) => {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        
        // Time column
        const timeColumn = document.createElement('div');
        timeColumn.className = 'time-column';
        
        if (task.startTime && isToday(task.startTime)) {
            timeColumn.textContent = formatTime(task.startTime);
        } else if (task.deadline && isToday(task.deadline)) {
            timeColumn.textContent = formatTime(task.deadline);
        }
        
        // Task column
        const taskColumn = document.createElement('div');
        taskColumn.className = 'task-column';
        
        const taskText = document.createElement('div');
        taskText.className = 'schedule-task-text';
        taskText.textContent = task.text;
        taskColumn.appendChild(taskText);
        
        // Show both times if they exist
        if (task.startTime && task.deadline) {
            const timeInfo = document.createElement('div');
            timeInfo.className = 'schedule-time-info';
            if (isToday(task.startTime)) {
                timeInfo.innerHTML = `<span>Start: ${formatTime(task.startTime)}</span>`;
            }
            if (isToday(task.deadline)) {
                timeInfo.innerHTML += `<span>Deadline: ${formatTime(task.deadline)}</span>`;
            }
            taskColumn.appendChild(timeInfo);
        }
        
        timeSlot.appendChild(timeColumn);
        timeSlot.appendChild(taskColumn);
        timetable.appendChild(timeSlot);
    });
    
    scheduleContent.appendChild(timetable);
}

// ============================================
// FUNCTION: Update date display
// ============================================
function updateDate() {
    if (currentDate) {
        currentDate.textContent = formatCurrentDate();
    }
}

// ============================================
// INITIAL SETUP
// ============================================
updateDate();
displaySchedule();

