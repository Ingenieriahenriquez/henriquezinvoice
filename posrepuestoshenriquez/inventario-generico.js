// =========================================================
// Inventario genérico — cambia las ETIQUETAS visibles según el
// tipo de negocio guardado en Configuración. No toca la base de
// datos ni los nombres de columnas (marca, modelo, anio_vehiculo,
// referencia siguen siendo los mismos por dentro).
//
// Pega este <script> DESPUÉS de inventario.js en inventario.html.
// =========================================================

const ETIQUETAS_POR_RUBRO = {
  repuestos_vehiculos: {
    marca: "Marca",
    modelo: "Modelo",
    anio_vehiculo: "Año del vehículo",
    referencia: "Referencia"
  },
  repuestos_motos: {
    marca: "Marca",
    modelo: "Modelo",
    anio_vehiculo: "Año de la motocicleta",
    referencia: "Referencia"
  },
  farmacia: {
    marca: "Laboratorio / Fabricante",
    modelo: "Presentación",
    anio_vehiculo: "Fecha de vencimiento",
    referencia: "Lote"
  },
  supermercado: {
    marca: "Marca",
    modelo: "Presentación / Tamaño",
    anio_vehiculo: "Fecha de vencimiento",
    referencia: "Unidad de medida"
  },
  generico: {
    marca: "Marca (opcional)",
    modelo: "Modelo / Variante (opcional)",
    anio_vehiculo: "Dato adicional 1",
    referencia: "Dato adicional 2"
  }
};

(async function aplicarEtiquetasSegunRubro() {
  const { data, error } = await supabaseClient
    .from("configuracion")
    .select("tipo_negocio")
    .eq("id", 1)
    .single();

  const rubro = (!error && data && data.tipo_negocio) ? data.tipo_negocio : "repuestos_vehiculos";
  const etiquetas = ETIQUETAS_POR_RUBRO[rubro] || ETIQUETAS_POR_RUBRO.repuestos_vehiculos;

  // Placeholders del formulario "Agregar Producto"
  const inputMarca = document.getElementById("marca");
  const inputModelo = document.getElementById("modelo");
  const inputAnio = document.getElementById("anio_vehiculo");
  const inputReferencia = document.getElementById("referencia");

  if (inputMarca) inputMarca.placeholder = etiquetas.marca;
  if (inputModelo) inputModelo.placeholder = etiquetas.modelo;
  if (inputAnio) inputAnio.placeholder = etiquetas.anio_vehiculo;
  if (inputReferencia) inputReferencia.placeholder = etiquetas.referencia;

  // Encabezados de la tabla (2ª y 3ª columna: Marca, Modelo)
  const encabezados = document.querySelectorAll("#tablaProductos thead th");
  if (encabezados.length >= 3) {
    encabezados[1].textContent = etiquetas.marca.split(" (")[0].split(" / ")[0];
    encabezados[2].textContent = etiquetas.modelo.split(" (")[0].split(" / ")[0];
  }
})();
