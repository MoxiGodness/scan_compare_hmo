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
   MODO TELÉFONO — compatible Safari iOS
═══════════════════════════════════════ */
const btnModoTelefono = document.getElementById("btnModoTelefono");
const camaraPanel = document.getElementById("camaraPanel");
const videoElement = document.getElementById("videoElement");
const btnCambiarCamara = document.getElementById("btnCambiarCamara");
const camStatus = document.getElementById("camStatus");
const flashOk = document.getElementById("flashOk");
const codigoDetectadoEl = document.getElementById("codigoDetectado");

let streamActual = null;
let camaraActiva = false;
let facingMode = "environment";
let detector = null;
let scanLoop = null;
let cooldown = false;

// Verificar soporte de BarcodeDetector (nativo iOS 17+ / Chrome Android)
const soportaBarcodeDetector = "BarcodeDetector" in window;

async function crearDetector() {
  if (!soportaBarcodeDetector) return null;
  try {
    return new BarcodeDetector({
      formats: [
        "code_128",
        "code_39",
        "ean_13",
        "ean_8",
        "upc_a",
        "upc_e",
        "qr_code",
        "data_matrix",
        "itf",
        "codabar",
      ],
    });
  } catch (e) {
    return null;
  }
}

async function iniciarCamara(facing) {
  pararLoop();
  if (streamActual) {
    streamActual.getTracks().forEach((t) => t.stop());
    streamActual = null;
  }
  codigoDetectadoEl.textContent = "";
  camStatus.textContent = "Iniciando cámara...";

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facing },
        width: { ideal: 1280 },
        height: { ideal: 960 },
      },
      audio: false,
    });
    streamActual = stream;
    videoElement.srcObject = stream;

    await new Promise((res) => {
      videoElement.onloadedmetadata = res;
    });
    await videoElement.play();

    const camLabel =
      facing === "environment" ? "📷 Cámara trasera" : "🤳 Cámara frontal";

    if (soportaBarcodeDetector) {
      detector = await crearDetector();
      camStatus.textContent = camLabel + " — apunta al código";
      iniciarLoop();
    } else {
      // Fallback: Safari iOS < 17 — mostrar botón para capturar foto
      camStatus.textContent = camLabel + " — presiona el botón para escanear";
      mostrarBotonCaptura();
    }
  } catch (err) {
    camStatus.textContent = "⚠️ Error: " + err.message;
    console.error(err);
  }
}

/* ── Loop de detección (BarcodeDetector) ── */
function iniciarLoop() {
  if (scanLoop) return;
  scanLoop = setInterval(async () => {
    if (cooldown || !detector || videoElement.readyState < 2) return;
    try {
      const resultados = await detector.detect(videoElement);
      if (resultados.length > 0) {
        const texto = resultados[0].rawValue;
        codigoDetectadoEl.textContent = "🔍 " + texto;
        flashOk.classList.add("show");
        setTimeout(() => flashOk.classList.remove("show"), 180);
        cooldown = true;
        setTimeout(() => {
          cooldown = false;
        }, 1800);
        procesarCodigo(texto);
      }
    } catch (e) {}
  }, 250);
}

function pararLoop() {
  if (scanLoop) {
    clearInterval(scanLoop);
    scanLoop = null;
  }
  cooldown = false;
}

/* ── Fallback: input file capture para Safari iOS < 17 ── */
let inputCaptura = null;
function mostrarBotonCaptura() {
  // Crear input oculto si no existe
  if (!inputCaptura) {
    inputCaptura = document.createElement("input");
    inputCaptura.type = "file";
    inputCaptura.accept = "image/*";
    inputCaptura.capture = "environment";
    inputCaptura.style.display = "none";
    document.body.appendChild(inputCaptura);

    inputCaptura.addEventListener("change", async () => {
      const file = inputCaptura.files[0];
      if (!file) return;
      camStatus.textContent = "Procesando imagen...";
      await leerCodigoDeImagen(file);
      inputCaptura.value = ""; // reset para permitir escanear de nuevo
    });
  }

  // Botón visible para disparar la captura
  let btnCaptura = document.getElementById("btnCaptura");
  if (!btnCaptura) {
    btnCaptura = document.createElement("button");
    btnCaptura.id = "btnCaptura";
    btnCaptura.textContent = "📸 Escanear código";
    btnCaptura.style.cssText = `
      padding:12px 24px; font-size:16px; background:#6A1B9A;
      color:white; border:none; border-radius:8px; cursor:pointer; margin-top:4px;`;
    btnCaptura.addEventListener("click", () => inputCaptura.click());
    document.querySelector(".camBotones").appendChild(btnCaptura);
  }
  btnCaptura.style.display = "inline-flex";
}

async function leerCodigoDeImagen(file) {
  if (!soportaBarcodeDetector) {
    camStatus.textContent =
      "⚠️ Tu navegador no soporta escaneo automático. Usa el escáner físico.";
    return;
  }
  try {
    const bitmap = await createImageBitmap(file);
    const det = await crearDetector();
    const resultados = await det.detect(bitmap);
    if (resultados.length > 0) {
      const texto = resultados[0].rawValue;
      codigoDetectadoEl.textContent = "🔍 " + texto;
      flashOk.classList.add("show");
      setTimeout(() => flashOk.classList.remove("show"), 300);
      procesarCodigo(texto);
      camStatus.textContent = "✅ Código leído — vuelve a escanear para el 2do";
    } else {
      camStatus.textContent = "⚠️ No se detectó código, intenta de nuevo";
    }
  } catch (e) {
    camStatus.textContent = "⚠️ Error al leer imagen: " + e.message;
  }
}

function detenerCamara() {
  pararLoop();
  if (streamActual) {
    streamActual.getTracks().forEach((t) => t.stop());
    streamActual = null;
  }
  videoElement.srcObject = null;
  codigoDetectadoEl.textContent = "";
  const btnCaptura = document.getElementById("btnCaptura");
  if (btnCaptura) btnCaptura.style.display = "none";
}

btnModoTelefono.addEventListener("click", () => {
  camaraActiva = !camaraActiva;
  if (camaraActiva) {
    camaraPanel.classList.add("visible");
    btnModoTelefono.textContent = "❌ Cerrar Modo Teléfono";
    btnModoTelefono.style.backgroundColor = "#b71c1c";
    iniciarCamara(facingMode);
  } else {
    camaraPanel.classList.remove("visible");
    btnModoTelefono.textContent = "📱 Modo Teléfono";
    btnModoTelefono.style.backgroundColor = "";
    detenerCamara();
    camStatus.textContent = "Iniciando cámara...";
  }
});

btnCambiarCamara.addEventListener("click", () => {
  facingMode = facingMode === "environment" ? "user" : "environment";
  iniciarCamara(facingMode);
});
