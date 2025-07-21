function initGroupChat(user) {
  const groupChatSection = document.getElementById('group-chat');
  groupChatSection.innerHTML = `
    <div class="chat-container">
      <div class="chat-header">
        <h3>Grup Saya</h3>
      </div>
      <div class="group-list" id="groupList"></div>
      <button class="create-group-btn" id="createGroupBtn">+</button>
    </div>
    
    <div class="modal" id="groupModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="groupModalTitle">Grup Baru</h3>
          <span class="close-btn">&times;</span>
        </div>
        <div class="modal-body" id="groupModalBody"></div>
      </div>
    </div>
  `;

  const groupsRef = database.ref('groups');
  const groupMessagesRef = database.ref('groupMessages');
  const userGroupsRef = database.ref(`userGroups/${user.id}`);

  // Tampilkan daftar grup
  const displayGroups = () => {
    userGroupsRef.on('value', snapshot => {
      const groupList = document.getElementById('groupList');
      groupList.innerHTML = '';
      
      const userGroups = snapshot.val() || {};
      
      Object.keys(userGroups).forEach(groupId => {
        groupsRef.child(groupId).once('value', groupSnapshot => {
          const group = groupSnapshot.val();
          if (!group) return;
          
          const groupItem = document.createElement('div');
          groupItem.className = 'group-item';
          groupItem.innerHTML = `
            <div class="group-avatar">${group.name.charAt(0)}</div>
            <div class="group-info">
              <div class="group-name">${group.name}</div>
              <div class="group-members">${Object.keys(group.members).length} anggota</div>
              ${group.lastMessage ? `<div class="group-last-message">${group.lastMessage.text.substring(0, 30)}...</div>` : ''}
            </div>
          `;
          
          groupItem.addEventListener('click', () => openGroupChat(groupId, group.name));
          groupList.appendChild(groupItem);
        });
      });
    });
  };

  // Buka chat grup
  const openGroupChat = (groupId, groupName) => {
    const modal = document.getElementById('groupModal');
    modal.style.display = 'block';
    document.getElementById('groupModalTitle').textContent = groupName;
    
    document.getElementById('groupModalBody').innerHTML = `
      <div class="group-members-list">
        <h4>Anggota Grup</h4>
        <div id="membersList"></div>
      </div>
      <div class="messages-container" id="groupMessages"></div>
      <div class="input-area">
        <button class="attach-btn" id="groupAttachBtn">📎</button>
        <input type="text" class="message-input" id="groupMessageInput" placeholder="Ketik pesan...">
        <button class="send-btn" id="groupSendBtn">➤</button>
        <input type="file" id="groupFileInput" style="display: none;">
      </div>
    `;
    
    // Tampilkan anggota grup
    groupsRef.child(`${groupId}/members`).on('value', snapshot => {
      const members = snapshot.val() || {};
      const membersList = document.getElementById('membersList');
      membersList.innerHTML = '';
      
      Object.keys(members).forEach(memberId => {
        const memberItem = document.createElement('div');
        memberItem.className = 'member-item';
        memberItem.textContent = members[memberId].name || memberId;
        membersList.appendChild(memberItem);
      });
    });
    
    // Tampilkan pesan grup
    groupMessagesRef
      .orderByChild('groupId')
      .equalTo(groupId)
      .on('child_added', snapshot => {
        const message = snapshot.val();
        displayGroupMessage(message, message.senderId === user.id);
      });
    
    // Kirim pesan
    document.getElementById('groupSendBtn').addEventListener('click', () => sendGroupMessage(groupId));
    document.getElementById('groupMessageInput').addEventListener('keypress', e => {
      if (e.key === 'Enter') sendGroupMessage(groupId);
    });
    
    // Upload file
    document.getElementById('groupAttachBtn').addEventListener('click', () => {
      document.getElementById('groupFileInput').click();
    });
    
    document.getElementById('groupFileInput').addEventListener('change', () => {
      const file = document.getElementById('groupFileInput').files[0];
      if (file) {
        uploadGroupFile(file, groupId);
      }
    });
  };

  // Tampilkan pesan grup
  const displayGroupMessage = (message, isSent) => {
    const messagesContainer = document.getElementById('groupMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
    
    let content = message.text ? `<div>${message.text}</div>` : '';
    if (message.fileUrl) {
      if (message.fileType.startsWith('image/')) {
        content += `<div class="file-message">
          <img src="${message.fileUrl}" class="file-preview" alt="Gambar">
        </div>`;
      } else {
        content += `<a href="${message.fileUrl}" target="_blank" class="file-message">
          <span class="file-icon">📄</span> ${message.fileName}
        </a>`;
      }
    }

    messageDiv.innerHTML = `
      ${!isSent ? `<div class="sender-name">${message.senderName}</div>` : ''}
      ${content}
      <div class="message-info">
        <span>${formatTime(message.timestamp)}</span>
      </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  };

  // Kirim pesan grup
  const sendGroupMessage = (groupId) => {
    const input = document.getElementById('groupMessageInput');
    const text = input.value.trim();
    if (!text) return;

    const message = {
      text: text,
      senderId: user.id,
      senderName: user.name,
      groupId: groupId,
      timestamp: Date.now()
    };

    groupMessagesRef.push(message).then(() => {
      // Update last message in group
      groupsRef.child(`${groupId}/lastMessage`).set({
        text: text,
        sender: user.name,
        timestamp: Date.now()
      });
      
      input.value = '';
    });
  };

  // Upload file grup
  const uploadGroupFile = (file, groupId) => {
    const storageRef = storage.ref(`group_files/${groupId}/${Date.now()}_${file.name}`);
    storageRef.put(file).then(snapshot => {
      return snapshot.ref.getDownloadURL().then(url => {
        const message = {
          senderId: user.id,
          senderName: user.name,
          groupId: groupId,
          timestamp: Date.now(),
          fileUrl: url,
          fileName: file.name,
          fileType: file.type
        };
        
        groupMessagesRef.push(message);
        
        // Update last message in group
        groupsRef.child(`${groupId}/lastMessage`).set({
          text: `[File] ${file.name}`,
          sender: user.name,
          timestamp: Date.now()
        });
        
        document.getElementById('groupFileInput').value = '';
      });
    });
  };

  // Buat grup baru
  document.getElementById('createGroupBtn').addEventListener('click', () => {
    const modal = document.getElementById('groupModal');
    modal.style.display = 'block';
    document.getElementById('groupModalTitle').textContent = 'Buat Grup Baru';
    
    document.getElementById('groupModalBody').innerHTML = `
      <div class="form-group">
        <input type="text" id="newGroupName" placeholder="Nama Grup" required>
        <input type="text" id="newGroupMembers" placeholder="ID Anggota (pisahkan dengan koma)">
        <button id="createGroupSubmitBtn">Buat Grup</button>
      </div>
    `;
    
    document.getElementById('createGroupSubmitBtn').addEventListener('click', () => {
      const groupName = document.getElementById('newGroupName').value.trim();
      const membersInput = document.getElementById('newGroupMembers').value.trim();
      
      if (!groupName) {
        alert('Nama grup harus diisi!');
        return;
      }
      
      const members = membersInput.split(',').map(id => id.trim()).filter(id => id);
      const groupId = groupsRef.push().key;
      
      // Buat struktur grup
      const groupData = {
        name: groupName,
        createdBy: user.id,
        createdAt: Date.now(),
        members: {
          [user.id]: { name: user.name, joinedAt: Date.now() }
        }
      };
      
      // Tambahkan anggota
      members.forEach(memberId => {
        if (memberId !== user.id) {
          groupData.members[memberId] = { joinedAt: Date.now() };
        }
      });
      
      // Simpan grup
      groupsRef.child(groupId).set(groupData).then(() => {
        // Tambahkan grup ke daftar grup pengguna
        const updates = {};
        updates[`userGroups/${user.id}/${groupId}`] = true;
        
        members.forEach(memberId => {
          updates[`userGroups/${memberId}/${groupId}`] = true;
        });
        
        database.ref().update(updates).then(() => {
          modal.style.display = 'none';
          displayGroups();
        });
      });
    });
  });

  // Tutup modal
  document.querySelector('#groupModal .close-btn').addEventListener('click', () => {
    document.getElementById('groupModal').style.display = 'none';
  });

  // Format waktu
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Inisialisasi
  displayGroups();
}
