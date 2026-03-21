import { getDatabase, ref, set, onDisconnect, get, child, runTransaction } 
from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const db = getDatabase();

// 🔑 ID único por dispositivo (persistente)
let conexionId = localStorage.getItem("conexionId");

if (!conexionId) {
  conexionId = "user_" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("conexionId", conexionId);
}

// Referencia única
const conexionRef = ref(db, "conexiones/" + conexionId);

// Verificar si ya existe conexión activa
get(conexionRef).then(snapshot => {

  if (!snapshot.exists()) {

    // Obtener ubicación
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
        ubicacion: ubicacion,
        dispositivo: detectarDispositivo(),
        pagina: window.location.pathname
      });

      // Eliminar al salir
      onDisconnect(conexionRef).remove();

      // 🔥 Conteo diario (solo 1 vez)
      const hoy = new Date().toISOString().split("T")[0];
      const regionRef = ref(db, `conexiones_diarias/${hoy}/${data.region}`);

      runTransaction(regionRef, (current) => {
        return (current || 0) + 1;
      });

    });

  } else {
    // Solo actualiza timestamp
    set(conexionRef, {
      ...snapshot.val(),
      timestamp: Date.now(),
      pagina: window.location.pathname
    });
  }

});

// 📱 Detectar tipo de dispositivo
function detectarDispositivo() {
  if (/mobile/i.test(navigator.userAgent)) return "📱 Móvil";
  return "💻 PC";
}
