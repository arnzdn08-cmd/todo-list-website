// ============================================
// UNDO PAGE - Shows deleted and done tasks
// ============================================

// Get references to HTML elements
const taskList = document.getElementById('taskList');
const currentDateTime = document.getElementById('currentDateTime');
const currentDate = document.getElementById('currentDate');

// 10 minutes in milliseconds (10 * 60 * 1000)
const TEN_MINUTES = 10 * 60 * 1000;

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
// FUNCTION: Format current date/time for display (no seconds)
// ============================================
function formatCurrentDateTime() {
    const now = new Date();
    const options = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    };
    
    return now.toLocaleString('en-US', options);
}

// ============================================
// FUNCTION: Format current date for display (big text)
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
// FUNCTION: Update current date/time display
// ============================================
function updateCurrentDateTime() {
    if (currentDate) {
        currentDate.textContent = formatCurrentDate();
    }
    if (currentDateTime) {
        currentDateTime.textContent = formatCurrentDateTime();
    }
}

// ============================================
// FUNCTION: Get undo list from localStorage
// ============================================
function getUndoList() {
    const undoList = localStorage.getItem('undoList');
    return undoList ? JSON.parse(undoList) : [];
}

// ============================================
// FUNCTION: Save undo list to localStorage
// ============================================
function saveUndoList(undoList) {
    localStorage.setItem('undoList', JSON.stringify(undoList));
}

// ============================================
// FUNCTION: Clean up expired tasks (older than 10 minutes)
// ============================================
function cleanupExpiredTasks() {
    const undoList = getUndoList();
    const now = new Date().getTime();
    
    // Filter out tasks older than 10 minutes
    const filteredList = undoList.filter(item => {
        const age = now - item.timestamp;
        return age < TEN_MINUTES;
    });
    
    // Save the cleaned list if any items were removed
    if (filteredList.length !== undoList.length) {
        saveUndoList(filteredList);
    }
    
    return filteredList;
}

// ============================================
// FUNCTION: Restore task to main todo list
// ============================================
function restoreTask(taskIndex) {
    const undoList = getUndoList();
    
    if (taskIndex < 0 || taskIndex >= undoList.length) {
        return;
    }
    
    const taskToRestore = undoList[taskIndex];
    
    // Get current tasks from localStorage
    const savedTasks = localStorage.getItem('todoTasks');
    let tasks = [];
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
    }
    
    // Add the restored task back to the tasks array
    tasks.push(taskToRestore.task);
    
    // Save tasks back to localStorage
    localStorage.setItem('todoTasks', JSON.stringify(tasks));
    
    // Remove from undo list
    undoList.splice(taskIndex, 1);
    saveUndoList(undoList);
    
    // Refresh the display
    displayTasks();
}

// ============================================
// FUNCTION: Permanently delete task from undo list
// ============================================
function permanentlyDeleteTask(taskIndex) {
    const undoList = getUndoList();
    
    if (taskIndex < 0 || taskIndex >= undoList.length) {
        return;
    }
    
    // Remove from undo list
    undoList.splice(taskIndex, 1);
    saveUndoList(undoList);
    
    // Refresh the display
    displayTasks();
}

