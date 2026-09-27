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


const app = initializeApp(firebaseConfig);
const db = getDatabase(app);


// ======================================================
// ID ÚNICO DEL DISPOSITIVO / NAVEGADOR
// ======================================================

let conexionId = localStorage.getItem("conexionId");

if (!conexionId) {

  if (window.crypto && crypto.randomUUID) {

    conexionId = "user_" + crypto.randomUUID();

  } else {

    conexionId =
      "user_" +
      Date.now().toString(36) +
      Math.random().toString(36).substring(2, 10);

  }

  localStorage.setItem("conexionId", conexionId);
}


const conexionRef =
  ref(db, `conexiones/${conexionId}`);


// ======================================================
// DETECTAR DISPOSITIVO
// ======================================================

function detectarDispositivo() {

  const ua =
    navigator.userAgent.toLowerCase();

  if (/ipad|tablet/.test(ua)) {

    return "📱 Tablet";

  }

  if (/mobile|iphone|android/.test(ua)) {

    return "📱 Móvil";

  }

  return "💻 PC";
}


// ======================================================
// UBICACIÓN APROXIMADA POR IP
//
// NO USA GPS.
// NO PIDE PERMISO DE UBICACIÓN.
// ======================================================

fetch("https://ipapi.co/json/")

  .then(response => {

    if (!response.ok) {

      throw new Error(
        "No se pudo obtener la ubicación por IP."
      );

    }

    return response.json();

  })

  .then(data => {


    const ubicacion = {

      lat:
        data.latitude ?? null,

      lon:
        data.longitude ?? null,

      city:
        data.city || "Desconocida",

      region:
        data.region || "Desconocida",

      country:
        data.country_name || "Desconocido"

    };


    // ==================================================
    // REGISTRAR CONEXIÓN
    // ==================================================

    return set(
      conexionRef,
      {

        timestamp:
          Date.now(),

        ubicacion,

        dispositivo:
          detectarDispositivo(),

        pagina:
          window.location.pathname

      }
    )

    .then(() => {


      // ================================================
      // ELIMINAR SI FIREBASE DETECTA DESCONEXIÓN
      // ================================================

      onDisconnect(
        conexionRef
      ).remove();


      // ================================================
      // HEARTBEAT
      //
      // Actualizar cada 30 segundos.
      // ================================================

      setInterval(() => {

        update(
          conexionRef,
          {

            timestamp:
              Date.now(),

            pagina:
              window.location.pathname,

            dispositivo:
              detectarDispositivo()

          }
        )

        .catch(error => {

          console.error(
            "Error actualizando heartbeat:",
            error
          );

        });

      }, 30000);


      // ================================================
      // CONTEO DIARIO
      // ================================================

      const hoy =
        new Date()
          .toISOString()
          .split("T")[0];


      // Evitar sumar varias veces al mismo dispositivo
      // durante el mismo día.

      const claveDia =
        `oyente_diario_${hoy}`;


      if (
        !localStorage.getItem(claveDia)
      ) {

        const region =
          ubicacion.region ||
          "Desconocida";


        const regionRef =
          ref(
            db,
            `conexiones_diarias/${hoy}/${region}`
          );


        runTransaction(
          regionRef,
          current => {

            return (current || 0) + 1;

          }
        )

        .then(() => {

          localStorage.setItem(
            claveDia,
            "1"
          );

        })

        .catch(error => {

          console.error(
            "Error actualizando conteo diario:",
            error
          );

        });

      }

    });

  })

  .catch(error => {

    console.error(
      "Error en sistema de oyentes:",
      error
    );

  });
