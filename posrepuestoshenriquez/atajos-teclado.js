// =========================================================
// Atajos de teclado para Facturación (F1–F10)
// Independiente de facturacion.js — solo simula clics en los
// botones que ya existen, usando los mismos data-attributes
// que usa tu código.
//
// Pega este <script> DESPUÉS de facturacion.js en facturacion.html
// =========================================================

// Agrega un pequeño "(F1)", "(F2)"... visible junto al texto de cada botón,
// para que se sepa qué tecla usar sin tener que memorizarlas.
(function agregarPistasVisuales() {
  const mapa = [
    ['#pagoToggle .toggle-btn[data-pago="Efectivo"]', "F1"],
    ['#pagoToggle .toggle-btn[data-pago="Tarjeta Crédito"]', "F2"],
    ['#pagoToggle .toggle-btn[data-pago="Transferencia"]', "F3"],
    ['#pagoToggle .toggle-btn[data-pago="Cheque"]', "F4"],
    ['#condicionToggle .toggle-btn[data-condicion="Contado"]', "F5"],
    ['#condicionToggle .toggle-btn[data-condicion="Crédito"]', "F6"],
    ["#btnGenerarFactura", "F7"],
    ["#btnAbrirAbono", "F8"],
    ["#btnAbrirNuevoCliente", "F9"],
    ["#btnAbrirBuscarFactura", "F10"]
  ];

  // Nota: #buscadorProd es un <input>, su pista (F11) ya viene escrita
  // directamente en el placeholder del HTML.

  mapa.forEach(([selector, tecla]) => {
    const el = document.querySelector(selector);
    if (el && !el.querySelector(".atajo-hint")) {
      const hint = document.createElement("span");
      hint.className = "atajo-hint";
      hint.textContent = " (" + tecla + ")";
      hint.style.opacity = "0.75";
      hint.style.fontSize = "0.85em";
      el.appendChild(hint);
    }
  });
})();

document.addEventListener("keydown", (e) => {
  const teclasUsadas = ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11"];
  if (!teclasUsadas.includes(e.key)) return;

  e.preventDefault(); // evita que el navegador use F1 (ayuda), F5 (recargar), etc.

  switch (e.key) {
    case "F1":
      document.querySelector('#pagoToggle .toggle-btn[data-pago="Efectivo"]')?.click();
      break;
    case "F2":
      document.querySelector('#pagoToggle .toggle-btn[data-pago="Tarjeta Crédito"]')?.click();
      break;
    case "F3":
      document.querySelector('#pagoToggle .toggle-btn[data-pago="Transferencia"]')?.click();
      break;
    case "F4":
      document.querySelector('#pagoToggle .toggle-btn[data-pago="Cheque"]')?.click();
      break;
    case "F5":
      document.querySelector('#condicionToggle .toggle-btn[data-condicion="Contado"]')?.click();
      break;
    case "F6":
      document.querySelector('#condicionToggle .toggle-btn[data-condicion="Crédito"]')?.click();
      break;
    case "F7":
      document.getElementById("btnGenerarFactura")?.click();
      break;
    case "F8":
      document.getElementById("btnAbrirAbono")?.click();
      break;
    case "F9":
      document.getElementById("btnAbrirNuevoCliente")?.click();
      break;
    case "F10":
      document.getElementById("btnAbrirBuscarFactura")?.click();
      break;
    case "F11": {
      const campoBuscarProd = document.getElementById("buscadorProd");
      if (campoBuscarProd) {
        campoBuscarProd.focus();
        campoBuscarProd.select();
      }
      break;
    }
  }
});
