// firebase-auth-utils.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getDatabase,
  ref,
  get
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

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

let usuario = {
  nombre: "Anónimo",
  color: "#ffffff",
  uid: null,
  cargado: false
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    const uid = user.uid;
    usuario.uid = uid;
    if (user.isAnonymous) {
      usuario.nombre = "Anónimo";
      usuario.color = "#ffffff";
      usuario.cargado = true;
    } else {
      get(ref(db, "usuarios/" + uid)).then((snap) => {
        if (snap.exists()) {
          const data = snap.val();
          usuario.nombre = data.nombre || "Anónimo";
          usuario.color = data.color || "#ffffff";
        }
        usuario.cargado = true;
      });
    }
  } else {
    // Si no está logueado, logueamos como anónimo
    signInAnonymously(auth);
  }
});

window.getUsuarioInfo = () => usuario;
