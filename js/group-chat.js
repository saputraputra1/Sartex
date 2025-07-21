document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const groupModal = document.getElementById('groupModal');
    const joinGroupSection = document.getElementById('joinGroupSection');
    const createGroupSection = document.getElementById('createGroupSection');
    const joinGroupButton = document.getElementById('joinGroupButton');
    const createGroupLink = document.getElementById('createGroupLink');
    const createGroupButton = document.getElementById('createGroupButton');
    const joinGroupLink = document.getElementById('joinGroupLink');
    const inviteModal = document.getElementById('inviteModal');
    const sendInviteButton = document.getElementById('sendInviteButton');
    const cancelInviteButton = document.getElementById('cancelInviteButton');
    const groupSidebar = document.getElementById('groupSidebar');
    const groupMenuButton = document.getElementById('groupMenuButton');
    const closeSidebar = document.getElementById('closeSidebar');
    const membersList = document.getElementById('membersList');
    const inviteMemberButton = document.getElementById('inviteMemberButton');
    const leaveGroupButton = document.getElementById('leaveGroupButton');
    const deleteGroupButton = document.getElementById('deleteGroupButton');
    const chatContainer = document.getElementById('chatContainer');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const attachmentButton = document.getElementById('attachmentButton');
    const fileInput = document.getElementById('fileInput');
    const groupName = document.getElementById('groupName');
    const groupMembers = document.getElementById('groupMembers');
    
    // Variables
    let currentUserId = localStorage.getItem('uid') || generateId();
    let currentGroupId = '';
    let currentUserName = '';
    let isAdmin = false;
    let messagesRef = null;
    let groupRef = null;
    let membersRef = null;
    
    // Check if user is already in a group
    const savedGroupId = localStorage.getItem('groupId');
    const savedUserName = localStorage.getItem('userName');
    
    if (savedGroupId && savedUserName) {
        currentUserName = savedUserName;
        joinGroup(savedGroupId, currentUserName);
    } else {
        showGroupModal();
    }
    
    // Event listeners
    joinGroupButton.addEventListener('click', handleJoinGroup);
    createGroupLink.addEventListener('click', showCreateGroupSection);
    createGroupButton.addEventListener('click', handleCreateGroup);
    joinGroupLink.addEventListener('click', showJoinGroupSection);
    groupMenuButton.addEventListener('click', toggleSidebar);
    closeSidebar.addEventListener('click', toggleSidebar);
    inviteMemberButton.addEventListener('click', showInviteModal);
    sendInviteButton.addEventListener('click', sendInvite);
    cancelInviteButton.addEventListener('click', hideInviteModal);
    leaveGroupButton.addEventListener('click', leaveGroup);
    deleteGroupButton.addEventListener('click', deleteGroup);
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendMessage();
    });
    attachmentButton.addEventListener('click', function() {
        fileInput.click();
    });
    fileInput.addEventListener('change', handleFileUpload);
    
    // Functions
    function showGroupModal() {
        groupModal.classList.add('modal-active');
    }
    
    function hideGroupModal() {
        groupModal.classList.remove('modal-active');
    }
    
    function showJoinGroupSection() {
        joinGroupSection.style.display = 'block';
        createGroupSection.style.display = 'none';
    }
    
    function showCreateGroupSection() {
        joinGroupSection.style.display = 'none';
        createGroupSection.style.display = 'block';
    }
    
    function showInviteModal() {
        inviteModal.classList.add('modal-active');
    }
    
    function hideInviteModal() {
        inviteModal.classList.remove('modal-active');
    }
    
    function toggleSidebar() {
        groupSidebar.style.right = groupSidebar.style.right === '0px' ? '-300px' : '0px';
    }
    
    function handleJoinGroup() {
        const groupId = document.getElementById('groupIdInput').value;
        const userName = document.getElementById('yourNameGroup').value;
        
        if (!groupId) {
            alert('Please enter a Group ID');
            return;
        }
        
        if (!userName) {
            alert('Please enter your name');
            return;
        }
        
        joinGroup(groupId, userName);
    }
    
    function joinGroup(groupId, userName) {
        currentUserName = userName;
        localStorage.setItem('userName', userName);
        
        groupRef = db.ref('/groups/' + groupId);
        
        groupRef.once('value')
            .then(snapshot => {
                if (!snapshot.exists()) {
                    alert('Group not found');
                    return;
                }
                
                currentGroupId = groupId;
                localStorage.setItem('groupId', groupId);
                
                // Add user to group members if not already there
                const membersRef = db.ref('/groupMembers/' + groupId + '/' + currentUserId);
                membersRef.set({
                    name: userName,
                    joined: firebase.database.ServerValue.TIMESTAMP,
                    lastSeen: firebase.database.ServerValue.TIMESTAMP
                });
                
                // Initialize group chat
                initializeGroupChat(groupId, snapshot.val());
                hideGroupModal();
            })
            .catch(error => {
                console.error('Join group error:', error);
                alert('Failed to join group. Please try again.');
            });
    }
    
    function handleCreateGroup() {
        const groupNameInput = document.getElementById('newGroupName').value;
        const userName = document.getElementById('yourNameCreate').value;
        
        if (!groupNameInput) {
            alert('Please enter a group name');
            return;
        }
        
        if (!userName) {
            alert('Please enter your name');
            return;
        }
        
        createGroup(groupNameInput, userName);
    }
    
    function createGroup(groupNameInput, userName) {
        currentUserName = userName;
        localStorage.setItem('userName', userName);
        
        const newGroupId = generateId();
        const groupData = {
            id: newGroupId,
            name: groupNameInput,
            created: firebase.database.ServerValue.TIMESTAMP,
            createdBy: currentUserId,
            admin: currentUserId
        };
        
        db.ref('/groups/' + newGroupId).set(groupData)
            .then(() => {
                // Add creator as first member
                const membersRef = db.ref('/groupMembers/' + newGroupId + '/' + currentUserId);
                return membersRef.set({
                    name: userName,
                    joined: firebase.database.ServerValue.TIMESTAMP,
                    isAdmin: true
                });
            })
            .then(() => {
                currentGroupId = newGroupId;
                localStorage.setItem('groupId', newGroupId);
                isAdmin = true;
                
                // Initialize group chat
                initializeGroupChat(newGroupId, groupData);
                hideGroupModal();
            })
            .catch(error => {
                console.error('Create group error:', error);
                alert('Failed to create group. Please try again.');
            });
    }
    
    function initializeGroupChat(groupId, groupData) {
        // Set group info
        groupName.textContent = groupData.name;
        
        // Set up references
        messagesRef = db.ref('/groupMessages/' + groupId);
        membersRef = db.ref('/groupMembers/' + groupId);
        
        // Load existing messages
        messagesRef.limitToLast(100).on('child_added', addMessageToChat);
        
        // Load members and set up listeners
        updateMembersList();
        membersRef.on('child_added', updateMembersList);
        membersRef.on('child_removed', updateMembersList);
        
        // Check if user is admin
        membersRef.child(currentUserId).once('value')
            .then(snapshot => {
                const memberData = snapshot.val();
                isAdmin = memberData && memberData.isAdmin;
                
                if (isAdmin) {
                    document.querySelectorAll('.admin-only').forEach(el => {
                        el.style.display = 'block';
                    });
                }
            });
        
        // Auto-scroll to bottom
        scrollToBottom();
    }
    
    function updateMembersList() {
        membersRef.once('value')
            .then(snapshot => {
                const members = snapshot.val() || {};
                const memberCount = Object.keys(members).length;
                
                groupMembers.textContent = `${memberCount} member${memberCount !== 1 ? 's' : ''}`;
                
                // Update members list in sidebar
                membersList.innerHTML = '';
                
                Object.entries(members).forEach(([userId, memberData]) => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <span>${memberData.name} ${userId === currentUserId ? '(You)' : ''}</span>
                        <span class="member-status ${memberData.status === 'online' ? 'online' : ''}">
                            ${memberData.status === 'online' ? 'Online' : 
                              `Last seen ${formatTimestamp(memberData.lastSeen)}`}
                            ${memberData.isAdmin ? ' (Admin)' : ''}
                        </span>
                    `;
                    membersList.appendChild(li);
                });
            });
    }
    
    function sendInvite() {
        const memberId = document.getElementById('memberIdInput').value;
        
        if (!memberId) {
            alert('Please enter a user ID');
            return;
        }
        
        // In a real app, you would send this invite to the user's inbox
        alert(`Invite sent to user ${memberId}. In a real app, this would notify the user.`);
        hideInviteModal();
    }
    
    function leaveGroup() {
        if (!confirm('Are you sure you want to leave this group?')) return;
        
        membersRef.child(currentUserId).remove()
            .then(() => {
                // If user was admin and last admin, delete group
                if (isAdmin) {
                    return membersRef.once('value')
                        .then(snapshot => {
                            const members = snapshot.val() || {};
                            const hasOtherAdmin = Object.values(members).some(m => m.isAdmin);
                            
                            if (!hasOtherAdmin) {
                                return db.ref('/groups/' + currentGroupId).remove();
                            }
                        });
                }
            })
            .then(() => {
                localStorage.removeItem('groupId');
                window.location.reload();
            })
            .catch(error => {
                console.error('Leave group error:', error);
                alert('Failed to leave group. Please try again.');
            });
    }
    
    function deleteGroup() {
        if (!confirm('Are you sure you want to delete this group? This cannot be undone.')) return;
        
        // Delete group and all its data
        Promise.all([
            db.ref('/groups/' + currentGroupId).remove(),
            db.ref('/groupMembers/' + currentGroupId).remove(),
            db.ref('/groupMessages/' + currentGroupId).remove()
        ])
        .then(() => {
            localStorage.removeItem('groupId');
            window.location.reload();
        })
        .catch(error => {
            console.error('Delete group error:', error);
            alert('Failed to delete group. Please try again.');
        });
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
        } else if (message.type === 'system') {
            messageDiv.className = 'message system';
            messageContent = `<div class="system-message">${message.text}</div>`;
        }
        
        if (message.type !== 'system') {
            messageDiv.innerHTML = `
                <div class="sender-name">${message.senderName || 'Unknown'}</div>
                ${messageContent}
                <div class="message-info">
                    <span>${formatTimestamp(message.timestamp)}</span>
                </div>
            `;
        } else {
            messageDiv.innerHTML = messageContent;
        }
        
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
            type: 'text'
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
        
        const storagePath = `group_files/${currentGroupId}_${currentUserId}_${Date.now()}_${file.name}`;
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
                            type: 'file'
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
    
    // Update user's last seen when leaving
    window.addEventListener('beforeunload', function() {
        if (currentGroupId && currentUserId) {
            membersRef.child(currentUserId).update({
                lastSeen: firebase.database.ServerValue.TIMESTAMP,
                status: 'offline'
            });
        }
    });
});
