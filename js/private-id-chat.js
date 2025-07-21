document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const privateModal = document.getElementById('privateModal');
    const startChatButton = document.getElementById('startChatButton');
    const connectButton = document.getElementById('connectButton');
    const contactsSidebar = document.getElementById('contactsSidebar');
    const closeContactsSidebar = document.getElementById('closeContactsSidebar');
    const contactsList = document.getElementById('contactsList');
    const chatContainer = document.getElementById('chatContainer');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const attachmentButton = document.getElementById('attachmentButton');
    const fileInput = document.getElementById('fileInput');
    const contactName = document.getElementById('contactName');
    const contactStatus = document.getElementById('contactStatus');
    const yourPrivateId = document.getElementById('yourPrivateId');
    
    // Variables
    let currentUserId = localStorage.getItem('privateId') || generateId();
    let currentUserName = localStorage.getItem('privateUserName') || '';
    let currentContactId = '';
    let messagesRef = null;
    let contactStatusRef = null;
    let contactsRef = null;
    
    // Initialize private ID
    yourPrivateId.textContent = currentUserId;
    localStorage.setItem('privateId', currentUserId);
    
    // Check if we have a contact to show
    const savedContactId = localStorage.getItem('currentContactId');
    if (savedContactId) {
        currentContactId = savedContactId;
        startChatWithContact(savedContactId);
    } else {
        privateModal.classList.add('modal-active');
    }
    
    // Event listeners
    startChatButton.addEventListener('click', startChatting);
    connectButton.addEventListener('click', connectToId);
    closeContactsSidebar.addEventListener('click', toggleContactsSidebar);
    document.querySelector('.menu-button').addEventListener('click', toggleContactsSidebar);
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendMessage();
    });
    attachmentButton.addEventListener('click', function() {
        fileInput.click();
    });
    fileInput.addEventListener('change', handleFileUpload);
    
    // Set user name if provided
    const yourNameInput = document.getElementById('yourNamePrivate');
    if (currentUserName && yourNameInput) {
        yourNameInput.value = currentUserName;
    }
    
    // Functions
    function toggleContactsSidebar() {
        contactsSidebar.style.right = contactsSidebar.style.right === '0px' ? '-300px' : '0px';
    }
    
    function startChatting() {
        const userName = document.getElementById('yourNamePrivate').value;
        currentUserName = userName || `User-${currentUserId.substring(0, 4)}`;
        localStorage.setItem('privateUserName', currentUserName);
        
        // Set up contacts reference
        contactsRef = db.ref('/privateContacts/' + currentUserId);
        contactsRef.on('child_added', addContactToList);
        
        privateModal.classList.remove('modal-active');
    }
    
    function connectToId() {
        const contactId = document.getElementById('connectIdInput').value;
        
        if (!contactId) {
            alert('Please enter a Private ID');
            return;
        }
        
        if (contactId === currentUserId) {
            alert("You can't chat with yourself!");
            return;
        }
        
        // Check if contact exists
        db.ref('/privateContacts/' + contactId).once('value')
            .then(snapshot => {
                if (!snapshot.exists()) {
                    alert('Private ID not found');
                    return;
                }
                
                startChatWithContact(contactId);
                privateModal.classList.remove('modal-active');
            })
            .catch(error => {
                console.error('Connect error:', error);
                alert('Failed to connect. Please try again.');
            });
    }
    
    function startChatWithContact(contactId) {
        currentContactId = contactId;
        localStorage.setItem('currentContactId', contactId);
        
        // Generate a unique chat ID based on user IDs
        const chatId = [currentUserId, contactId].sort().join('_');
        messagesRef = db.ref('/privateMessages/' + chatId);
        
        // Set up contact status reference
        contactStatusRef = db.ref('/status/' + contactId);
        contactStatusRef.on('value', updateContactStatus);
        
        // Set up contact info
        db.ref('/privateContacts/' + contactId).once('value')
            .then(snapshot => {
                const contactData = snapshot.val();
                contactName.textContent = contactData.name || `User-${contactId.substring(0, 4)}`;
            });
        
        // Add this contact to both users' contact lists
        if (currentUserName) {
            db.ref('/privateContacts/' + currentUserId + '/' + contactId).set({
                id: contactId,
                name: contactName.textContent,
                lastContact: firebase.database.ServerValue.TIMESTAMP
            });
            
            db.ref('/privateContacts/' + contactId + '/' + currentUserId).set({
                id: currentUserId,
                name: currentUserName,
                lastContact: firebase.database.ServerValue.TIMESTAMP
            });
        }
        
        // Load existing messages
        messagesRef.limitToLast(100).on('child_added', addMessageToChat);
        
        // Auto-scroll to bottom
        scrollToBottom();
    }
    
    function updateContactStatus(snapshot) {
        const statusData = snapshot.val();
        if (!statusData) return;
        
        if (statusData.status === 'online') {
            contactStatus.textContent = 'Online';
            contactStatus.className = 'online';
        } else {
            contactStatus.textContent = 'Last seen ' + formatTimestamp(statusData.lastSeen);
            contactStatus.className = '';
        }
    }
    
    function addContactToList(snapshot) {
        const contactData = snapshot.val();
        const contactId = snapshot.key;
        
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${contactData.name || `User-${contactId.substring(0, 4)}`}</span>
            <span class="contact-status">${formatTimestamp(contactData.lastContact)}</span>
        `;
        
        li.addEventListener('click', () => {
            startChatWithContact(contactId);
            toggleContactsSidebar();
        });
        
        contactsList.appendChild(li);
    }
    
    function addMessageToChat(snapshot) {
        const message = snapshot.val();
        const messageElement = createMessageElement(message);
        chatContainer.appendChild(messageElement);
        scrollToBottom();
        
        // Update message as read
        if (message.senderId === currentContactId && !message.read) {
            snapshot.ref.update({ read: true });
        }
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
            senderName: currentUserName,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            type: 'text',
            read: false
        };
        
        messagesRef.push(message)
            .then(() => {
                messageInput.value = '';
            })
            .catch(error => {
                console.error('Message send error:', error);
                alert('Failed to send message. Please try again.');
            });
    }
    
    function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const storagePath = `private_files/${currentUserId}_${currentContactId}_${Date.now()}_${file.name}`;
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
                            senderName: currentUserName,
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
