// Konfigurasi Firebase utama
const firebaseConfig = {
  apiKey: "AIzaSyAQVIvZvxmYdcriHR8j0ormGzNRjGD0_no",
           authDomain: "online--suit.firebaseapp.com",
          databaseURL: "https://online--suit-default-rtdb.firebaseio.com",
          projectId: "online--suit",
          storageBucket: "online--suit.firebasestorage.app",
           messagingSenderId: "463840835705",
          appId: "1:463840835705:web:f490fd49851c0afb8dfca8"
};

// Inisialisasi Firebase
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const storage = firebase.storage();

// Instance kedua untuk private chat
const privateAppConfig = JSON.parse(JSON.stringify(firebaseConfig));
privateAppConfig.databaseURL += "-private";
const privateApp = firebase.initializeApp(privateAppConfig, "PrivateApp");
const privateDatabase = firebase.database(privateApp);
const privateStorage = firebase.storage(privateApp);

// Fungsi utilitas
const generateId = () => database.ref().push().key.slice(0, 8);
