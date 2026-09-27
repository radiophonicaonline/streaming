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


  // ====================================================
  // AGREGAR UBICACIÓN A LA CONEXIÓN
  // ====================================================

  return update(
    conexionRef,
    {

      ubicacion,

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

    const hoy =
      new Date()
        .toISOString()
        .split("T")[0];


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
