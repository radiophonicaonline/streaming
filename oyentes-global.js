import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, set, onDisconnect, get, runTransaction } 
from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// 🔥 CONFIG (igual en todos lados)
const firebaseConfig = {
  apiKey: "AIzaSyAC-9LQSlelDVx27wd2DPxisi4M-lRwtrk",
  authDomain: "contador-de-personas-5f8aa.firebaseapp.com",
  databaseURL: "https://contador-de-personas-5f8aa-default-rtdb.firebaseio.com",
  projectId: "contador-de-personas-5f8aa",
  storageBucket: "contador-de-personas-5f8aa.appspot.com",
  messagingSenderId: "1063230344919",
  appId: "1:1063230344919:web:ed86a937ba176dddb1aa92"
};

// 🔥 Inicializar SIEMPRE
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 🔑 ID único
let conexionId = localStorage.getItem("conexionId");

if (!conexionId) {
  conexionId = "user_" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("conexionId", conexionId);
}

const conexionRef = ref(db, "conexiones/" + conexionId);

// 🔥 Obtener IP + ubicación
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

  // Guardar conexión
  set(conexionRef, {
    timestamp: Date.now(),
    ubicacion,
    dispositivo: detectarDispositivo(),
    pagina: window.location.pathname
  });

  // 🔥 eliminar al salir
  onDisconnect(conexionRef).remove();

  // 🔥 conteo diario
  const hoy = new Date().toISOString().split("T")[0];
  const regionRef = ref(db, `conexiones_diarias/${hoy}/${data.region}`);

  runTransaction(regionRef, (current) => {
    return (current || 0) + 1;
  });

});

// 📱 dispositivo
function detectarDispositivo() {
  if (/mobile/i.test(navigator.userAgent)) return "📱 Móvil";
  return "💻 PC";
}
