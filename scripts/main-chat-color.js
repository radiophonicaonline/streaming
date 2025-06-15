
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, push, set, onValue, onDisconnect, remove, get, child } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getDatabase, ref, get, set, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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
  document.getElementById("contador").innerText = `👀 Hay ${snap.size} persona(s) viendo esta página.`;
});

// --- RADIOVIDENTES ---
let miRadiovidenteRef = null;

function registrarRadiovidente() {
  const radiovidentesRef = ref(db, "radiovidentes");
  miRadiovidenteRef = push(radiovidentesRef);
  set(miRadiovidenteRef, true);
  onDisconnect(miRadiovidenteRef).remove();
  const contadorDiv = document.createElement("div");
  contadorDiv.id = "contadorRadiovidentes";
  contadorDiv.style.marginTop = "10px";
  document.querySelector("main").appendChild(contadorDiv);

  onValue(radiovidentesRef, (snap) => {
    document.getElementById("contadorRadiovidentes").innerText = `🎧 Radiovidentes activos: ${snap.size}`;
  });
}

function cerrarRadiovidente() {
  if (miRadiovidenteRef) remove(miRadiovidenteRef);
}

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
div.innerHTML = `<strong style="color:${color}">${datos.nombre}:</strong> ${mensajeConEnlaces}`;
    chatbox.appendChild(div);
  });
  chatbox.scrollTop = chatbox.scrollHeight;
});

window.enviarChat = () => {
  const nombre = document.getElementById("nombre").value.trim();
  const mensaje = document.getElementById("mensaje").value.trim();
  const color = document.getElementById("colorNombre").value;
  if (!nombre || !mensaje) return alert("Completa tu nombre y tu mensaje.");
  const nuevo = push(chatRef);
  set(nuevo, { nombre, mensaje, color });
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
const db = getDatabase();
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
      set(userRef, null); // Si hace clic en la misma, se quita
    } else {
      set(userRef, type); // Si hace clic en otra, se reemplaza
    }
  });
};

// Función para actualizar los contadores y colores
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

  const iframe = document.getElementById("iframeCancion");
  if (iframe) {
    iframe.src = "https://making-tba-annotation-exact.trycloudflare.com/nowplaying.txt?t=" + timestamp;
  }

  const portada = document.getElementById("portadaCancion");
  if (portada) {
    portada.src = "https://making-tba-annotation-exact.trycloudflare.com/artwork.png?t=" + timestamp;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  actualizarContenido(); // ejecuta una vez al cargar
  setInterval(actualizarContenido, 10000); // repite cada 10 seg
});



