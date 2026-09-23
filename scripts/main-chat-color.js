import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  onDisconnect,
  get
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";


// =====================================================
// FIREBASE
// =====================================================

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


// =====================================================
// CONTADOR DE VISITAS
// =====================================================

const hoy = new Date().toISOString().split("T")[0];
const visitasRef = ref(db, "visitas/" + hoy);

push(visitasRef, true);


// =====================================================
// PERSONAS CONECTADAS
// =====================================================

const conexionesRef = ref(db, "conexiones");
const miConexion = push(conexionesRef);

set(miConexion, true);

sessionStorage.setItem("conexionId", miConexion.key);


// =====================================================
// UBICACIÓN
// =====================================================

function guardarUbicacion(ubicacion) {

  set(
    ref(db, `conexiones/${miConexion.key}/ubicacion`),
    ubicacion
  );

  const fechaHoy = new Date().toISOString().split("T")[0];

  const regionRef = ref(
    db,
    `conexiones_diarias/${fechaHoy}/${ubicacion.region || "Desconocida"}`
  );

  get(regionRef).then((snap) => {

    const actual = snap.val() || 0;

    set(regionRef, actual + 1);

  });

}


if ("geolocation" in navigator) {

  navigator.geolocation.getCurrentPosition(

    (pos) => {

      const ubicacion = {

        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        city: "Desconocida",
        region: "Desconocida",
        country: "Desconocido"

      };


      fetch("https://ipapi.co/json/")

        .then(res => res.json())

        .then(data => {

          ubicacion.city =
            data.city || ubicacion.city;

          ubicacion.region =
            data.region || ubicacion.region;

          ubicacion.country =
            data.country_name || ubicacion.country;

          guardarUbicacion(ubicacion);

        })

        .catch(() => {

          guardarUbicacion(ubicacion);

        });

    },


    () => {

      fetch("https://ipapi.co/json/")

        .then(res => res.json())

        .then(data => {

          guardarUbicacion({

            lat: data.latitude,
            lon: data.longitude,
            city: data.city,
            region: data.region,
            country: data.country_name

          });

        })

        .catch(err => {

          console.error(
            "Error obteniendo ubicación:",
            err
          );

        });

    },

    {
      enableHighAccuracy: true,
      timeout: 5000
    }

  );

}


// =====================================================
// ELIMINAR CONEXIÓN AL SALIR
// =====================================================

onDisconnect(miConexion).remove();


// =====================================================
// CONTADOR EN PANTALLA
// =====================================================

onValue(conexionesRef, (snap) => {

  const contador =
    document.getElementById("contador");

  if (contador) {

    contador.innerText =
      `👀 Hay ${snap.size} Radiovidente(s) viendo esta página.`;

  }

});


// =====================================================
// CHAT
// =====================================================

const chatRef = ref(db, "chat");


onValue(chatRef, (snap) => {

  const chatbox =
    document.getElementById("chatbox");

  if (!chatbox) return;


  chatbox.innerHTML = "";


  snap.forEach((msg) => {

    const datos = msg.val();

    const div =
      document.createElement("div");

    div.className = "mensaje";


    const color =
      datos.color || "#ccc";


    const mensaje =
      (datos.mensaje || "").replace(

        /(https?:\/\/[^\s]+)/g,

        '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#1e90ff;">$1</a>'

      );


    const fotoHTML =
      datos.foto

        ? `<img src="${datos.foto}"
             style="
             width:20px;
             height:20px;
             border-radius:50%;
             vertical-align:middle;
             margin-right:5px;
             ">`

        : "";


    div.innerHTML =
      `${fotoHTML}<strong style="color:${color}">
      ${datos.nombre || "Anónimo"}:
      </strong> ${mensaje}`;


    chatbox.appendChild(div);

  });


  chatbox.scrollTop =
    chatbox.scrollHeight;

});


// =====================================================
// ENVIAR CHAT
// =====================================================

