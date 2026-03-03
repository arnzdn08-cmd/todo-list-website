// ============================================
// SIMPLE TODO LIST - VANILLA JAVASCRIPT
// ============================================

// Get references to HTML elements we'll need
// These are stored in variables so we can use them later
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

// Array to store all our tasks
// Each task will be an object with: text, startTime, and deadline
let tasks = [];

// Variable to store task that was just completed (for undo functionality)
let completedTask = null;
let undoTimeout = null;

// Variable to store task that was just deleted (for undo functionality)
let deletedTask = null;
let deleteUndoTimeout = null;

// Variable to store the task text while user is selecting times
let pendingTaskText = '';

// ============================================
// FUNCTION: Save tasks to localStorage
// ============================================
function saveTasksToStorage() {
    // Convert the tasks array to a JSON string and save it
    // localStorage can only store strings, so we need to convert
    localStorage.setItem('todoTasks', JSON.stringify(tasks));
}

// ============================================
// FUNCTION: Get undo list (deleted/done tasks) from localStorage
// ============================================
function getUndoList() {
    const undoList = localStorage.getItem('undoList');
    if (undoList) {
        return JSON.parse(undoList);
    }
    return [];
}

// ============================================
// FUNCTION: Save to undo list (for deleted/done tasks)
// ============================================
function saveToUndoList(task, type) {
    // type can be 'deleted' or 'done'
    const undoList = getUndoList();
    const timestamp = new Date().getTime(); // Current time in milliseconds
    
    undoList.push({
        task: task,
        type: type, // 'deleted' or 'done'
        timestamp: timestamp
    });
    
    localStorage.setItem('undoList', JSON.stringify(undoList));
}

// ============================================
// FUNCTION: Load tasks from localStorage
// ============================================
function loadTasksFromStorage() {
    // Get the saved tasks from localStorage
    const savedTasks = localStorage.getItem('todoTasks');
    
    // If there are saved tasks, convert them back to an array
    // JSON.parse converts the string back to an array
    if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks);
        // Convert old format (strings) to new format (objects) if needed
        tasks = parsedTasks.map(task => {
            // If task is a string (old format), convert it to object
            if (typeof task === 'string') {
                return {
                    text: task,
                    startTime: '',
                    deadline: ''
                };
            }
            // Otherwise, it's already in the new format
            return task;
        });
    } else {
        // If nothing is saved, start with an empty array
        tasks = [];
    }
}

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
// FUNCTION: Get user name from localStorage
// ============================================
function getUserName() {
    return localStorage.getItem('userName') || '';
}

