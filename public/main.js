/* ═══════════════════════════════════════
       LÓGICA COMPARADOR (input físico / USB)
    ═══════════════════════════════════════ */
let codigo1 = "";
let codigo2 = "";
let buffer = "";
let timeout;
const input = document.getElementById("codigoInput");
const result = document.getElementById("resultado");

function comparar() {
  if (codigo1 && codigo2) {
    document.getElementById("ultimo1").textContent = codigo1;
    document.getElementById("ultimo2").textContent = codigo2;

    if (codigo1 === codigo2) {
      result.textContent = "✅ Los códigos coinciden (" + codigo1 + ")";
      result.className = "ok";
    } else {
      result.textContent =
        "❌ Los códigos NO coinciden (" + codigo1 + " ≠ " + codigo2 + ")";
      result.className = "error";
    }
    reiniciar();
  }
}

function reiniciar() {
  setTimeout(() => {
    codigo1 = "";
    codigo2 = "";
    result.textContent = "";
    result.className = "";
  }, 2500);
}

function procesarCodigo(value) {
  value = value.trim();
  if (!value) return;

  if (!codigo1) {
    codigo1 = value;
    result.textContent = "⏳ Esperando el 2do código...";
    result.className = "esperar";
  } else if (!codigo2 && value !== codigo1) {
    // Evitar que el mismo escaneo rápido cuente doble
    codigo2 = value;
    comparar();
  }
}

input.addEventListener("input", (e) => {
  clearTimeout(timeout);
  buffer += e.data || "";
  timeout = setTimeout(() => {
    if (buffer.length > 0) {
      procesarCodigo(buffer);
      buffer = "";
      input.value = "";
    }
  }, 150);
});

window.addEventListener("click", (e) => {
  const ignorar = [
    "btnModoTelefono",
    "btnCambiarCamara",
    "videoElement",
    "videoContainer",
    "mira",
    "scanLine",
  ];
  if (!ignorar.includes(e.target.id)) input.focus();
});

/* ═══════════════════════════════════════
   MODO TELÉFONO — QuaggaJS (universal)
═══════════════════════════════════════ */
const btnModoTelefono  = document.getElementById("btnModoTelefono");
const camaraPanel      = document.getElementById("camaraPanel");
const videoElement     = document.getElementById("videoElement");
const btnCambiarCamara = document.getElementById("btnCambiarCamara");
const camStatus        = document.getElementById("camStatus");
const flashOk          = document.getElementById("flashOk");
const codigoDetectadoEl= document.getElementById("codigoDetectado");

let camaraActiva = false;
let facingMode   = "environment";
let quaggaActivo = false;
let cooldown     = false;

function iniciarQuagga(facing) {
  if (quaggaActivo) pararQuagga();

  camStatus.textContent = "Iniciando cámara...";
  codigoDetectadoEl.textContent = "";

  Quagga.init({
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: document.getElementById("videoContainer"),
      constraints: {
        facingMode: facing,
        width:  { ideal: 1280 },
        height: { ideal: 720 }
      },
    },
    decoder: {
      readers: [
        "code_128_reader",
        "ean_reader",
        "ean_8_reader",
        "upc_reader",
        "upc_e_reader",
        "code_39_reader",
        "codabar_reader",
        "i2of5_reader"
      ],
      multiple: false
    },
    locate: true,
    numOfWorkers: 2,
    frequency: 10
  }, (err) => {
    if (err) {
      camStatus.textContent = "⚠️ Error al iniciar cámara: " + err.message;
      console.error(err);
      return;
    }
    Quagga.start();
    quaggaActivo = true;
    camStatus.textContent = facing === "environment"
      ? "📷 Cámara trasera — apunta al código"
      : "🤳 Cámara frontal — apunta al código";
  });

  Quagga.offDetected(); // limpiar listeners anteriores
  Quagga.onDetected((data) => {
    if (cooldown) return;
    const texto = data.codeResult.code;
    if (!texto) return;

    codigoDetectadoEl.textContent = "🔍 " + texto;
    flashOk.classList.add("show");
    setTimeout(() => flashOk.classList.remove("show"), 180);

    cooldown = true;
    setTimeout(() => { cooldown = false; }, 1800);

    procesarCodigo(texto);
  });
}

function pararQuagga() {
  if (quaggaActivo) {
    Quagga.stop();
    Quagga.offDetected();
    quaggaActivo = false;
  }
  cooldown = false;
  codigoDetectadoEl.textContent = "";

  // Quagga inserta su propio <video> y <canvas>, limpiarlos
  const contenedor = document.getElementById("videoContainer");
  contenedor.querySelectorAll("video, canvas").forEach(el => el.remove());
}

btnModoTelefono.addEventListener("click", () => {
  camaraActiva = !camaraActiva;
  if (camaraActiva) {
    camaraPanel.classList.add("visible");
    btnModoTelefono.textContent = "❌ Cerrar Modo Teléfono";
    btnModoTelefono.style.backgroundColor = "#b71c1c";
    iniciarQuagga(facingMode);
  } else {
    camaraPanel.classList.remove("visible");
    btnModoTelefono.textContent = "📱 Modo Teléfono";
    btnModoTelefono.style.backgroundColor = "";
    pararQuagga();
    camStatus.textContent = "Iniciando cámara...";
  }
});

btnCambiarCamara.addEventListener("click", () => {
  facingMode = facingMode === "environment" ? "user" : "environment";
  iniciarQuagga(facingMode);
});