window.enviarChat = () => {

  const mensajeEl =
    document.getElementById("mensaje");

  const colorEl =
    document.getElementById("colorNombre");

  const nombreEl =
    document.getElementById("nombre");


  if (!mensajeEl) return;


  const mensaje =
    mensajeEl.value.trim();


  const color =
    colorEl
      ? colorEl.value
      : "#00bcd4";


  const user =
    window.chatUser || {

      name:
        nombreEl?.value.trim() ||
        "Anónimo",

      isAnon: true,

      photo: null

    };


  if (!mensaje) {

    alert("Escribe un mensaje.");

    return;

  }


  const nuevo =
    push(chatRef);


  set(nuevo, {

    nombre: user.name,

    mensaje,

    color,

    email:
      user.email || null,

    foto:
      user.photo || null,

    esAnonimo:
      user.isAnon,

    timestamp:
      Date.now()

  });


  mensajeEl.value = "";

};


// =====================================================
// WHATSAPP
// =====================================================

window.enviarComentario = () => {

  const comentario =
    document.getElementById("comentario");


  if (!comentario) return;


  const texto =
    comentario.value.trim();


  if (!texto) {

    alert("Escribe un comentario.");

    return;

  }


  const numero =
    "+56944896523";


  const enlace =
    `https://api.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(texto)}`;


  window.open(
    enlace,
    "_blank",
    "noopener,noreferrer"
  );


  comentario.value = "";

};


// =====================================================
// REACCIONES
// =====================================================

const reactionPath =
  "reacciones";


let deviceId =
  localStorage.getItem(
    "reaction_device_id"
  );


if (!deviceId) {

  if (
    window.crypto &&
    crypto.randomUUID
  ) {

    deviceId =
      crypto.randomUUID();

  } else {

    deviceId =
      Date.now().toString() +
      Math.random()
        .toString(36)
        .substring(2);

  }


  localStorage.setItem(
    "reaction_device_id",
    deviceId
  );

}


const reactions =
  ["like", "love", "funny"];


window.react = function(type) {

  if (
    !reactions.includes(type)
  ) return;


  const userRef =
    ref(
      db,
      `${reactionPath}/usuarios/${deviceId}`
    );


  get(userRef).then((snapshot) => {

    const previous =
      snapshot.val();


    if (previous === type) {

      set(userRef, null);

    } else {

      set(userRef, type);

    }

  });

};


// =====================================================
// ACTUALIZAR CONTADORES
// =====================================================

function updateReactionCounters() {

  const usersRef =
    ref(
      db,
      `${reactionPath}/usuarios`
    );


  onValue(usersRef, (snapshot) => {

    const data =
      snapshot.val() || {};


    const counts = {

      like: 0,
      love: 0,
      funny: 0

    };


    let userReaction =
      null;


    for (
      const [key, value]
      of Object.entries(data)
    ) {

      if (
        reactions.includes(value)
      ) {

        counts[value]++;

        if (key === deviceId) {

          userReaction = value;

        }

      }

    }


    reactions.forEach((type) => {

      const countEl =
        document.getElementById(
          `count-${type}`
        );

      const btnEl =
        document.getElementById(
          `btn-${type}`
        );


      if (countEl) {

        countEl.textContent =
          counts[type];

      }


      if (btnEl) {

        btnEl.style.backgroundColor =
          userReaction === type
            ? "#d1ffd6"
            : "";

      }

    });

  });

}


updateReactionCounters();


// =====================================================
// COMPARTIR
// =====================================================

window.compartirPagina =
  function () {

    if (navigator.share) {

      navigator.share({

        title:
          "Radiophonica Online",

        text:
          "¡Escucha 🎧 Radiophonica Online en vivo!",

        url:
          window.location.href

      }).catch(() => {});

    } else {

      alert(
        "Tu navegador no soporta el botón de compartir."
      );

    }

  };


// =====================================================
// REPRODUCTOR DE VIDEO
// =====================================================

function cargarReproductor() {

  const iframe =
    document.getElementById(
      "iframePlayer"
    );


  if (!iframe) {

    console.error(
      "No se encontró iframePlayer."
    );

    return;

  }


  get(
    ref(db, "urlReproductor")
  )

    .then((snap) => {

      if (!snap.exists()) {

        console.warn(
          "No se encontró urlReproductor en Firebase."
        );

        return;

      }


      const url =
        String(
          snap.val()
        ).trim();


      console.log(
        "URL reproductor:",
        url
      );


      if (!url) {

        console.warn(
          "La URL del reproductor está vacía."
        );

        return;

      }


      /*
       * Asignamos la URL después
       * de encontrar el iframe.
       * Esto funciona tanto en
       * escritorio como móvil.
       */

      iframe.setAttribute(
        "src",
        url
      );

  })

  .catch((error) => {

    console.error(
      "Error cargando reproductor:",
      error
    );

  });

}