// ============================================
// FUNCTION: Calculate time remaining until expiration (minutes only)
// ============================================
function getTimeRemaining(timestamp) {
    const now = new Date().getTime();
    const age = now - timestamp;
    const remaining = TEN_MINUTES - age;
    
    if (remaining <= 0) {
        return 'Expired';
    }
    
    const minutes = Math.ceil(remaining / 60000); // Round up to nearest minute
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

// ============================================
// FUNCTION: Display all tasks in the undo list
// ============================================
function displayTasks() {
    // Clear the current list
    taskList.innerHTML = '';
    
    // Clean up expired tasks and get the list
    const undoList = cleanupExpiredTasks();
    
    // Check if there are no tasks
    if (undoList.length === 0) {
        const emptyMessage = document.createElement('li');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = 'No deleted or done tasks. Tasks expire after 10 minutes.';
        taskList.appendChild(emptyMessage);
        return;
    }
    
    // Loop through each task and create a list item
    for (let i = 0; i < undoList.length; i++) {
        const item = undoList[i];
        const task = item.task;
        
        // Create a new list item element
        const listItem = document.createElement('li');
        listItem.className = 'task-item';
        
        // Add a class based on type (deleted or done)
        if (item.type === 'deleted') {
            listItem.classList.add('task-deleted');
        } else {
            listItem.classList.add('task-done');
        }
        
        // Create a container for the task content
        const taskContent = document.createElement('div');
        taskContent.className = 'task-content';
        
        // Create a span for the task text
        const taskText = document.createElement('span');
        taskText.className = 'task-text';
        taskText.textContent = task.text;
        
        // Create a container for the time information
        const taskTimes = document.createElement('div');
        taskTimes.className = 'task-times';
        
        // Show type badge
        const typeBadge = document.createElement('div');
        typeBadge.className = 'type-badge';
        typeBadge.textContent = item.type === 'deleted' ? 'DELETED' : 'DONE';
        typeBadge.style.backgroundColor = item.type === 'deleted' ? '#e74c3c' : '#2ecc71';
        
        // Show time remaining (with data attribute for easy updates)
        const timeRemaining = document.createElement('div');
        timeRemaining.className = 'time-remaining';
        timeRemaining.setAttribute('data-timestamp', item.timestamp);
        timeRemaining.textContent = `Expires in: ${getTimeRemaining(item.timestamp)}`;
        
        // Add start time and deadline if they exist
        if (task.startTime || task.deadline) {
            if (task.startTime) {
                const startTimeDiv = document.createElement('div');
                startTimeDiv.className = 'task-time';
                const startLabel = document.createElement('span');
                startLabel.className = 'time-label';
                startLabel.textContent = 'Start:';
                const startValue = document.createElement('span');
                startValue.textContent = formatDateTime(task.startTime);
                startTimeDiv.appendChild(startLabel);
                startTimeDiv.appendChild(startValue);
                taskTimes.appendChild(startTimeDiv);
            }
            
            if (task.deadline) {
                const deadlineDiv = document.createElement('div');
                deadlineDiv.className = 'task-time';
                const deadlineLabel = document.createElement('span');
                deadlineLabel.className = 'time-label';
                deadlineLabel.textContent = 'Deadline:';
                const deadlineValue = document.createElement('span');
                deadlineValue.textContent = formatDateTime(task.deadline);
                deadlineDiv.appendChild(deadlineLabel);
                deadlineDiv.appendChild(deadlineValue);
                taskTimes.appendChild(deadlineDiv);
            }
        }
        
        // Add text, badge, times, and time remaining to content
        taskContent.appendChild(taskText);
        taskContent.appendChild(typeBadge);
        if (task.startTime || task.deadline) {
            taskContent.appendChild(taskTimes);
        }
        taskContent.appendChild(timeRemaining);
        
        // Create a container for the buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'task-buttons';
        
        // Create a restore button
        const restoreButton = document.createElement('button');
        restoreButton.className = 'restore-button';
        restoreButton.textContent = 'Restore';
        restoreButton.addEventListener('click', function() {
            restoreTask(i);
        });
        
        // Create a delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', function() {
            permanentlyDeleteTask(i);
        });
        
        // Add buttons to container
        buttonContainer.appendChild(restoreButton);
        buttonContainer.appendChild(deleteButton);
        
        // Add content and buttons to list item
        listItem.appendChild(taskContent);
        listItem.appendChild(buttonContainer);
        
        // Add the list item to the task list
        taskList.appendChild(listItem);
    }
}

// ============================================
// FUNCTION: Update time remaining displays (without recreating list)
// ============================================
function updateTimeRemaining() {
    const timeRemainingElements = document.querySelectorAll('.time-remaining[data-timestamp]');
    const undoList = cleanupExpiredTasks();
    
    timeRemainingElements.forEach(el => {
        const timestamp = parseInt(el.getAttribute('data-timestamp'));
        const item = undoList.find(item => item.timestamp === timestamp);
        
        if (!item) {
            // Task expired, refresh the whole list
            displayTasks();
        } else {
            // Just update the text
            el.textContent = `Expires in: ${getTimeRemaining(timestamp)}`;
        }
    });
    
    // If list was cleared, refresh display
    if (undoList.length === 0 && taskList.children.length > 0) {
        displayTasks();
    }
}

// ============================================
// INITIAL SETUP
// ============================================
// Update the current date/time display immediately
updateCurrentDateTime();

// Update the current date/time display every minute
setInterval(updateCurrentDateTime, 60000);

// Show the tasks when the page loads
displayTasks();

// Update time remaining every minute (60000ms)
setInterval(updateTimeRemaining, 60000);

