verificarAccesoModulo(["inventario", "producto"]);

const form = document.getElementById("formProducto");
const cuerpoTabla = document.getElementById("cuerpoTabla");
const mensajeForm = document.getElementById("mensajeForm");
const buscador = document.getElementById("buscador");

let productosCache = [];

async function cargarProductos() {
  const { data, error } = await supabaseClient
    .from("productos")
    .select("*")
    .order("creado_en", { ascending: false });

  if (error) {
    mensajeForm.textContent = "Error al cargar: " + error.message;
    return;
  }
  productosCache = data;
  renderTabla(productosCache);
}

function renderTabla(lista) {
  cuerpoTabla.innerHTML = "";
  lista.forEach((p) => {
    const fila = document.createElement("tr");
    if (p.existencia <= p.stock_minimo) fila.classList.add("stock-bajo");
    fila.innerHTML = `
      <td>${p.descripcion}</td>
      <td>${p.marca || ""}</td>
      <td>${p.modelo || ""}</td>
      <td>${p.referencia || ""}</td>
      <td>${p.codigo_manual || p.codigo_barras || ""}</td>
      <td>$${Number(p.precio_venta).toFixed(2)}</td>
      <td>${p.existencia}</td>
      <td><button class="btn-eliminar" data-id="${p.id}">Eliminar</button></td>
    `;
    cuerpoTabla.appendChild(fila);
  });

  document.querySelectorAll(".btn-eliminar").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (confirm("¿Eliminar este producto?")) {
        await supabaseClient.from("productos").delete().eq("id", btn.dataset.id);
        cargarProductos();
      }
    });
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  mensajeForm.textContent = "";

  const nuevoProducto = {
    descripcion: document.getElementById("descripcion").value,
    marca: document.getElementById("marca").value,
    modelo: document.getElementById("modelo").value,
    anio_vehiculo: document.getElementById("anio_vehiculo").value,
    referencia: document.getElementById("referencia").value,
    codigo_manual: document.getElementById("codigo_manual").value,
    codigo_barras: document.getElementById("codigo_barras").value,
    categoria: document.getElementById("categoria").value,
    precio_costo: parseFloat(document.getElementById("precio_costo").value) || 0,
    precio_venta: parseFloat(document.getElementById("precio_venta").value) || 0,
    existencia: parseInt(document.getElementById("existencia").value) || 0,
    stock_minimo: parseInt(document.getElementById("stock_minimo").value) || 0
  };

  const { error } = await supabaseClient.from("productos").insert(nuevoProducto);

  if (error) {
    mensajeForm.textContent = "Error: " + error.message;
  } else {
    form.reset();
    cargarProductos();
  }
});

buscador.addEventListener("input", () => {
  const texto = buscador.value.toLowerCase();
  const filtrados = productosCache.filter((p) =>
    (p.descripcion || "").toLowerCase().includes(texto) ||
    (p.marca || "").toLowerCase().includes(texto) ||
    (p.referencia || "").toLowerCase().includes(texto) ||
    (p.codigo_manual || "").toLowerCase().includes(texto) ||
    (p.codigo_barras || "").toLowerCase().includes(texto)
  );
  renderTabla(filtrados);
});

cargarProductos();