// Esperamos a que todo el HTML exista
if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    cargarReproductor
  );

} else {

  cargarReproductor();

}


// =====================================================
// NOW PLAYING
// =====================================================

let urlCancion = "";
let urlPortada = "";


function actualizarContenido() {

  const timestamp =
    Date.now();


  const iframe =
    document.getElementById(
      "iframeCancion"
    );


  if (
    iframe &&
    urlCancion
  ) {

    const separador =
      urlCancion.includes("?")
        ? "&"
        : "?";


    iframe.src =
      urlCancion +
      separador +
      "t=" +
      timestamp;

  }


  const portada =
    document.getElementById(
      "portadaCancion"
    );


  if (
    portada &&
    urlPortada
  ) {

    const separador =
      urlPortada.includes("?")
        ? "&"
        : "?";


    portada.src =
      urlPortada +
      separador +
      "t=" +
      timestamp;

  }

}


// =====================================================
// CARGAR NOW PLAYING
// =====================================================

function cargarNowPlaying() {

  Promise.all([

    get(
      ref(
        db,
        "urlNowPlaying"
      )
    ),

    get(
      ref(
        db,
        "urlArtwork"
      )
    )

  ])

  .then(
    ([snapCancion, snapPortada]) => {

      if (
        snapCancion.exists()
      ) {

        urlCancion =
          snapCancion.val();

      }


      if (
        snapPortada.exists()
      ) {

        urlPortada =
          snapPortada.val();

      }


      actualizarContenido();


      setInterval(
        actualizarContenido,
        10000
      );

    }
  )

  .catch((error) => {

    console.error(
      "Error cargando Now Playing:",
      error
    );

  });

}


if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    cargarNowPlaying
  );

} else {

  cargarNowPlaying();

}


// =====================================================
// LOGIN GOOGLE
// =====================================================

const loginGoogle =
  document.getElementById(
    "login-google"
  );


if (loginGoogle) {

  loginGoogle.addEventListener(
    "click",
    () => {

      signInWithPopup(
        auth,
        provider
      )

      .catch((error) => {

        console.error(
          "Error al iniciar sesión:",
          error
        );

      });

    }
  );

}


// =====================================================
// LOGIN ANÓNIMO
// =====================================================

const loginAnonimo =
  document.getElementById(
    "login-anonimo"
  );


if (loginAnonimo) {

  loginAnonimo.addEventListener(
    "click",
    () => {

      signInAnonymously(auth)

      .catch((error) => {

        console.error(
          "Error al iniciar como anónimo:",
          error
        );

      });

    }
  );

}


// =====================================================
// LOGOUT
// =====================================================

const logout =
  document.getElementById(
    "logout"
  );


if (logout) {

  logout.addEventListener(
    "click",
    () => {

      signOut(auth);

    }
  );

}


// =====================================================
// ESTADO DEL USUARIO
// =====================================================

onAuthStateChanged(
  auth,
  (user) => {

    const info =
      document.getElementById(
        "user-info"
      );


    if (!info) return;


    if (user) {

      const name =
        user.displayName ||
        "Anónimo";


      const photo =
        user.photoURL ||
        null;


      if (user.isAnonymous) {

        info.innerHTML =
          "👤 Estás chateando como invitado";

      } else {

        info.innerHTML =
          photo

            ? `<img src="${photo}"
                 style="
                 width:20px;
                 height:20px;
                 border-radius:50%;
                 vertical-align:middle;
                 ">
                 ${name}`

            : name;

      }


      window.chatUser = {

        name,

        uid:
          user.uid,

        email:
          user.email || "",

        photo,

        isAnon:
          user.isAnonymous

      };

    } else {

      info.textContent =
        "No has iniciado sesión";


      window.chatUser =
        null;

    }

  }
);
