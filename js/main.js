document.addEventListener('DOMContentLoaded', () => {
  // Navigation
  const navButtons = document.querySelectorAll('.nav-btn');
  const sections = document.querySelectorAll('.section');
  
  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      const target = button.getAttribute('data-target');
      
      // Update active nav button
      navButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Show target section
      sections.forEach(section => {
        section.classList.remove('active');
        if (section.id === target) {
          section.classList.add('active');
        }
      });
    });
  });
  
  // Login functionality
  const loginBtn = document.getElementById('loginBtn');
  const generatePrivateId = document.getElementById('generatePrivateId');
  
  loginBtn.addEventListener('click', handleLogin);
  generatePrivateId.addEventListener('click', generatePrivateIdHandler);
});

let currentUser = null;

function handleLogin() {
  const userId = document.getElementById('userId').value.trim();
  const userName = document.getElementById('userName').value.trim();
  
  if (!userId || !userName) {
    alert('ID dan Nama harus diisi!');
    return;
  }
  
  currentUser = {
    id: userId,
    name: userName
  };
  
  // Set user online status
  database.ref(`onlineStatus/${userId}`).set(true);
  
  // Handle beforeunload to set offline status
  window.addEventListener('beforeunload', () => {
    database.ref(`onlineStatus/${userId}`).set(false);
  });
  
  // Hide login section
  document.getElementById('login-section').classList.remove('active');
  
  // Initialize all chat modules
  initCoupleChat(currentUser);
  initGroupChat(currentUser);
  initPrivateIdChat(currentUser);
  
  // Show couple chat by default
  document.getElementById('couple-chat').classList.add('active');
}

function generatePrivateIdHandler(e) {
  e.preventDefault();
  const privateId = generateRandomId(8);
  document.getElementById('userId').value = privateId;
  alert(`ID Privat Anda: ${privateId}\nSalin ID ini untuk digunakan nanti`);
}

function generateRandomId(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
