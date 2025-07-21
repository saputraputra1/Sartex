document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const loginModal = document.getElementById('loginModal');
    const createModal = document.getElementById('createModal');
    const loginButton = document.getElementById('loginButton');
    const createAccountLink = document.getElementById('createAccountLink');
    const createAccountButton = document.getElementById('createAccountButton');
    const loginLink = document.getElementById('loginLink');
    const chatContainer = document.getElementById('chatContainer');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const attachmentButton = document.getElementById('attachmentButton');
    const fileInput = document.getElementById('fileInput');
    const partnerName = document.getElementById('partnerName');
    const partnerStatus = document.getElementById('partnerStatus');
    
    // Variables
    let currentUserId = '';
    let partnerId = '';
    let messagesRef = null;
    let partnerStatusRef = null;
    
    // Check if user is already logged in
    const savedCoupleId = localStorage.getItem('coupleId');
    const savedCouplePassword = localStorage.getItem('couplePassword');
    
    if (savedCoupleId && savedCouplePassword) {
        attemptLogin(savedCoupleId, savedCouplePassword);
    } else {
        showLoginModal();
    }
    
    // Event listeners
    loginButton.addEventListener('click', handleLogin);
    createAccountLink.addEventListener('click', showCreateModal);
    createAccountButton.addEventListener('click', handleCreateAccount);
    loginLink.addEventListener('click', showLoginModal);
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendMessage();
    });
    attachmentButton.addEventListener('click', function() {
        fileInput.click();
    });
    fileInput.addEventListener('change', handleFileUpload);
    
    // Functions
    function showLoginModal() {
        loginModal.classList.add('modal-active');
        createModal.classList.remove('modal-active');
    }
    
    function showCreateModal() {
        createModal.classList.add('modal-active');
        loginModal.classList.remove('modal-active');
    }
    
    function handleLogin() {
        const coupleId = document.getElementById('coupleId').value;
        const password = document.getElementById('couplePassword').value;
        
        if (!coupleId || !password) {
            alert('Please enter both ID and password');
            return;
        }
        
        attemptLogin(coupleId, password);
    }
    
    function attemptLogin(coupleId, password) {
        db.ref('/couples/' + coupleId).once('value')
            .then(snapshot => {
                const coupleData = snapshot.val();
                
                if (!coupleData) {
                    alert('Couple ID not found');
                    return;
                }
                
                if (coupleData.password !== password) {
                    alert('Incorrect password');
                    return;
                }
                
                // Login successful
                currentUserId = generateId();
                partnerId = coupleData.partnerId || '';
                
                // Save to localStorage
                localStorage.setItem('coupleId', coupleId);
                localStorage.setItem('couplePassword', password);
                localStorage.setItem('uid', currentUserId);
                
                // Initialize chat
                initializeChat(coupleId, coupleData);
                
                // Close modals
                loginModal.classList.remove('modal-active');
                createModal.classList.remove('modal-active');
            })
            .catch(error => {
                console.error('Login error:', error);
                alert('Login failed. Please try again.');
            });
    }
    
    function handleCreateAccount() {
        const newCoupleId = document.getElementById('newCoupleId').value;
        const newPassword = document.getElementById('newCouplePassword').value;
        const yourName = document.getElementById('yourName').value;
        
        if (!newCoupleId || !newPassword) {
            alert('Please enter both ID and password');
            return;
        }
        
        // Check if ID already exists
        db.ref('/couples/' + newCoupleId).once('value')
            .then(snapshot => {
                if (snapshot.exists()) {
                    alert('This ID is already taken. Please choose another one.');
                    return;
                }
                
                // Create new couple account
                const coupleData = {
                    id: newCoupleId,
                    password: newPassword,
                    created: firebase.database.ServerValue.TIMESTAMP,
                    members: {
                        [generateId()]: {
                            name: yourName || 'User 1',
                            joined: firebase.database.ServerValue.TIMESTAMP
                        }
                    }
                };
                
                return db.ref('/couples/' + newCoupleId).set(coupleData);
            })
            .then(() => {
                alert('Account created successfully! Please login.');
                showLoginModal();
                document.getElementById('coupleId').value = newCoupleId;
                document.getElementById('couplePassword').value = newPassword;
            })
            .catch(error => {
                console.error('Create account error:', error);
                alert('Account creation failed. Please try again.');
            });
    }
    
    function initializeChat(coupleId, coupleData) {
        // Set partner name
        const members = Object.values(coupleData.members);
        partnerName.textContent = members.length > 1 ? 
            members.find(m => m.name !== localStorage.getItem('userName'))?.name || 'Partner' : 
            'Invite your partner';
        
        // Set up messages reference
        messagesRef = db.ref('/coupleMessages/' + coupleId);
        
        // Set up partner status reference if partner exists
        if (partnerId) {
            partnerStatusRef = db.ref('/status/' + partnerId);
            partnerStatusRef.on('value', updatePartnerStatus);
        }
        
        // Load existing messages
        messagesRef.limitToLast(100).on('child_added', addMessageToChat);
        
        // Auto-scroll to bottom
        scrollToBottom();
    }
    
    function updatePartnerStatus(snapshot) {
        const statusData = snapshot.val();
        if (!statusData) return;
        
        if (statusData.status === 'online') {
            partnerStatus.textContent = 'Online';
            partnerStatus.className = 'online';
        } else {
            partnerStatus.textContent = 'Last seen ' + formatTimestamp(statusData.lastSeen);
            partnerStatus.className = '';
        }
    }
    
    function addMessageToChat(snapshot) {
        const message = snapshot.val();
        const messageElement = createMessageElement(message);
        chatContainer.appendChild(messageElement);
        scrollToBottom();
    }
    
    function createMessageElement(message) {
        const isSent = message.senderId === currentUserId;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
        
        let messageContent = '';
        if (message.type === 'text') {
            messageContent = `<div class="message-text">${message.text}</div>`;
        } else if (message.type === 'file') {
            messageContent = `
                <div class="file-message">
                    ${message.fileType.startsWith('image/') ? 
                        `<img src="${message.url}" class="file-preview" alt="File preview">` : 
                        `<div class="file-icon">📄</div>`}
                    <div class="file-info">${message.fileName}</div>
                </div>
            `;
        }
        
        messageDiv.innerHTML = `
            ${messageContent}
            <div class="message-info">
                <span>${formatTimestamp(message.timestamp)}</span>
                ${isSent ? `<span class="message-status">${message.read ? '✓✓' : '✓'}</span>` : ''}
            </div>
        `;
        
        return messageDiv;
    }
    
    function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;
        
        const message = {
            text: text,
            senderId: currentUserId,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            type: 'text',
            read: false
        };
        
        messagesRef.push(message)
            .then(() => {
                messageInput.value = '';
                
                // Update read status when partner receives message
                if (partnerId) {
                    const messageId = messagesRef.push().key;
                    db.ref('/userMessages/' + partnerId + '/' + messageId).set(true);
                }
            })
            .catch(error => {
                console.error('Message send error:', error);
                alert('Failed to send message. Please try again.');
            });
    }
    
    function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const storagePath = `couple_files/${currentUserId}_${Date.now()}_${file.name}`;
        const uploadTask = storage.ref(storagePath).put(file);
        
        uploadTask.on('state_changed', 
            null, 
            error => {
                console.error('Upload error:', error);
                alert('File upload failed. Please try again.');
            }, 
            () => {
                uploadTask.snapshot.ref.getDownloadURL()
                    .then(url => {
                        const message = {
                            url: url,
                            fileName: file.name,
                            fileType: file.type,
                            fileSize: file.size,
                            senderId: currentUserId,
                            timestamp: firebase.database.ServerValue.TIMESTAMP,
                            type: 'file',
                            read: false
                        };
                        
                        return messagesRef.push(message);
                    })
                    .then(() => {
                        fileInput.value = '';
                    })
                    .catch(error => {
                        console.error('File message error:', error);
                        alert('Failed to send file. Please try again.');
                    });
            }
        );
    }
    
    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // Initialize presence for this user
    initializePresence();
});
