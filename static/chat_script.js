document.addEventListener('DOMContentLoaded', () => {
    const inputArea = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const messageArea = document.getElementById('message-area');
    const clearChatButton = document.getElementById('clearChat');
    const aboutModal = document.getElementById('about-modal');
    const aboutButton = document.getElementById('about-button');
    const closeAbout = document.getElementById('close-about');
    const startChat = document.getElementById('start-chat');
    let styleSheet = document.createElement('style');
    document.head.appendChild(styleSheet);

    // Show the about modal when the About button is clicked
    aboutButton.addEventListener('click', () => {
        aboutModal.style.display = 'block';
    });

    closeAbout.addEventListener('click', () => {
        aboutModal.style.display = 'none';
    });

    startChat.addEventListener('click', () => {
        aboutModal.style.display = 'none';
    });

    window.onclick = (event) => {
        if (event.target === aboutModal) {
            aboutModal.style.display = 'none';
        }
    };

    let currentStyles = {};

    function appendMessage(text, sender, messageId = null) {
        const messageDiv = document.createElement('div');
        messageDiv.innerHTML = text.replace(/\n/g, '<br>');
        messageDiv.className = sender === 'user' ? 'user-message' : 'bot-message';
        if (messageId) {
            const tryAgainButton = document.createElement('button');
            tryAgainButton.textContent = 'Try Again';
            tryAgainButton.className = 'try-again-button';
            tryAgainButton.addEventListener('click', () => regenerateMessage(messageId));
            messageDiv.appendChild(tryAgainButton);
        }
        messageArea.appendChild(messageDiv);
        messageArea.scrollTop = messageArea.scrollHeight;
        saveMessageToLocalStorage(text, sender);
    }

    function loadSavedMessages() {
        const messages = localStorage.getItem('chatMessages');
        if (messages) {
            JSON.parse(messages).forEach(msg => {
                appendMessage(msg.text, msg.sender);
            });
        }
    }

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

    function sendMessage() {
        const message = inputArea.value.trim();
        if (message) {
            appendMessage(message, 'user');
            showLoading();
            sendMessageToServer(message);
            inputArea.value = '';
        }
    }

    function sendMessageToServer(message) {
        return fetch('/send_message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        })
        .then(response => response.json())
        .then(data => {
            hideLoading();
            if (data.responses && data.responses.length > 0) {
                data.responses.forEach((response, index) => handleResponse(response, data.messageIds[index]));
            } else {
                appendMessage('Error connecting to the server', 'bot');
            }
        })
        .catch((error) => {
            hideLoading();
            console.error('Error:', error);
            appendMessage('Error connecting to the server', 'bot');
        });
    }

    function regenerateMessage(messageId) {
        fetch('/send_message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageId: messageId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.responses && data.responses.length > 0) {
                data.responses.forEach((response, index) => handleResponse(response, data.messageIds[index]));
            } else {
                appendMessage('Error connecting to the server', 'bot');
            }
        })
        .catch((error) => {
            console.error('Error:', error);
            appendMessage('Error connecting to the server', 'bot');
        });
    }

    function handleResponse(response, messageId) {
        if (response.includes('UI_CHANGE:')) {
            const jsonStart = response.indexOf('UI_CHANGE:');
            const jsonStr = response.substring(jsonStart + 10).trim();
            try {
                const commands = JSON.parse(jsonStr);
                commands.forEach(command => handleAICommand(command));
                response = response.substring(0, jsonStart).trim();
            } catch (e) {
                console.error('Failed to parse JSON commands:', e);
            }
        }
        if (response) {
            appendMessage(response, 'bot', messageId);
        }
    }

    function handleAICommand(command) {
        if (command.action === "changeCSS") {
            const selector = command.selector;
            const properties = command.properties;
            let styleString = `${selector} {`;
            Object.entries(properties).forEach(([prop, value]) => {
                styleString += `${prop}: ${value};`;
                saveStyleToLocalStorage(selector, prop, value);
            });
            styleString += '}';
            styleSheet.innerHTML += styleString;
        }
    }

    function showLoading() {
        const loadingContainer = document.createElement('div');
        loadingContainer.id = 'loading';
        loadingContainer.className = 'loading-container';
        loadingContainer.innerHTML = '<div class="loading-spinner"></div>';
        messageArea.appendChild(loadingContainer);
        messageArea.scrollTop = messageArea.scrollHeight;
    }

    function hideLoading() {
        const loadingContainer = document.getElementById('loading');
        if (loadingContainer) {
            loadingContainer.remove();
        }
    }

    function saveStyleToLocalStorage(selector, property, value) {
        let styles = localStorage.getItem('userStyles');
        styles = styles ? JSON.parse(styles) : {};
        if (!styles[selector]) styles[selector] = {};
        styles[selector][property] = value;
        localStorage.setItem('userStyles', JSON.stringify(styles));
    }

    function saveMessageToLocalStorage(text, sender) {
        let messages = localStorage.getItem('chatMessages');
        messages = messages ? JSON.parse(messages) : [];
        messages.push({ text: text, sender: sender });
        localStorage.setItem('chatMessages', JSON.stringify(messages));
    }

    sendButton.addEventListener('click', sendMessage);
    inputArea.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
            e.preventDefault();
        }
    });

    clearChatButton.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear the chat and reset all settings? This action cannot be undone.")) {
            localStorage.removeItem('chatMessages');
            localStorage.removeItem('userStyles');
            sendMessageToServer('System Message: The user has reset the style and UI, and you are starting from a blank slate. Please greet the user.')
                .then(() => {
                    window.location.reload();
                });
        }
    });

    applySavedStyles();
    loadSavedMessages();
});
