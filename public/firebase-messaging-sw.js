importScripts("https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js");

// ⛳️ paste real config here (no env in /public)
firebase.initializeApp({
  apiKey: "AIzaSyCfGEw2KF5bqFR1EiP6FrmIeO6uxEJN_tg",
  authDomain: "datingapp-227af.firebaseapp.com",
  projectId: "datingapp-227af",
  storageBucket: "datingapp-227af.firebasestorage.app",
  messagingSenderId: "1093876550949",
  appId: "1:1093876550949:web:c545d0f70a3c9812565ecc",
});
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title = "Update", body = "", image } = payload?.notification || {};
  self.registration.showNotification(title, { body, icon: image || "/icon-192.png" });
});
