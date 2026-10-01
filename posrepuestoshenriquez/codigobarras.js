verificarAccesoModulo(["codigobarras"]);

const buscadorCB = document.getElementById("buscadorCB");
const resultadosCB = document.getElementById("resultadosCB");
const sinSeleccion = document.getElementById("sinSeleccion");
const etiquetaContenedor = document.getElementById("etiquetaContenedor");
const etNombre = document.getElementById("etNombre");
const etPrecio = document.getElementById("etPrecio");
const btnImprimir = document.getElementById("btnImprimir");
const cantidadEtiquetas = document.getElementById("cantidadEtiquetas");
const areaImprimir = document.getElementById("areaImprimir");

let productoSeleccionado = null;

buscadorCB.addEventListener("input", async () => {
  const texto = buscadorCB.value.trim();
  resultadosCB.innerHTML = "";
  if (texto.length < 2) return;

  const { data, error } = await supabaseClient
    .from("productos")
    .select("*")
    .or(`descripcion.ilike.%${texto}%,marca.ilike.%${texto}%,codigo_manual.ilike.%${texto}%,codigo_barras.ilike.%${texto}%`)
    .limit(10);

  if (error) {
    resultadosCB.innerHTML = "Error: " + error.message;
    return;
  }

  data.forEach((p) => {
    const div = document.createElement("div");
    div.className = "resultado-item";
    div.innerHTML = `<strong>${p.descripcion}</strong><br>${p.marca || ""} — $${Number(p.precio_venta).toFixed(2)}`;
    div.addEventListener("click", () => seleccionarProducto(p));
    resultadosCB.appendChild(div);
  });
});

async function seleccionarProducto(producto) {
  productoSeleccionado = producto;

  if (!producto.codigo_barras) {
    const nuevoCodigo = "784" + Date.now().toString().slice(-10);
    const { error } = await supabaseClient
      .from("productos")
      .update({ codigo_barras: nuevoCodigo })
      .eq("id", producto.id);
    if (!error) producto.codigo_barras = nuevoCodigo;
  }

  sinSeleccion.style.display = "none";
  etiquetaContenedor.style.display = "block";
  etNombre.textContent = producto.descripcion;
  etPrecio.textContent = "$" + Number(producto.precio_venta).toFixed(2);
  cantidadEtiquetas.value = 1;

  JsBarcode("#etBarcode", producto.codigo_barras, {
    format: "CODE128",
    width: 2,
    height: 60,
    displayValue: true,
    fontSize: 14
  });
}

btnImprimir.addEventListener("click", () => {
  if (!productoSeleccionado) return;

  const cantidad = Math.max(1, parseInt(cantidadEtiquetas.value) || 1);
  areaImprimir.innerHTML = "";

  for (let i = 0; i < cantidad; i++) {
    const etiqueta = document.createElement("div");
    etiqueta.className = "etiqueta-print";
    etiqueta.innerHTML = `
      <p class="et-nombre">${productoSeleccionado.descripcion}</p>
      <svg class="barcode-copia"></svg>
      <p class="et-precio">$${Number(productoSeleccionado.precio_venta).toFixed(2)}</p>
    `;
    areaImprimir.appendChild(etiqueta);
  }

  JsBarcode(".barcode-copia", productoSeleccionado.codigo_barras, {
    format: "CODE128",
    width: 1.6,
    height: 45,
    displayValue: true,
    fontSize: 11
  });

  window.print();
});
