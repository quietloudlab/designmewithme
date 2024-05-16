document.addEventListener('DOMContentLoaded', () => {
    const inputArea = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const messageArea = document.getElementById('message-area');
    const clearChatButton = document.getElementById('clearChat');
    let styleSheet = document.createElement('style');
    document.head.appendChild(styleSheet);

    let currentStyles = {};

    // Function to append messages to the message area
    function appendMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.innerHTML = text.replace(/\n/g, '<br>'); // Convert newlines to <br>
        messageDiv.className = sender === 'user' ? 'user-message' : 'bot-message';
        messageArea.appendChild(messageDiv);
        messageArea.scrollTop = messageArea.scrollHeight; // Auto-scroll to the latest message
        saveMessageToLocalStorage(text, sender); // Save message to localStorage
    }

    // Function to load saved messages from localStorage
    function loadSavedMessages() {
        const messages = localStorage.getItem('chatMessages');
        if (messages) {
            JSON.parse(messages).forEach(msg => {
                appendMessage(msg.text, msg.sender);
            });
        }
    }

    // Function to apply saved styles from localStorage
    function applySavedStyles() {
        const savedStyles = localStorage.getItem('userStyles');
        if (savedStyles) {
            const styles = JSON.parse(savedStyles);
            Object.keys(styles).forEach(selector => {
                const properties = styles[selector];
                let styleString = `${selector} {`;
                Object.keys(properties).forEach(property => {
                    styleString += `${property}: ${properties[property]};`;
                });
                styleString += '}';
                styleSheet.innerHTML += styleString;
            });
        }
    }

    // Function to send messages to the server
    function sendMessage() {
        const message = inputArea.value.trim();
        if (message) {
            appendMessage(message, 'user');
            showLoading(); // Show loading animation when sending a message
            sendMessageToServer(message);
            inputArea.value = '';  // Clear input field after sending
        }
    }

    // Function to send the message to the server and handle the response
    function sendMessageToServer(message) {
        fetch('/send_message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        })
        .then(response => response.json())
        .then(data => {
            hideLoading();
            if (data.responses && data.responses.length > 0) {
                data.responses.forEach(handleResponse);
            }
        })
        .catch((error) => {
            hideLoading();
            console.error('Error:', error);
            appendMessage('Error connecting to the server', 'bot');
        });
    }

    // Function to handle responses from the server
    function handleResponse(response) {
        if (response.includes('UI_CHANGE:')) {
            const jsonStart = response.indexOf('UI_CHANGE:');
            const jsonStr = response.substring(jsonStart + 10).trim();
            try {
                const commands = JSON.parse(jsonStr);
                commands.forEach(command => handleAICommand(command));
                response = response.substring(0, jsonStart).trim(); // Remove JSON from the message
            } catch (e) {
                console.error('Failed to parse JSON commands:', e);
            }
        }
        if (response) { // Only append if there's a response
            appendMessage(response, 'bot');
        }
    }

    // Function to handle commands from the AI (CSS changes)
    function handleAICommand(command) {
        if (command.action === "changeCSS") {
            const selector = command.selector;
            const properties = command.properties;
            let styleString = `${selector} {`;
            Object.entries(properties).forEach(([prop, value]) => {
                styleString += `${prop}: ${value};`;
                saveStyleToLocalStorage(selector, prop, value); // Save styles
            });
            styleString += '}';
            styleSheet.innerHTML += styleString;
        }
    }

    // Show loading animation
    function showLoading() {
        const loadingContainer = document.createElement('div');
        loadingContainer.id = 'loading';
        loadingContainer.className = 'loading-container';
        loadingContainer.innerHTML = '<div class="loading-spinner"></div>';
        messageArea.appendChild(loadingContainer);
        messageArea.scrollTop = messageArea.scrollHeight; // Auto-scroll to the loading animation
    }

    // Hide loading animation
    function hideLoading() {
        const loadingContainer = document.getElementById('loading');
        if (loadingContainer) {
            loadingContainer.remove();
        }
    }

    // Function to save styles to localStorage
    function saveStyleToLocalStorage(selector, property, value) {
        let styles = localStorage.getItem('userStyles');
        styles = styles ? JSON.parse(styles) : {};
        if (!styles[selector]) styles[selector] = {};
        styles[selector][property] = value;
        localStorage.setItem('userStyles', JSON.stringify(styles));
    }

    // Function to save messages to localStorage
    function saveMessageToLocalStorage(text, sender) {
        let messages = localStorage.getItem('chatMessages');
        messages = messages ? JSON.parse(messages) : [];
        messages.push({ text: text, sender: sender });
        localStorage.setItem('chatMessages', JSON.stringify(messages));
    }

    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    inputArea.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
            e.preventDefault();  // Prevents the default action
        }
    });

    clearChatButton.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear the chat and reset all settings? This action cannot be undone.")) {
            localStorage.removeItem('chatMessages');
            localStorage.removeItem('userStyles');
            window.location.reload();
        }
    });

    // Initialize saved styles and messages
    applySavedStyles();
    loadSavedMessages();
});
