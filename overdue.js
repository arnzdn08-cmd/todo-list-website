// ============================================
// OVERDUE PAGE - Shows tasks past their deadline
// ============================================

// Get references to HTML elements
const taskList = document.getElementById('taskList');
const reschedulePopup = document.getElementById('reschedulePopup');
const rescheduleTaskText = document.getElementById('rescheduleTaskText');
const newDeadlineInput = document.getElementById('newDeadlineInput');
const confirmRescheduleButton = document.getElementById('confirmRescheduleButton');
const cancelRescheduleButton = document.getElementById('cancelRescheduleButton');

// Variable to store the index of the task being rescheduled
let reschedulingTaskIndex = -1;

// ============================================
// FUNCTION: Format datetime for display (task times)
// Shows "Today", "Tomorrow", or date format based on when it is
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
    
    if (diffDays === 0) {
        return `Today, ${timeStr}`;
    } else if (diffDays === 1) {
        return `Tomorrow, ${timeStr}`;
    } else if (diffDays === 2) {
        const dateOptions = { month: 'short', day: 'numeric' };
        return `${date.toLocaleDateString('en-US', dateOptions)}, ${timeStr}`;
    } else {
        const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
        return `${date.toLocaleDateString('en-US', dateOptions)}, ${timeStr}`;
    }
}

// ============================================
// FUNCTION: Get current date/time in format for datetime-local input
// ============================================
function getCurrentDateTimeForInput() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

// ============================================
// FUNCTION: Get tasks from localStorage
// ============================================
function getTasks() {
    const savedTasks = localStorage.getItem('todoTasks');
    return savedTasks ? JSON.parse(savedTasks) : [];
}

// ============================================
// FUNCTION: Save tasks to localStorage
// ============================================
function saveTasks(tasks) {
    localStorage.setItem('todoTasks', JSON.stringify(tasks));
}

// ============================================
// FUNCTION: Get undo list from localStorage
// ============================================
function getUndoList() {
    const undoList = localStorage.getItem('undoList');
    return undoList ? JSON.parse(undoList) : [];
}

// ============================================
// FUNCTION: Save to undo list (for done tasks)
// ============================================
function saveToUndoList(task, type) {
    const undoList = getUndoList();
    const timestamp = new Date().getTime();
    
    undoList.push({
        task: task,
        type: type,
        timestamp: timestamp
    });
    
    localStorage.setItem('undoList', JSON.stringify(undoList));
}

// ============================================
// FUNCTION: Check if a task is overdue
// ============================================
function isOverdue(task) {
    return task.deadline && new Date(task.deadline) < new Date();
}

// ============================================
// FUNCTION: Get all overdue tasks
// ============================================
function getOverdueTasks() {
    const tasks = getTasks();
    return tasks.filter((task, index) => {
        return isOverdue(task);
    });
}

// ============================================
// FUNCTION: Complete an overdue task
// ============================================
function completeOverdueTask(originalIndex) {
    const tasks = getTasks();
    const overdueTasks = getOverdueTasks();
    
    if (originalIndex < 0 || originalIndex >= overdueTasks.length) {
        return;
    }
    
    // Find the task in the full tasks array
    const overdueTask = overdueTasks[originalIndex];
    const fullIndex = tasks.findIndex(t => 
        t.text === overdueTask.text && 
        t.deadline === overdueTask.deadline &&
        t.startTime === overdueTask.startTime
    );
    
    if (fullIndex === -1) {
        return;
    }
    
    // Remove from tasks
    const completedTask = tasks[fullIndex];
    tasks.splice(fullIndex, 1);
    saveTasks(tasks);
    
    // Save to undo list
    saveToUndoList(completedTask, 'done');
    
    // Refresh display
    displayTasks();
}

// ============================================
// FUNCTION: Show reschedule popup
// ============================================
function showReschedulePopup(originalIndex) {
    const overdueTasks = getOverdueTasks();
    
    if (originalIndex < 0 || originalIndex >= overdueTasks.length) {
        return;
    }
    
    reschedulingTaskIndex = originalIndex;
    const task = overdueTasks[originalIndex];
    
    // Show task text in popup
    rescheduleTaskText.textContent = task.text;
    
    // Pre-fill with current date/time
    newDeadlineInput.value = getCurrentDateTimeForInput();
    
    // Show popup
    reschedulePopup.style.display = 'flex';
}

// ============================================
// FUNCTION: Hide reschedule popup
// ============================================
function hideReschedulePopup() {
    reschedulePopup.style.display = 'none';
    reschedulingTaskIndex = -1;
    newDeadlineInput.value = '';
}

