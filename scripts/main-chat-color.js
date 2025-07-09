
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signInAnonymously,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getDatabase, ref, push, set, onValue, onDisconnect, remove, get, child } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAC-9LQSlelDVx27wd2DPxisi4M-lRwtrk",
  authDomain: "contador-de-personas-5f8aa.firebaseapp.com",
  projectId: "contador-de-personas-5f8aa",
  storageBucket: "contador-de-personas-5f8aa.appspot.com",
  messagingSenderId: "1063230344919",
  appId: "1:1063230344919:web:ed86a937ba176dddb1aa92"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const providerFacebook = new FacebookAuthProvider();


// --- CONTADOR DE VISITAS ---
const hoy = new Date().toISOString().split("T")[0];
const visitasRef = ref(db, "visitas/" + hoy);
push(visitasRef, true);

// --- CONTADOR DE PERSONAS EN LA PÁGINA ---
const conexionesRef = ref(db, "conexiones");
const miConexion = push(conexionesRef);
set(miConexion, true);
onDisconnect(miConexion).remove();

onValue(conexionesRef, (snap) => {
  document.getElementById("contador").innerText = `👀 Hay ${snap.size} Radiovidente(s) viendo esta página.`;
});



// --- CHAT EN VIVO CON COLORES ---
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
const fotoHTML = datos.foto ? `<img src="${datos.foto}" style="width:20px;height:20px;border-radius:50%;vertical-align:middle;margin-right:5px;">` : "";
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
// --- ENVIAR COMENTARIO POR WHATSAPP ---
window.enviarComentario = () => {
  const texto = document.getElementById("comentario").value.trim();
  if (!texto) return alert("Escribe un comentario.");
  const numero = "+56944896523";
  const enlace = `https://api.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(texto)}`;
  window.open(enlace, "_blank");
  document.getElementById("comentario").value = "";
};

// --- BOTÓN DE LIKES ---

const reactionPath = "reacciones";
const deviceId = localStorage.getItem("reaction_device_id") || crypto.randomUUID();
localStorage.setItem("reaction_device_id", deviceId);

const reactions = ["like", "love", "funny"];

// Función para enviar reacción
window.react = function(type) {
  const userRef = ref(db, `${reactionPath}/usuarios/${deviceId}`);
  get(userRef).then((snapshot) => {
    const previous = snapshot.val();
    if (previous === type) {
      set(userRef, null); // Quitar si hace clic en la misma
    } else {
      set(userRef, type); // Cambiar o agregar
    }
  });
};

// Función para actualizar los contadores y el estilo
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
      if (btnEl) {
        btnEl.style.backgroundColor = userReaction === type ? "#d1ffd6" : "";
      }
    });
  });
}

updateReactionCounters();


// --- BOTÓN DE COMPARTIR ---
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

// --- Cargar el reproductor automáticamente al abrir la página ---
const iframe = document.getElementById("iframePlayer");

get(ref(db, "urlReproductor")).then((snap) => {
  if (snap.exists()) {
    iframe.src = snap.val();
    registrarRadiovidente();
  } else {
    console.warn("No se encontró la URL del reproductor en Firebase.");
  }
});

// --- ACTUALIZAR CANCIÓN Y PORTADA AUTOMÁTICAMENTE ---
function actualizarContenido() {
  const timestamp = Date.now();

  // Actualizar nombre de la canción (desde .txt con fetch)
  fetch("https://photography-forecast-kitty-animation.trycloudflare.com/nowplaying.txt?t=" + timestamp)
    .then(response => response.text())
    .then(texto => {
      const divCancion = document.getElementById("nombreCancion");
      if (divCancion) {
        divCancion.textContent = texto.trim();
      }
    })
    .catch(error => {
      console.error("❌ Error al cargar nombre de canción:", error);
      const divCancion = document.getElementById("nombreCancion");
      if (divCancion) {
        divCancion.textContent = "🎶 Sin información";
      }
    });

  // Actualizar portada
  const portada = document.getElementById("portadaCancion");
  if (portada) {
    portada.src = "https://photography-forecast-kitty-animation.trycloudflare.com/artwork.png?t=" + timestamp;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  actualizarContenido(); // primera carga
  setInterval(actualizarContenido, 10000); // cada 10 seg
});



// --- LOGIN CON GOOGLE Y ANÓNIMO ---
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("login-google").addEventListener("click", () => {
    signInWithPopup(auth, provider).catch((error) => {
      console.error("Error al iniciar sesión:", error);
    });
  });
document.getElementById("login-facebook").addEventListener("click", () => {
  signInWithPopup(auth, providerFacebook).catch((error) => {
    console.error("Error al iniciar sesión con Facebook:", error);
  });
});


  document.getElementById("login-anonimo").addEventListener("click", () => {
    signInAnonymously(auth).catch((error) => {
      console.error("Error al iniciar como anónimo:", error);
    });
  });

  document.getElementById("logout").addEventListener("click", () => {
    signOut(auth);
  });

  onAuthStateChanged(auth, (user) => {
    const info = document.getElementById("user-info");
      console.log("USUARIO:", user);

    if (user) {
      const name = user.displayName || "Anónimo";
      const photo = user.photoURL || null;

      info.innerHTML = user.isAnonymous
        ? `👤 Estás chateando como invitado`
        : `<img src="${photo}" style="width:20px;border-radius:50%"> ${name}`;

      window.chatUser = {
        name: name,
        uid: user.uid,
        email: user.email || "",
        photo: photo,
        isAnon: user.isAnonymous
      };

    } else {
      info.textContent = "No has iniciado sesión";
      window.chatUser = null;
    }
  });
});
 window.addEventListener('load', function() {
    const player = document.getElementById('reproductor');
    const playPromise = player.play();

    if (playPromise !== undefined) {
      playPromise.then(_ => {
        // Autoplay OK
      }).catch(error => {
        console.warn("Autoplay bloqueado por el navegador 😓");
      });
    }
  });
