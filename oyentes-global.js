import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";

import {
  getDatabase,
  ref,
  set,
  update,
  remove,
  onDisconnect,
  runTransaction
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";


// ======================================================
// FECHA Y HORA OFICIAL DE RADIOPHONICA: CHILE CONTINENTAL
// ======================================================
function fechaHoraChile(fecha = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  }).formatToParts(fecha);
  const p = Object.fromEntries(partes.map(x => [x.type, x.value]));
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}:${p.second}` };
}

// ======================================================
// FIREBASE
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
// INICIALIZAR FIREBASE
// ======================================================

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);


// ======================================================
// ID ÚNICO DEL NAVEGADOR
// ======================================================

let conexionId = localStorage.getItem("conexionId");

if (!conexionId) {

  conexionId =
    "user_" +
    Date.now().toString(36) +
    "_" +
    Math.random()
      .toString(36)
      .substring(2, 10);

  localStorage.setItem(
    "conexionId",
    conexionId
  );

}


const conexionRef =
  ref(
    db,
    "conexiones/" + conexionId
  );


// ======================================================
// DETECTAR DISPOSITIVO
// ======================================================

function detectarDispositivo() {

  const ua =
    navigator.userAgent.toLowerCase();


  if (
    /ipad|tablet/.test(ua)
  ) {

    return "📱 Tablet";

  }


  if (
    /mobile|iphone|android/.test(ua)
  ) {

    return "📱 Móvil";

  }


  return "💻 PC";

}


// ======================================================
// 1. CREAR CONEXIÓN INMEDIATAMENTE
//
// IMPORTANTE:
// Ya NO esperamos a ipapi.
// ======================================================

set(
  conexionRef,
  {

    timestamp:
      Date.now(),

    fechaChile: fechaHoraChile().fecha,
    horaEntradaChile: fechaHoraChile().hora,
    dispositivo:
      detectarDispositivo(),

    pagina:
      window.location.pathname,

    ubicacion: {

      lat: null,

      lon: null,

      city:
        "Obteniendo ubicación...",

      region:
        "Desconocida",

      country:
        "Desconocido"

    }

  }
)

.then(() => {

  console.log(
    "🟢 Oyente registrado:",
    conexionId
  );


  // ====================================================
  // ELIMINAR AL DESCONECTARSE
  // ====================================================

  return onDisconnect(
    conexionRef
  ).remove();

})

.then(() => {

  console.log(
    "🟢 onDisconnect configurado"
  );

})

.catch(error => {

  console.error(
    "🔴 ERROR registrando conexión:",
    error
  );

});


// ======================================================
// 2. HEARTBEAT
//
// Actualiza cada 30 segundos.
// ======================================================

setInterval(() => {

  update(
    conexionRef,
    {

      timestamp:
        Date.now(),
      fechaChile: fechaHoraChile().fecha,
      horaUltimaActualizacionChile: fechaHoraChile().hora,

      dispositivo:
        detectarDispositivo(),

      pagina:
        window.location.pathname

    }
  )

  .catch(error => {

    console.error(
      "🔴 Error heartbeat:",
      error
    );

  });

}, 30000);


let ubicacionDiagnostico = {
  city: "Consultando ubicación", region: "Desconocida", country: "Desconocido"
};

// ======================================================
// 3. UBICACIÓN APROXIMADA POR IP
//
// NO USA GPS.
// NO PIDE PERMISO.
// ======================================================

fetch("https://ipapi.co/json/")

.then(response => {

  if (!response.ok) {

    throw new Error(
      "Respuesta IPAPI: " +
      response.status
    );

  }

  return response.json();

})

.then(data => {


  const lat =
    Number(data.latitude);


  const lon =
    Number(data.longitude);


  const ubicacion = {

    lat:
      Number.isFinite(lat)
        ? lat
        : null,

    lon:
      Number.isFinite(lon)
        ? lon
        : null,

    city:
      data.city ||
      "Desconocida",

    region:
      data.region ||
      "Desconocida",

    country:
      data.country_name ||
      "Desconocido"

  };

  ubicacionDiagnostico = { city: ubicacion.city, region: ubicacion.region, country: ubicacion.country };
  try { localStorage.setItem("radiophonica_ubicacion_ip", JSON.stringify(ubicacionDiagnostico)); } catch (_) {}

  // ====================================================
  // AGREGAR UBICACIÓN A LA CONEXIÓN
  // ====================================================

  return update(
    conexionRef,
    {

      ubicacion,
      fechaChile: fechaHoraChile().fecha,
      horaUltimaActualizacionChile: fechaHoraChile().hora,

      timestamp:
        Date.now()

    }
  )

  .then(() => {

    console.log(
      "🌎 Ubicación obtenida:",
      ubicacion
    );


    // ==================================================
    // CONTADOR DIARIO
    // ==================================================

    const hoy = fechaHoraChile().fecha;


    const claveDia =
      "oyente_diario_" + hoy;


    // Sólo contar una vez al día
    // por navegador.

    if (
      localStorage.getItem(
        claveDia
      )
    ) {

      return;

    }


    const region =
      ubicacion.region ||
      "Desconocida";


    const regionRef =
      ref(
        db,
        `conexiones_diarias/${hoy}/${region}`
      );


    return runTransaction(
      regionRef,
      current => {

        return (
          Number(current) || 0
        ) + 1;

      }
    )

    .then(() => {

      localStorage.setItem(
        claveDia,
        "1"
      );

    });

  });

})

.catch(error => {

  // IMPORTANTE:
  // Si falla la ubicación,
  // NO eliminamos la conexión.

  console.warn(
    "🟠 No se pudo obtener ubicación:",
    error
  );

});


// ======================================================
// MEDICIÓN DE PERMANENCIA + DIAGNÓSTICO DE VISITA
// ======================================================
const permanenciaWebId = "pagina_web_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
const permanenciaWebInicio = Date.now();
const permanenciaWebReloj = fechaHoraChile(new Date(permanenciaWebInicio));
const permanenciaWebFecha = permanenciaWebReloj.fecha;
const permanenciaWebRef = ref(db, "historial_permanencia/" + permanenciaWebFecha + "/" + permanenciaWebId);
const permanenciaWebActivaRef = ref(db, "permanencia_en_vivo/" + permanenciaWebId);
let permanenciaWebFinalizada = false;

try {
  const cacheUbicacion = localStorage.getItem("radiophonica_ubicacion_ip");
  if (cacheUbicacion) ubicacionDiagnostico = JSON.parse(cacheUbicacion);
} catch (_) {}

function guardarPermanenciaWeb() {
  if (permanenciaWebFinalizada) return;
  const ahora = Date.now();
  const relojAhora = fechaHoraChile(new Date(ahora));
  const datos = {
    idSesion: permanenciaWebId, inicio: permanenciaWebInicio, timestamp: permanenciaWebInicio,
    ultimaActualizacion: ahora, duracionSegundos: Math.max(0, Math.floor((ahora - permanenciaWebInicio) / 1000)),
    fecha: permanenciaWebFecha, fechaChile: permanenciaWebFecha, horaEntradaChile: permanenciaWebReloj.hora,
    horaUltimaActualizacionChile: relojAhora.hora, tipo: "web",
    pagina: window.location.pathname || "Página principal", dispositivo: detectarDispositivo(),
    ubicacion: ubicacionDiagnostico
  };
  update(permanenciaWebRef, datos).catch(e => console.warn("Error permanencia web:", e));
  update(permanenciaWebActivaRef, datos).catch(() => {});
}

onDisconnect(permanenciaWebActivaRef).remove();
guardarPermanenciaWeb();
const heartbeatPermanenciaWeb = setInterval(guardarPermanenciaWeb, 15000);

function finalizarPermanenciaWeb() {
  if (permanenciaWebFinalizada) return;
  guardarPermanenciaWeb();
  permanenciaWebFinalizada = true;
  clearInterval(heartbeatPermanenciaWeb);
  remove(permanenciaWebActivaRef).catch(() => {});
}

window.addEventListener("pagehide", finalizarPermanenciaWeb);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") guardarPermanenciaWeb();
});
