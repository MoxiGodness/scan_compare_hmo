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
      result.textContent = "❌ Los códigos NO coinciden (" + codigo1 + " ≠ " + codigo2 + ")";
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
       MODO TELÉFONO — CÁMARA + ZXING
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
let lector = null; // instancia ZXing
let escaneando = false; // para evitar doble disparo
let cooldown = false; // pausa entre escaneos

async function iniciarCamara(facing) {
  // Parar stream y lector anteriores
  pararLector();
  if (streamActual) {
    streamActual.getTracks().forEach((t) => t.stop());
    streamActual = null;
  }

  camStatus.textContent = "Iniciando cámara...";
  codigoDetectadoEl.textContent = "";

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

    // Esperar a que el video esté listo antes de iniciar ZXing
    videoElement.onloadedmetadata = () => {
      camStatus.textContent =
        facing === "environment"
          ? "📷 Cámara trasera — apunta al código"
          : "🤳 Cámara frontal — apunta al código";
      iniciarLector();
    };
  } catch (err) {
    camStatus.textContent = "⚠️ No se pudo acceder a la cámara: " + err.message;
    console.error(err);
  }
}

function iniciarLector() {
  // ZXing MultiFormatReader: soporta Code128, EAN, QR, etc.
  const hints = new Map();
  const formatos = [
    ZXing.BarcodeFormat.CODE_128,
    ZXing.BarcodeFormat.CODE_39,
    ZXing.BarcodeFormat.EAN_13,
    ZXing.BarcodeFormat.EAN_8,
    ZXing.BarcodeFormat.UPC_A,
    ZXing.BarcodeFormat.UPC_E,
    ZXing.BarcodeFormat.QR_CODE,
    ZXing.BarcodeFormat.DATA_MATRIX,
    ZXing.BarcodeFormat.ITF,
    ZXing.BarcodeFormat.CODABAR,
  ];
  hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formatos);
  hints.set(ZXing.DecodeHintType.TRY_HARDER, true);

  lector = new ZXing.BrowserMultiFormatReader(hints, 200); // escanea cada 200ms

  lector.decodeFromVideoElement(videoElement, (resultado, error) => {
    if (resultado && !cooldown) {
      const texto = resultado.getText();
      codigoDetectadoEl.textContent = "🔍 " + texto;

      // Flash visual
      flashOk.classList.add("show");
      setTimeout(() => flashOk.classList.remove("show"), 180);

      // Cooldown para no escanear el mismo código mil veces
      cooldown = true;
      setTimeout(() => {
        cooldown = false;
      }, 1800);

      // Enviar al comparador
      procesarCodigo(texto);
    }
    // Los errores de "no encontrado" son normales, los ignoramos
  });
}

function pararLector() {
  if (lector) {
    try {
      lector.reset();
    } catch (e) {}
    lector = null;
  }
  cooldown = false;
}

function detenerCamara() {
  pararLector();
  if (streamActual) {
    streamActual.getTracks().forEach((t) => t.stop());
    streamActual = null;
  }
  videoElement.srcObject = null;
  codigoDetectadoEl.textContent = "";
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
