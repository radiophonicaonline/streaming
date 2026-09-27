import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  update,
  onDisconnect,
  runTransaction
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";


// ======================================================
// 🔥 CONFIGURACIÓN FIREBASE
// ======================================================

const firebaseConfig = {
  apiKey: "AIzaSyAC-9LQSlelDVx27wd2DPxisi4M-lRwtrk",
  authDomain: "contador-de-personas-5f8aa.firebaseapp.com",
  databaseURL: "https://contador-de-personas-5f8aa-default-rtdb.firebaseio.com",
  projectId: "contador-de-personas-5f8aa",
  storageBucket: "contador-de-personas-5f8aa.appspot.com",
  messagingSenderId: "1063230344919",
  appId: "1:1063230344919:web:ed86a937ba176dddb1aa92"
};


// ======================================================
// 🔥 INICIALIZAR FIREBASE
// ======================================================

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);


// ======================================================
// 🔑 ID ÚNICO DEL NAVEGADOR
// Se mantiene en localStorage.
// ======================================================

let conexionId = localStorage.getItem("conexionId");

if (!conexionId) {
  conexionId = "user_" + Math.random().toString(36).substring(2, 11);
  localStorage.setItem("conexionId", conexionId);
}

const conexionRef = ref(db, "conexiones/" + conexionId);


// ======================================================
// 📱 DETECTAR TIPO DE DISPOSITIVO
// ======================================================

function detectarDispositivo() {

  const ua = navigator.userAgent.toLowerCase();

  if (/tablet|ipad/.test(ua)) {
    return "📱 Tablet";
  }

  if (/mobile|iphone|android/.test(ua)) {
    return "📱 Móvil";
  }

  return "💻 PC";
}


// ======================================================
// 🌎 OBTENER UBICACIÓN APROXIMADA POR IP
//
// IMPORTANTE:
// Esto NO utiliza GPS.
// NO solicita permiso de ubicación al usuario.
// ======================================================

fetch("https://ipapi.co/json/")
  .then(res => {

    if (!res.ok) {
      throw new Error("No fue posible obtener la ubicación por IP");
    }

    return res.json();
  })

  .then(data => {

    const ubicacion = {
      lat: data.latitude,
      lon: data.longitude,
      city: data.city || "Desconocido",
      region: data.region || "Desconocida",
      country: data.country_name || "Desconocido"
    };


    // ==================================================
    // 🟢 REGISTRAR CONEXIÓN ACTUAL
    // ==================================================

    set(conexionRef, {

      timestamp: Date.now(),

      ubicacion: ubicacion,

      dispositivo: detectarDispositivo(),

      pagina: window.location.pathname

    });


    // ==================================================
    // 🔴 ELIMINAR CUANDO FIREBASE DETECTE DESCONEXIÓN
    // ==================================================

    onDisconnect(conexionRef).remove();


    // ==================================================
    // ❤️ HEARTBEAT
    //
    // Cada 30 segundos actualizamos el timestamp.
    //
    // Esto demuestra que el navegador continúa
    // conectado.
    // ==================================================

    const HEARTBEAT_INTERVAL = 30000;

    setInterval(() => {

      update(conexionRef, {

        timestamp: Date.now(),

        pagina: window.location.pathname,

        dispositivo: detectarDispositivo()

      });

    }, HEARTBEAT_INTERVAL);


    // ==================================================
    // 📊 CONTEO DIARIO
    //
    // Se mantiene el comportamiento que ya tenías.
    // Más adelante podemos convertirlo en usuarios
    // únicos diarios si queremos.
    // ==================================================

    const hoy = new Date().toISOString().split("T")[0];

    const regionRef = ref(
      db,
      `conexiones_diarias/${hoy}/${data.region || "Desconocida"}`
    );

    runTransaction(regionRef, current => {

      return (current || 0) + 1;

    });

  })

  .catch(error => {

    console.error(
      "Error registrando oyente:",
      error
    );

  });