// ============================================
// FUNCTION: Format current date for display (date only)
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
// FUNCTION: Update date display
// ============================================
function updateHeader() {
    // Update date display
    if (currentDate) {
        currentDate.textContent = formatCurrentDate();
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
// FUNCTION: Show time selection popup
// ============================================
function showTimePopup() {
    // Get the text the user typed in the input field
    // trim() removes extra spaces from the beginning and end
    const taskText = taskInput.value.trim();
    
    // Check if the input is not empty
    if (taskText === '') {
        // If empty, don't do anything
        return;
    }
    
    // Store the task text temporarily
    pendingTaskText = taskText;
    
    // Show the task text in the popup
    popupTaskText.textContent = taskText;
    
    // Pre-fill the datetime inputs with today's date and current time
    // This way users only need to adjust the time (date is already set to today)
    const currentDateTimeValue = getCurrentDateTimeForInput();
    startTimeInput.value = currentDateTimeValue;
    deadlineInput.value = currentDateTimeValue;
    
    // Show the popup
    timePopup.style.display = 'flex';
}

// ============================================
// FUNCTION: Hide time selection popup
// ============================================
function hideTimePopup() {
    // Hide the popup
    timePopup.style.display = 'none';
    
    // Clear the pending task text
    pendingTaskText = '';
    
    // Clear the time inputs
    startTimeInput.value = '';
    deadlineInput.value = '';
}

// ============================================
// FUNCTION: Confirm and add task with times
// ============================================
function confirmAddTask() {
    // Check if there's a pending task
    if (pendingTaskText === '') {
        return;
    }
    
    // Get the start time and deadline from the input fields
    const startTime = startTimeInput.value;
    const deadline = deadlineInput.value;
    
    // Create a task object with all the information
    const newTask = {
        text: pendingTaskText,
        startTime: startTime,
        deadline: deadline
    };
    
    // Add the task to our tasks array
    tasks.push(newTask);
    
    // Clear the task input field
    taskInput.value = '';
    
    // Hide the popup
    hideTimePopup();
    
    // Hide input section and show plus button again
    inputSection.style.display = 'none';
    showAddButton.style.display = 'block';
    
    // Save tasks to localStorage so they persist
    saveTasksToStorage();
    
    // Update the display to show the new task
    displayTasks();
}

// ============================================
// FUNCTION: Skip times and add task
// ============================================
function skipAndAddTask() {
    // Check if there's a pending task
    if (pendingTaskText === '') {
        return;
    }
    
    // Create a task object without times (empty strings)
    const newTask = {
        text: pendingTaskText,
        startTime: '',
        deadline: ''
    };
    
    // Add the task to our tasks array
    tasks.push(newTask);
    
    // Clear the task input field
    taskInput.value = '';
    
    // Hide the popup
    hideTimePopup();
    
    // Hide input section and show plus button again
    inputSection.style.display = 'none';
    showAddButton.style.display = 'block';
    
    // Save tasks to localStorage so they persist
    saveTasksToStorage();
    
    // Update the display to show the new task
    displayTasks();
}

// ============================================
// FUNCTION: Display all tasks in the list
// ============================================
function displayTasks() {
    // Clear the current list (remove all existing task items)
    taskList.innerHTML = '';
    
    // Check if there are no tasks
    if (tasks.length === 0) {
        const emptyMessage = document.createElement('li');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = 'No tasks yet. Add one above!';
        taskList.appendChild(emptyMessage);
        return;
    }
    
    // Create array with tasks and their original indices for sorting
    const tasksWithIndex = tasks.map((task, index) => ({ task, originalIndex: index }));
    
    // Sort tasks chronologically by deadline, then by start time, then by text
    tasksWithIndex.sort((a, b) => {
        const aTime = a.task.deadline || a.task.startTime || '';
        const bTime = b.task.deadline || b.task.startTime || '';
        if (aTime && bTime) {
            return new Date(aTime) - new Date(bTime);
        }
        if (aTime) return -1;
        if (bTime) return 1;
        return a.task.text.localeCompare(b.task.text);
    });
    
    // Loop through each sorted task and create a list item
    for (let i = 0; i < tasksWithIndex.length; i++) {
        const { task, originalIndex } = tasksWithIndex[i];
        
        // Create a new list item element
        const listItem = document.createElement('li');
        listItem.className = 'task-item';
        
        // Create a container for the task content (text and times)
        const taskContent = document.createElement('div');
        taskContent.className = 'task-content';
        
        // Create a span to hold the task text
        const taskText = document.createElement('span');
        taskText.className = 'task-text';
        taskText.textContent = task.text;
        
        // Create a container for the time information
        const taskTimes = document.createElement('div');
        taskTimes.className = 'task-times';
        
        // Only show times if they exist
        if (task.startTime || task.deadline) {
            // Add start time if it exists
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
            
            // Add deadline if it exists
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
        
        // Add text and times to the content container
        taskContent.appendChild(taskText);
        if (task.startTime || task.deadline) {
            taskContent.appendChild(taskTimes);
        }
        
        // Create a container for the buttons (Done and Delete)
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'task-buttons';
        
        // Create a "Done" button for this task
        const doneButton = document.createElement('button');
        doneButton.className = 'done-button';
        doneButton.textContent = 'Done';
        
        // Add an event listener to the done button
        doneButton.addEventListener('click', function() {
            completeTask(originalIndex);
        });
        
        // Create a delete button for this task
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.textContent = 'Delete';
        
        // Add an event listener to the delete button
        deleteButton.addEventListener('click', function() {
            deleteTask(originalIndex);
        });
        
        // Add both buttons to the button container
        buttonContainer.appendChild(doneButton);
        buttonContainer.appendChild(deleteButton);
        
        // Add the content and button container to the list item
        listItem.appendChild(taskContent);
        listItem.appendChild(buttonContainer);
        
        // Add the list item to the task list
        taskList.appendChild(listItem);
    }
}

// ============================================
// FUNCTION: Complete a task (mark as done)
// ============================================
function completeTask(index) {
    // Store the completed task object and index temporarily (for undo)
    // We need to copy the task object, not just reference it
    completedTask = {
        task: JSON.parse(JSON.stringify(tasks[index])),
        index: index
    };
    
    // Remove the task from the array
    tasks.splice(index, 1);
    
    // Save tasks to localStorage
    saveTasksToStorage();
    
    // Update the display
    displayTasks();
    
    // Show the undo notification
    showUndoNotification();
    
    // Set a timer to hide the undo notification after 3 seconds
    // Clear any existing timer first
    if (undoTimeout) {
        clearTimeout(undoTimeout);
    }
    
    // After 3 seconds (3000 milliseconds), hide the undo notification
    // and save to undo list if not undone
    undoTimeout = setTimeout(function() {
        hideUndoNotification();
        // If task wasn't undone, save it to the undo list
        if (completedTask !== null) {
            saveToUndoList(completedTask.task, 'done');
            completedTask = null; // Clear the completed task
        }
    }, 3000);
}

// ============================================
// FUNCTION: Show undo notification
// ============================================
function showUndoNotification() {
    // Make the undo notification visible
    undoNotification.style.display = 'flex';
}

// ============================================
// FUNCTION: Hide undo notification
// ============================================
function hideUndoNotification() {
    // Hide the undo notification
    undoNotification.style.display = 'none';
}

// ============================================
// FUNCTION: Undo the last completed task
// ============================================
function undoCompleteTask() {
    // Check if there's a completed task to undo
    if (completedTask === null) {
        return;
    }
    
    // Restore the task at its original index
    // If the index is beyond the current array length, just add it to the end
    if (completedTask.index <= tasks.length) {
        tasks.splice(completedTask.index, 0, completedTask.task);
    } else {
        tasks.push(completedTask.task);
    }
    
    // Clear the completed task and timeout
    completedTask = null;
    if (undoTimeout) {
        clearTimeout(undoTimeout);
        undoTimeout = null;
    }
    
    // Hide the undo notification
    hideUndoNotification();
    
    // Save tasks to localStorage
    saveTasksToStorage();
    
    // Update the display to show the restored task
    displayTasks();
}

// ============================================
// FUNCTION: Delete a task
// ============================================
function deleteTask(index) {
    // Store the deleted task object and index temporarily (for undo)
    // We need to copy the task object, not just reference it
    deletedTask = {
        task: JSON.parse(JSON.stringify(tasks[index])),
        index: index
    };
    
    // Remove the task from the array
    tasks.splice(index, 1);
    
    // Save tasks to localStorage
    saveTasksToStorage();
    
    // Update the display
    displayTasks();
    
    // Show the delete undo notification
    showDeleteUndoNotification();
    
    // Set a timer to hide the undo notification after 3 seconds
    // Clear any existing timer first
    if (deleteUndoTimeout) {
        clearTimeout(deleteUndoTimeout);
    }
    
    // After 3 seconds (3000 milliseconds), hide the undo notification
    // and save to undo list if not undone
    deleteUndoTimeout = setTimeout(function() {
        hideDeleteUndoNotification();
        // If task wasn't undone, save it to the undo list
        if (deletedTask !== null) {
            saveToUndoList(deletedTask.task, 'deleted');
            deletedTask = null; // Clear the deleted task
        }
    }, 3000);
}

// ============================================
// FUNCTION: Show delete undo notification
// ============================================
function showDeleteUndoNotification() {
    // Hide the complete undo notification if it's showing
    hideUndoNotification();
    // Make the delete undo notification visible
    deleteUndoNotification.style.display = 'flex';
}

// ============================================
// FUNCTION: Hide delete undo notification
// ============================================
function hideDeleteUndoNotification() {
    // Hide the delete undo notification
    deleteUndoNotification.style.display = 'none';
}

// ============================================
// FUNCTION: Undo the last deleted task
// ============================================
function undoDeleteTask() {
    // Check if there's a deleted task to undo
    if (deletedTask === null) {
        return;
    }
    
    // Restore the task at its original index
    // If the index is beyond the current array length, just add it to the end
    if (deletedTask.index <= tasks.length) {
        tasks.splice(deletedTask.index, 0, deletedTask.task);
    } else {
        tasks.push(deletedTask.task);
    }
    
    // Clear the deleted task and timeout
    deletedTask = null;
    if (deleteUndoTimeout) {
        clearTimeout(deleteUndoTimeout);
        deleteUndoTimeout = null;
    }
    
    // Hide the undo notification
    hideDeleteUndoNotification();
    
    // Save tasks to localStorage
    saveTasksToStorage();
    
    // Update the display to show the restored task
    displayTasks();
}

// ============================================
// EVENT LISTENERS - Respond to user actions
// ============================================

// When the plus button is clicked, show the input section
showAddButton.addEventListener('click', function() {
    inputSection.style.display = 'flex';
    showAddButton.style.display = 'none';
    taskInput.focus();
});

// When the "Add Task" button is clicked, show the time popup
addButton.addEventListener('click', showTimePopup);

// When the user presses Enter in the input field, also show the time popup
taskInput.addEventListener('keypress', function(event) {
    // Check if the key pressed was Enter
    if (event.key === 'Enter') {
        showTimePopup();
    }
});

// When the confirm button is clicked, add the task with times
confirmButton.addEventListener('click', confirmAddTask);

// When the skip button is clicked, add the task without times
cancelButton.addEventListener('click', skipAndAddTask);

// When clicking outside the popup, close it
timePopup.addEventListener('click', function(event) {
    // If user clicked directly on the popup overlay (not the content), close it
    if (event.target === timePopup) {
        hideTimePopup();
    }
});

// When the undo button is clicked, restore the last completed task
undoButton.addEventListener('click', undoCompleteTask);

// When the delete undo button is clicked, restore the last deleted task
deleteUndoButton.addEventListener('click', undoDeleteTask);

// ============================================
// INITIAL SETUP
// ============================================
// Load tasks from localStorage when the page loads
loadTasksFromStorage();

// Show the tasks (or empty state) when the page loads
displayTasks();

// Update greeting and date display immediately
updateHeader();

// Update greeting and date display every minute
setInterval(updateHeader, 60000);
