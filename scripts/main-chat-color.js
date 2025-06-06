
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
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
const likesRef = ref(db, "likes/total");
const usuariosRef = ref(db, "likes/usuarios");
const likeBtn = document.getElementById("btnLike");
const userId = localStorage.getItem("usuarioLike") || crypto.randomUUID();
localStorage.setItem("usuarioLike", userId);

onValue(likesRef, (snap) => {
  document.getElementById("likeCount").innerText = snap.exists() ? snap.val() : 0;
});

get(child(ref(db), "likes/usuarios/" + userId)).then((snap) => {
  if (snap.exists()) {
    likeBtn.disabled = true;
    likeBtn.style.opacity = 0.6;
  }
});

likeBtn.addEventListener("click", async () => {
  const usuarioYaLikeo = await get(child(ref(db), "likes/usuarios/" + userId));
  if (!usuarioYaLikeo.exists()) {
    const totalSnap = await get(likesRef);
    const nuevoTotal = totalSnap.exists() ? totalSnap.val() + 1 : 1;
    set(likesRef, nuevoTotal);
    set(ref(db, "likes/usuarios/" + userId), true);
    likeBtn.disabled = true;
    likeBtn.style.opacity = 0.6;
  } else {
    alert("Ya diste like desde este dispositivo 👍");
  }
});

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
// --- NOMBRE DE CANCIÓN Y PORTADA DESDE FIREBASE ---
get(ref(db, "urlReproductor")).then((snap) => {
  if (snap.exists()) {
    const urlBase = snap.val().replace(/\/[^/]*$/, ""); // Quita el archivo del reproductor
    const divNombre = document.createElement("div");
    divNombre.id = "nombreCancion";
    divNombre.style.marginTop = "10px";
    divNombre.textContent = "🎵 Cargando canción...";
    document.querySelector("main").appendChild(divNombre);

    const imgPortada = document.createElement("img");
    imgPortada.id = "portadaCancion";
    imgPortada.style.width = "200px";
    imgPortada.style.marginTop = "10px";
    imgPortada.alt = "Portada de la canción";
    document.querySelector("main").appendChild(imgPortada);

    function actualizarCancionYPortada() {
      // Obtener nombre de la canción
      fetch(`${urlBase}/nowplaying.txt`)
        .then(res => res.text())
        .then(txt => {
          divNombre.textContent = `🎵 ${txt}`;
        })
        .catch(err => {
          console.warn("No se pudo cargar el nombre de la canción", err);
          divNombre.textContent = "🎵 (No disponible)";
        });

      // Forzar recarga de la portada con timestamp para evitar caché
      imgPortada.src = `${urlBase}/artwork.png?t=${Date.now()}`;
    }

    actualizarCancionYPortada();
    setInterval(actualizarCancionYPortada, 10000);
  }
});



