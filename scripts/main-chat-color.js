import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  onDisconnect,
  remove,
  get
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import {
  getMessaging,
  getToken,
  onMessage
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyAC-9LQSlelDVx27wd2DPxisi4M-lRwtrk",
  authDomain: "contador-de-personas-5f8aa.firebaseapp.com",
  databaseURL: "https://contador-de-personas-5f8aa-default-rtdb.firebaseio.com",
  projectId: "contador-de-personas-5f8aa",
  storageBucket: "contador-de-personas-5f8aa.appspot.com",
  messagingSenderId: "1063230344919",
  appId: "1:1063230344919:web:ed86a937ba176dddb1aa92"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// --- 🔔 NOTIFICACIONES ---
const messaging = getMessaging(app);
document.getElementById("btnNotificaciones").addEventListener("click", async () => {
  try {
    const permiso = await Notification.requestPermission();
    if (permiso === "granted") {
      const token = await getToken(messaging, {
        vapidKey: "BLwt9ZJryiJhcwabvu8ZWsG7JZ-2BKk-5jtbOVNj0yy173t6F5wQTBAReshsjhvea5gCJq0ViU06okHHdftzJK0"
      });
      if (token) {
        const tokenKey = token.replace(/\W/g, "_");
        await set(ref(db, "tokens/" + tokenKey), true);
        alert("✅ Te avisaremos cuando estemos en vivo.");
      }
    } else {
      alert("❌ No activaste las notificaciones.");
    }
  } catch (err) {
    console.error("Error al registrar notificaciones:", err);
  }
});

// Escuchar en primer plano
onMessage(messaging, (payload) => {
  new Notification(payload.notification.title, {
    body: payload.notification.body,
    icon: payload.notification.icon
  });
});

// --- CONTADOR DE VISITAS ---
const hoy = new Date().toISOString().split("T")[0];
const visitasRef = ref(db, "visitas/" + hoy);
push(visitasRef, true);

// --- CONTADOR DE PERSONAS ---
const conexionesRef = ref(db, "conexiones");
const miConexion = push(conexionesRef);
set(miConexion, true);
sessionStorage.setItem("conexionId", miConexion.key);

// Ubicación
fetch("https://ipapi.co/json/")
  .then(res => res.json())
  .then(data => {
    const ubicacion = {
      lat: data.latitude,
      lon: data.longitude,
      city: data.city,
      region: data.region,
      country: data.country_name
    };
    set(ref(db, `conexiones/${miConexion.key}/ubicacion`), ubicacion);
    const regionRef = ref(db, `conexiones_diarias/${hoy}/${ubicacion.region}`);
    get(regionRef).then(snap => {
      const actual = snap.val() || 0;
      set(regionRef, actual + 1);
    });
  })
  .catch(err => console.error("Error ubicación:", err));

onDisconnect(miConexion).remove();
onValue(conexionesRef, (snap) => {
  document.getElementById("contador").innerText =
    `👀 Hay ${snap.size} Radiovidente(s) viendo esta página.`;
});

// --- CHAT ---
const chatRef = ref(db, "chat");
onValue(chatRef, (snap) => {
  const chatbox = document.getElementById("chatbox");
  chatbox.innerHTML = "";
  snap.forEach((msg) => {
    const datos = msg.val();
    const div = document.createElement("div");
    div.className = "mensaje";
    const color = datos.color || "#ccc";
    const mensajeConEnlaces = datos.mensaje.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" style="color: #1e90ff;">$1</a>'
    );
    const fotoHTML = datos.foto
      ? `<img src="${datos.foto}" style="width:20px;height:20px;border-radius:50%;vertical-align:middle;margin-right:5px;">`
      : "";
    div.innerHTML = `${fotoHTML}<strong style="color:${color}">${datos.nombre}:</strong> ${mensajeConEnlaces}`;
    chatbox.appendChild(div);
  });
  chatbox.scrollTop = chatbox.scrollHeight;
});

window.enviarChat = () => {
  const mensaje = document.getElementById("mensaje").value.trim();
  const color = document.getElementById("colorNombre").value;
  const user = window.chatUser || {
    name: document.getElementById("nombre").value.trim() || "Anónimo",
    isAnon: true,
    photo: null
  };
  if (!mensaje || !user.name) return alert("Completa tu nombre y tu mensaje.");
  const nuevo = push(chatRef);
  set(nuevo, {
    nombre: user.name,
    mensaje,
    color,
    email: user.email || null,
    foto: user.photo || null,
    esAnonimo: user.isAnon,
    timestamp: Date.now()
  });
  document.getElementById("mensaje").value = "";
};

// --- LIKES ---
const reactionPath = "reacciones";
const deviceId = localStorage.getItem("reaction_device_id") || crypto.randomUUID();
localStorage.setItem("reaction_device_id", deviceId);
const reactions = ["like", "love", "funny"];
window.react = function(type) {
  const userRef = ref(db, `${reactionPath}/usuarios/${deviceId}`);
  get(userRef).then((snapshot) => {
    const previous = snapshot.val();
    if (previous === type) set(userRef, null);
    else set(userRef, type);
  });
};
function updateReactionCounters() {
  const usersRef = ref(db, `${reactionPath}/usuarios`);
  onValue(usersRef, (snapshot) => {
    const data = snapshot.val() || {};
    const counts = { like: 0, love: 0, funny: 0 };
    let userReaction = null;
    for (const [key, value] of Object.entries(data)) {
      if (reactions.includes(value)) {
        counts[value]++;
        if (key === deviceId) userReaction = value;
      }
    }
    reactions.forEach((type) => {
      const countEl = document.getElementById(`count-${type}`);
      const btnEl = document.getElementById(`btn-${type}`);
      if (countEl) countEl.textContent = counts[type];
      if (btnEl) btnEl.style.backgroundColor = userReaction === type ? "#d1ffd6" : "";
    });
  });
}
updateReactionCounters();

// --- COMPARTIR ---
window.compartirPagina = function () {
  if (navigator.share) {
    navigator.share({
      title: 'Radiophonica Online',
      text: '¡Escucha 🎧 Radiophonica Online en vivo!',
      url: window.location.href
    });
  } else {
    alert("Tu navegador no soporta el botón de compartir.");
  }
};

// --- LOGIN ---
document.getElementById("login-google").addEventListener("click", () => {
  signInWithPopup(auth, provider).catch(console.error);
});
document.getElementById("login-anonimo").addEventListener("click", () => {
  signInAnonymously(auth).catch(console.error);
});
document.getElementById("logout").addEventListener("click", () => {
  signOut(auth);
});
onAuthStateChanged(auth, (user) => {
  const info = document.getElementById("user-info");
  if (user) {
    const name = user.displayName || "Anónimo";
    const photo = user.photoURL || null;
    info.innerHTML = user.isAnonymous
      ? `👤 Estás chateando como invitado`
      : `<img src="${photo}" style="width:20px;border-radius:50%"> ${name}`;
    window.chatUser = { name, uid: user.uid, email: user.email || "", photo, isAnon: user.isAnonymous };
  } else {
    info.textContent = "No has iniciado sesión";
    window.chatUser = null;
  }
});
