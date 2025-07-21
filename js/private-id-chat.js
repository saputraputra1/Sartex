function initPrivateIdChat(user) {
  const privateChatSection = document.getElementById('private-chat');
  privateChatSection.innerHTML = `
    <div class="private-id-container">
      <h2>ID Privat Anda</h2>
      <p>Bagikan ID ini ke teman Anda untuk memulai chat tanpa password</p>
      
      <div class="private-id-display" id="privateIdDisplay">${user.id}</div>
      
      <button class="copy-id-btn" id="copyIdBtn">Salin ID</button>
      
      <div class="private-id-form">
        <h3>Atau mulai chat dengan ID lain</h3>
        <div class="form-group">
          <input type="text" id="targetPrivateId" placeholder="Masukkan ID Privat">
          <button id="startPrivateChatBtn">Mulai Chat</button>
        </div>
      </div>
    </div>
    
    <div class="modal" id="privateChatModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="privateChatTitle">Chat Privat</h3>
          <span class="close-btn">&times;</span>
        </div>
        <div class="modal-body">
          <div class="messages-container" id="privateMessages"></div>
          <div class="input-area">
            <button class="attach-btn" id="privateAttachBtn">📎</button>
            <input type="text" class="message-input" id="privateMessageInput" placeholder="Ketik pesan...">
            <button class="send-btn" id="privateSendBtn">➤</button>
            <input type="file" id="privateFileInput" style="display: none;">
          </div>
        </div>
      </div>
    </div>
  `;

  const messagesRef = privateDatabase.ref('privateMessages');
  let currentChatId = null;

  // Salin ID
  document.getElementById('copyIdBtn').addEventListener('click', () => {
    const privateId = document.getElementById('privateIdDisplay').textContent;
    navigator.clipboard.writeText(privateId).then(() => {
      alert('ID berhasil disalin!');
    });
  });

  // Mulai chat privat
  document.getElementById('startPrivateChatBtn').addEventListener('click', () => {
    const targetId = document.getElementById('targetPrivateId').value.trim();
    if (!targetId) {
      alert('Masukkan ID Privat yang valid');
      return;
    }
    
    openPrivateChat(targetId);
  });

  // Buka chat privat
  const openPrivateChat = (targetId) => {
    const modal = document.getElementById('privateChatModal');
    modal.style.display = 'block';
    document.getElementById('privateChatTitle').textContent = `Chat dengan ${targetId}`;
    
    currentChatId = targetId;
    
    // Clear messages
    document.getElementById('privateMessages').innerHTML = '';
    
    // Setup listener pesan
    messagesRef
      .orderByChild('conversationId')
      .equalTo(getConversationId(user.id, targetId))
      .on('child_added', snapshot => {
        const message = snapshot.val();
        displayPrivateMessage(message, message.senderId === user.id);
      });
    
    // Kirim pesan
    document.getElementById('privateSendBtn').addEventListener('click', sendPrivateMessage);
    document.getElementById('privateMessageInput').addEventListener('keypress', e => {
      if (e.key === 'Enter') sendPrivateMessage();
    });
    
    // Upload file
    document.getElementById('privateAttachBtn').addEventListener('click', () => {
      document.getElementById('privateFileInput').click();
    });
    
    document.getElementById('privateFileInput').addEventListener('change', () => {
      const file = document.getElementById('privateFileInput').files[0];
      if (file) {
        uploadPrivateFile(file);
      }
    });
  };

  // Tampilkan pesan privat
  const displayPrivateMessage = (message, isSent) => {
    const messagesContainer = document.getElementById('privateMessages');
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
      ${content}
      <div class="message-info">
        <span>${formatTime(message.timestamp)}</span>
      </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  };

  // Kirim pesan privat
  const sendPrivateMessage = () => {
    const input = document.getElementById('privateMessageInput');
    const text = input.value.trim();
    const file = document.getElementById('privateFileInput').files[0];
    
    if (!text && !file) return;
    if (!currentChatId) return;

    const message = {
      text: text || '',
      senderId: user.id,
      receiverId: currentChatId,
      conversationId: getConversationId(user.id, currentChatId),
      timestamp: Date.now()
    };

    if (file) {
      uploadPrivateFile(file).then(fileData => {
        Object.assign(message, fileData);
        messagesRef.push(message);
      });
    } else {
      messagesRef.push(message);
    }

    input.value = '';
    document.getElementById('privateFileInput').value = '';
  };

  // Upload file privat
  const uploadPrivateFile = (file) => {
    const storageRef = privateStorage.ref(`private_files/${user.id}/${Date.now()}_${file.name}`);
    return storageRef.put(file).then(snapshot => {
      return snapshot.ref.getDownloadURL().then(url => ({
        fileUrl: url,
        fileName: file.name,
        fileType: file.type
      }));
    });
  };

  // Generate conversation ID
  const getConversationId = (id1, id2) => {
    return [id1, id2].sort().join('_');
  };

  // Format waktu
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Tutup modal
  document.querySelector('#privateChatModal .close-btn').addEventListener('click', () => {
    document.getElementById('privateChatModal').style.display = 'none';
    currentChatId = null;
  });
}
