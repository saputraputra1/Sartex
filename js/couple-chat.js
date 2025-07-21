function initCoupleChat(user) {
  const coupleChatSection = document.getElementById('couple-chat');
  coupleChatSection.innerHTML = `
    <div class="chat-container">
      <div class="chat-header">
        <input type="text" id="partnerIdInput" placeholder="Masukkan ID Partner" class="partner-input">
        <button id="connectPartnerBtn">Hubungkan</button>
        <div class="user-status">
          <span id="partnerStatus">Offline</span>
          <span class="status-dot offline" id="partnerStatusDot"></span>
        </div>
      </div>
      <div class="messages-container" id="coupleMessages"></div>
      <div class="input-area">
        <button class="attach-btn" id="coupleAttachBtn">📎</button>
        <input type="text" class="message-input" id="coupleMessageInput" placeholder="Ketik pesan...">
        <button class="send-btn" id="coupleSendBtn">➤</button>
        <input type="file" id="coupleFileInput" accept="image/*, .pdf, .doc, .docx" style="display: none;">
      </div>
    </div>
  `;

  let currentPartnerId = null;
  const messagesRef = database.ref('coupleMessages');
  const typingRef = database.ref('typingStatus');
  const onlineRef = database.ref('onlineStatus');

  // Fungsi untuk menampilkan pesan
  const displayMessage = (message, isSent) => {
    const messagesContainer = document.getElementById('coupleMessages');
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
        <span>${isSent ? 'Anda' : message.senderName}</span>
        <span>${formatTime(message.timestamp)}</span>
        ${isSent ? `<span class="read-status">${message.read ? '✓✓' : '✓'}</span>` : ''}
      </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  };

  // Format waktu
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Hubungkan dengan partner
  document.getElementById('connectPartnerBtn').addEventListener('click', () => {
    const partnerId = document.getElementById('partnerIdInput').value.trim();
    if (!partnerId) return;

    currentPartnerId = partnerId;
    setupChatWithPartner(partnerId);
  });

  // Setup chat dengan partner
  const setupChatWithPartner = (partnerId) => {
    // Clear existing messages
    document.getElementById('coupleMessages').innerHTML = '';
    
    // Setup listener untuk pesan
    messagesRef
      .orderByChild('conversationId')
      .equalTo(getConversationId(user.id, partnerId))
      .on('child_added', snapshot => {
        const message = snapshot.val();
        displayMessage(message, message.senderId === user.id);
        
        // Tandai sebagai dibaca jika pesan ditujukan ke kita
        if (message.senderId === partnerId && !message.read) {
          snapshot.ref.update({ read: true });
        }
      });

    // Setup status online
    onlineRef.child(partnerId).on('value', snapshot => {
      const isOnline = snapshot.val();
      document.getElementById('partnerStatus').textContent = isOnline ? 'Online' : 'Offline';
      document.getElementById('partnerStatusDot').className = `status-dot ${isOnline ? '' : 'offline'}`;
    });

    // Setup status typing
    typingRef.child(partnerId).on('value', snapshot => {
      const typingStatus = document.createElement('div');
      typingStatus.className = 'message-typing';
      typingStatus.textContent = `${partnerId} sedang mengetik...`;
      
      const messagesContainer = document.getElementById('coupleMessages');
      const existingTyping = messagesContainer.querySelector('.message-typing');
      
      if (snapshot.val()) {
        if (!existingTyping) {
          messagesContainer.appendChild(typingStatus);
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      } else if (existingTyping) {
        existingTyping.remove();
      }
    });
  };

  // Kirim pesan
  document.getElementById('coupleSendBtn').addEventListener('click', sendMessage);
  document.getElementById('coupleMessageInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') sendMessage();
  });

  // Deteksi typing
  document.getElementById('coupleMessageInput').addEventListener('input', () => {
    typingRef.child(user.id).set(true);
    setTimeout(() => typingRef.child(user.id).set(false), 2000);
  });

  // Fungsi kirim pesan
  function sendMessage() {
    const input = document.getElementById('coupleMessageInput');
    const text = input.value.trim();
    const file = document.getElementById('coupleFileInput').files[0];
    
    if (!text && !file) return;
    if (!currentPartnerId) {
      alert('Hubungkan dengan partner terlebih dahulu');
      return;
    }

    const message = {
      text: text || '',
      senderId: user.id,
      senderName: user.name,
      receiverId: currentPartnerId,
      conversationId: getConversationId(user.id, currentPartnerId),
      timestamp: Date.now(),
      read: false
    };

    if (file) {
      uploadFile(file).then(fileData => {
        Object.assign(message, fileData);
        sendMessageToFirebase(message);
      });
    } else {
      sendMessageToFirebase(message);
    }

    input.value = '';
    document.getElementById('coupleFileInput').value = '';
  }

  // Upload file
  const uploadFile = (file) => {
    const storageRef = storage.ref(`couple_files/${user.id}/${Date.now()}_${file.name}`);
    return storageRef.put(file).then(snapshot => {
      return snapshot.ref.getDownloadURL().then(url => ({
        fileUrl: url,
        fileName: file.name,
        fileType: file.type
      }));
    });
  };

  // Kirim ke Firebase
  const sendMessageToFirebase = (message) => {
    messagesRef.push(message);
  };

  // Generate conversation ID
  const getConversationId = (id1, id2) => {
    return [id1, id2].sort().join('_');
  };

  // Set status online
  onlineRef.child(user.id).set(true);
  window.addEventListener('beforeunload', () => {
    onlineRef.child(user.id).set(false);
  });

  // Handle file upload
  document.getElementById('coupleAttachBtn').addEventListener('click', () => {
    document.getElementById('coupleFileInput').click();
  });
}