// ============================================
// FUNCTION: Confirm reschedule
// ============================================
function confirmReschedule() {
    if (reschedulingTaskIndex === -1) {
        return;
    }
    
    const newDeadline = newDeadlineInput.value;
    if (!newDeadline) {
        alert('Please select a new deadline');
        return;
    }
    
    const tasks = getTasks();
    const overdueTasks = getOverdueTasks();
    const taskToReschedule = overdueTasks[reschedulingTaskIndex];
    
    // Find the task in the full tasks array
    const fullIndex = tasks.findIndex(t => 
        t.text === taskToReschedule.text && 
        t.deadline === taskToReschedule.deadline &&
        t.startTime === taskToReschedule.startTime
    );
    
    if (fullIndex === -1) {
        return;
    }
    
    // Update the deadline
    tasks[fullIndex].deadline = newDeadline;
    saveTasks(tasks);
    
    // Hide popup
    hideReschedulePopup();
    
    // Refresh display
    displayTasks();
}

// ============================================
// FUNCTION: Calculate how overdue a task is (minutes minimum)
// ============================================
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
// FUNCTION: Display all overdue tasks
// ============================================
function displayTasks() {
    // Clear the current list
    taskList.innerHTML = '';
    
    const overdueTasks = getOverdueTasks();
    
    // Check if there are no overdue tasks
    if (overdueTasks.length === 0) {
        const emptyMessage = document.createElement('li');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = 'No overdue tasks! Great job staying on track!';
        taskList.appendChild(emptyMessage);
        return;
    }
    
    // Loop through each overdue task and create a list item
    for (let i = 0; i < overdueTasks.length; i++) {
        const task = overdueTasks[i];
        
        // Create a new list item element
        const listItem = document.createElement('li');
        listItem.className = 'task-item overdue-task';
        
        // Create a container for the task content
        const taskContent = document.createElement('div');
        taskContent.className = 'task-content';
        
        // Create a span for the task text
        const taskText = document.createElement('span');
        taskText.className = 'task-text';
        taskText.textContent = task.text;
        
        // Show overdue badge
        const overdueBadge = document.createElement('div');
        overdueBadge.className = 'overdue-badge';
        overdueBadge.textContent = 'OVERDUE';
        
        // Show how overdue
        const overdueTime = document.createElement('div');
        overdueTime.className = 'overdue-time';
        overdueTime.textContent = `Overdue: ${getOverdueTime(task.deadline)}`;
        
        // Create a container for the time information
        const taskTimes = document.createElement('div');
        taskTimes.className = 'task-times';
        
        // Show deadline
        if (task.deadline) {
            const deadlineDiv = document.createElement('div');
            deadlineDiv.className = 'task-time';
            const deadlineLabel = document.createElement('span');
            deadlineLabel.className = 'time-label';
            deadlineLabel.textContent = 'Deadline was:';
            const deadlineValue = document.createElement('span');
            deadlineValue.textContent = formatDateTime(task.deadline);
            deadlineDiv.appendChild(deadlineLabel);
            deadlineDiv.appendChild(deadlineValue);
            taskTimes.appendChild(deadlineDiv);
        }
        
        // Add text, badge, times, and overdue time to content
        taskContent.appendChild(taskText);
        taskContent.appendChild(overdueBadge);
        if (task.deadline) {
            taskContent.appendChild(taskTimes);
        }
        taskContent.appendChild(overdueTime);
        
        // Create a container for the buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'task-buttons';
        
        // Create a done button
        const doneButton = document.createElement('button');
        doneButton.className = 'done-button';
        doneButton.textContent = 'Done';
        doneButton.addEventListener('click', function() {
            completeOverdueTask(i);
        });
        
        // Create a reschedule button
        const rescheduleButton = document.createElement('button');
        rescheduleButton.className = 'reschedule-button';
        rescheduleButton.textContent = 'Reschedule';
        rescheduleButton.addEventListener('click', function() {
            showReschedulePopup(i);
        });
        
        // Add buttons to container
        buttonContainer.appendChild(doneButton);
        buttonContainer.appendChild(rescheduleButton);
        
        // Add content and buttons to list item
        listItem.appendChild(taskContent);
        listItem.appendChild(buttonContainer);
        
        // Add the list item to the task list
        taskList.appendChild(listItem);
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

// When confirm reschedule button is clicked
confirmRescheduleButton.addEventListener('click', confirmReschedule);

// When cancel reschedule button is clicked
cancelRescheduleButton.addEventListener('click', hideReschedulePopup);

// When clicking outside the popup, close it
reschedulePopup.addEventListener('click', function(event) {
    if (event.target === reschedulePopup) {
        hideReschedulePopup();
    }
});

// ============================================
// INITIAL SETUP
// ============================================
// Refresh overdue tasks display every 30 seconds
setInterval(displayTasks, 30000);

// Show the overdue tasks when the page loads
displayTasks();

