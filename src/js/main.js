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
   MODO TELÉFONO — Safari iOS (input capture)
═══════════════════════════════════════ */
const btnModoTelefono  = document.getElementById("btnModoTelefono");
const camaraPanel      = document.getElementById("camaraPanel");
const camStatus        = document.getElementById("camStatus");
const flashOk          = document.getElementById("flashOk");
const codigoDetectadoEl= document.getElementById("codigoDetectado");

let camaraActiva = false;

// Crear input de captura oculto
const inputCaptura = document.createElement("input");
inputCaptura.type    = "file";
inputCaptura.accept  = "image/*";
inputCaptura.capture = "environment";
inputCaptura.style.display = "none";
document.body.appendChild(inputCaptura);

// Botón escanear que dispara la cámara nativa
const btnEscanearCamara = document.createElement("button");
btnEscanearCamara.id = "btnEscanearCamara";
btnEscanearCamara.style.cssText = `
  padding:14px 28px; font-size:clamp(16px,4vw,20px);
  background:#6A1B9A; color:white; border:none;
  border-radius:10px; cursor:pointer; width:min(280px,90%);
  margin-top:6px;`;

function actualizarBotonEscanear() {
  btnEscanearCamara.textContent = !codigo1 ? "📸 Escanear 1er código" : "📸 Escanear 2do código";
}
actualizarBotonEscanear();

btnEscanearCamara.addEventListener("click", () => inputCaptura.click());

// Procesar foto tomada con la cámara nativa
inputCaptura.addEventListener("change", async () => {
  const file = inputCaptura.files[0];
  if (!file) return;

  camStatus.textContent = "Leyendo código...";

  try {
    const bitmap = await createImageBitmap(file);
    const detector = new BarcodeDetector({
      formats: ["code_128","code_39","ean_13","ean_8",
                "upc_a","upc_e","qr_code","data_matrix","itf","codabar"]
    });
    const resultados = await detector.detect(bitmap);

    if (resultados.length > 0) {
      const texto = resultados[0].rawValue;
      codigoDetectadoEl.textContent = "🔍 " + texto;
      flashOk.classList.add("show");
      setTimeout(() => flashOk.classList.remove("show"), 300);
      procesarCodigo(texto);
      actualizarBotonEscanear();
      camStatus.textContent = !codigo1
        ? "✅ Listo — escanea el 2do código"
        : "✅ Listo — escanea otro par";
    } else {
      camStatus.textContent = "⚠️ No se detectó código, intenta acercarte más";
    }
  } catch(e) {
    // BarcodeDetector no disponible — pedir código manual
    camStatus.textContent = "⚠️ Escáner no soportado, ingresa el código manualmente";
    console.error(e);
  }

  inputCaptura.value = ""; // reset para poder volver a escanear
});

btnModoTelefono.addEventListener("click", () => {
  camaraActiva = !camaraActiva;
  if (camaraActiva) {
    camaraPanel.classList.add("visible");
    btnModoTelefono.textContent = "❌ Cerrar Modo Teléfono";
    btnModoTelefono.style.backgroundColor = "#b71c1c";
    // Insertar botón escanear en el panel
    document.querySelector(".camBotones").appendChild(btnEscanearCamara);
    camStatus.textContent = "Presiona el botón para abrir la cámara";
  } else {
    camaraPanel.classList.remove("visible");
    btnModoTelefono.textContent = "📱 Modo Teléfono";
    btnModoTelefono.style.backgroundColor = "";
    camStatus.textContent = "";
  }
});

// Ocultar el video y el botón cambiar cámara (no aplican en este modo)
document.getElementById("videoElement").style.display = "none";
document.getElementById("btnCambiarCamara").style.display = "none";
document.getElementById("mira").style.display = "none";
document.getElementById("scanLine").style.display = "none";