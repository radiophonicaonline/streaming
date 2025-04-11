// Importa Firebase scripts para el service worker
importScripts("https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js");

// Tu configuración de Firebase
firebase.initializeApp({
  apiKey: "AIzaSyAC-9LQSlelDVx27wd2DPxisi4M-lRwtrk",
  authDomain: "contador-de-personas-5f8aa.firebaseapp.com",
  projectId: "contador-de-personas-5f8aa",
  storageBucket: "contador-de-personas-5f8aa.appspot.com",
  messagingSenderId: "1063230344919",
  appId: "1:1063230344919:web:ed86a937ba176dddb1aa92"
});

const messaging = firebase.messaging();

// Muestra notificación personalizada cuando llegue un mensaje push
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Recibido en background: ', payload);

  const notificationTitle = payload.notification.title || "📻 Radiophonica Online";
  const notificationOptions = {
    body: payload.notification.body || "¡Estamos en vivo!",
    icon: "https://radiophonicaonline.github.io/streaming/logo.png"
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
