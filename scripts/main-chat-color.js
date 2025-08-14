import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getDatabase, ref, push, set, onValue, onDisconnect, remove, get, child } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

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

// --- CONTADOR DE VISITAS ---
const hoy = new Date().toISOString().split("T")[0];
const visitasRef = ref(db, "visitas/" + hoy);
push(visitasRef, true);

// --- CONTADOR DE PERSONAS EN LA PÁGINA ---
const conexionesRef = ref(db, "conexiones");
const miConexion = push(conexionesRef);
set(miConexion, true);

// 🔹 Guardar ID en sessionStorage para el mapa
sessionStorage.setItem("conexionId", miConexion.key);
// Función para guardar ubicación en conexiones y conteo diario
function guardarUbicacion(ubicacion) {
  // Guardar en la conexión actual
  set(ref(db, `conexiones/${miConexion.key}/ubicacion`), ubicacion);

  // Guardar también en el conteo diario por región
  const hoy = new Date().toISOString().split("T")[0];
  const regionRef = ref(db, `conexiones_diarias/${hoy}/${ubicacion.region || 'Desconocida'}`);
  get(regionRef).then(snap => {
    const actual = snap.val() || 0;
    set(regionRef, actual + 1);
  });
}

// Intentar primero GPS
if ("geolocation" in navigator) {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      // Datos con precisión alta desde GPS
      const ubicacion = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        city: "Desconocida",
        region: "Desconocida",
        country: "Desconocido"
      };
      // Usar IP para completar ciudad/región si es posible
      fetch("https://ipapi.co/json/")
        .then(res => res.json())
        .then(data => {
          ubicacion.city = data.city || ubicacion.city;
          ubicacion.region = data.region || ubicacion.region;
          ubicacion.country = data.country_name || ubicacion.country;
          guardarUbicacion(ubicacion);
        })
        .catch(() => guardarUbicacion(ubicacion));
    },
    (err) => {
      console.warn("GPS no autorizado o falló:", err);
      // Plan B → Ubicación por IP
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
          guardarUbicacion(ubicacion);
        })
        .catch(err => console.error("Error obteniendo ubicación IP:", err));
    },
    { enableHighAccuracy: true, timeout: 5000 }
  );
} else {
  // Si el navegador no soporta GPS → IP
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
      guardarUbicacion(ubicacion);
    })
    .catch(err => console.error("Error obteniendo ubicación IP:", err));
}


onDisconnect(miConexion).remove();

onValue(conexionesRef, (snap) => {
  document.getElementById("contador").innerText =
    `👀 Hay ${snap.size} Radiovidente(s) viendo esta página.`;
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

window.react = function(type) {
  const userRef = ref(db, `${reactionPath}/usuarios/${deviceId}`);
  get(userRef).then((snapshot) => {
    const previous = snapshot.val();
    if (previous === type) {
      set(userRef, null);
    } else {
      set(userRef, type);
    }
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

// --- Cargar el reproductor automáticamente ---
const iframe = document.getElementById("iframePlayer");

get(ref(db, "urlReproductor")).then((snap) => {
  if (snap.exists()) {
    iframe.src = snap.val();
    registrarRadiovidente();
  } else {
    console.warn("No se encontró la URL del reproductor en Firebase.");
  }
});

let urlCancion = "";
let urlPortada = "";

function actualizarContenido() {
  const timestamp = Date.now();
  const iframe = document.getElementById("iframeCancion");
  if (iframe && urlCancion) {
    iframe.src = urlCancion + "?t=" + timestamp;
  }
  const portada = document.getElementById("portadaCancion");
  if (portada && urlPortada) {
    portada.src = urlPortada + "?t=" + timestamp;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  Promise.all([
    get(ref(db, "urlNowPlaying")),
    get(ref(db, "urlArtwork"))
  ]).then(([snapCancion, snapPortada]) => {
    if (snapCancion.exists()) {
      urlCancion = snapCancion.val();
    }
    if (snapPortada.exists()) {
      urlPortada = snapPortada.val();
    }
    actualizarContenido();
    setInterval(actualizarContenido, 10000);
  });
});

// --- LOGIN CON GOOGLE Y ANÓNIMO ---
document.getElementById("login-google").addEventListener("click", () => {
  signInWithPopup(auth, provider).catch((error) => {
    console.error("Error al iniciar sesión:", error);
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

// --- MENÚ RESPONSIVO ---
function toggleMenu() {
  const menu = document.getElementById("menuItems");
  if (menu.style.display === "flex") {
    menu.style.display = "none";
  } else {
    menu.style.display = "flex";
  }
}

document.addEventListener("click", function (e) {
  const menu = document.getElementById("menuItems");
  const toggle = document.querySelector(".menu-toggle");
  if (!toggle.contains(e.target) && !menu.contains(e.target)) {
    if (window.innerWidth < 768) {
      menu.style.display = "none";
    }
  }
});
