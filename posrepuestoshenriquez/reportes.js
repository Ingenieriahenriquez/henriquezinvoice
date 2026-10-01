verificarAccesoModulo(["reportes"]);

const fechaDesde = document.getElementById("fechaDesde");
const fechaHasta = document.getElementById("fechaHasta");

const hoy = new Date();
const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
fechaDesde.value = primerDiaMes.toISOString().slice(0, 10);
fechaHasta.value = hoy.toISOString().slice(0, 10);

// Datos cargados, usados también para exportar
let datosReporte = {
  facturas: [],
  porFormaPago: [],
  masVendidos: [],
  inventarioBajo: [],
  cuentasCobrar: [],
  cuentasPagar: []
};

document.getElementById("btnActualizar").addEventListener("click", cargarTodo);

async function cargarTodo() {
  const desde = fechaDesde.value;
  const hasta = fechaHasta.value;
  if (!desde || !hasta) return;

  document.getElementById("tituloImpresion").innerHTML = `
    <h1>Ingeniería & Tecnología Henríquez</h1>
    <p>Reporte del ${new Date(desde + "T00:00:00").toLocaleDateString("es-DO")} al ${new Date(hasta + "T00:00:00").toLocaleDateString("es-DO")}</p>
  `;

  await cargarVentas(desde, hasta);
  await cargarInventario();
  await cargarCuentasCobrar();
  await cargarCuentasPagar();
}

// ================= VENTAS =================
async function cargarVentas(desde, hasta) {
  const { data: facturas, error } = await supabaseClient
    .from("facturas")
    .select("*")
    .eq("estado", "activa")
    .gte("creado_en", desde + "T00:00:00")
    .lte("creado_en", hasta + "T23:59:59");

  if (error || !facturas) return;
  datosReporte.facturas = facturas;

  const total = facturas.reduce((acc, f) => acc + Number(f.total), 0);
  const cantidad = facturas.length;
  const promedio = cantidad > 0 ? total / cantidad : 0;

  document.getElementById("cifraTotalVentas").textContent = "$" + total.toFixed(2);
  document.getElementById("cifraCantFacturas").textContent = cantidad;
  document.getElementById("cifraPromedio").textContent = "$" + promedio.toFixed(2);

  const porForma = {};
  facturas.forEach((f) => {
    if (!porForma[f.forma_pago]) porForma[f.forma_pago] = { cantidad: 0, total: 0 };
    porForma[f.forma_pago].cantidad += 1;
    porForma[f.forma_pago].total += Number(f.total);
  });

  datosReporte.porFormaPago = Object.entries(porForma).map(([forma, v]) => ({ forma, ...v }));

  const cuerpoFormaPago = document.getElementById("cuerpoFormaPago");
  cuerpoFormaPago.innerHTML = "";
  if (datosReporte.porFormaPago.length === 0) {
    cuerpoFormaPago.innerHTML = "<tr><td colspan='3' class='sin-datos'>Sin ventas en este período.</td></tr>";
  } else {
    datosReporte.porFormaPago.forEach((r) => {
      const fila = document.createElement("tr");
      fila.innerHTML = `<td>${r.forma}</td><td>${r.cantidad}</td><td>$${r.total.toFixed(2)}</td>`;
      cuerpoFormaPago.appendChild(fila);
    });
  }

  // Productos más vendidos: se calcula a partir de factura_items de las facturas del período
  const idsFacturas = facturas.map((f) => f.id);
  let itemsVendidos = [];
  if (idsFacturas.length > 0) {
    const { data: items } = await supabaseClient
      .from("factura_items")
      .select("*")
      .in("factura_id", idsFacturas);
    itemsVendidos = items || [];
  }

  const porProducto = {};
  itemsVendidos.forEach((it) => {
    const clave = it.descripcion;
    if (!porProducto[clave]) porProducto[clave] = { cantidad: 0, total: 0 };
    porProducto[clave].cantidad += it.cantidad;
    porProducto[clave].total += Number(it.subtotal);
  });

  const listaProductos = Object.entries(porProducto)
    .map(([descripcion, v]) => ({ descripcion, ...v }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 10);

  datosReporte.masVendidos = listaProductos;

  const cuerpoMasVendidos = document.getElementById("cuerpoMasVendidos");
  cuerpoMasVendidos.innerHTML = "";
  if (listaProductos.length === 0) {
    cuerpoMasVendidos.innerHTML = "<tr><td colspan='4' class='sin-datos'>Sin ventas en este período.</td></tr>";
  } else {
    listaProductos.forEach((p, i) => {
      const fila = document.createElement("tr");
      fila.innerHTML = `<td>${i + 1}</td><td>${p.descripcion}</td><td>${p.cantidad}</td><td>$${p.total.toFixed(2)}</td>`;
      cuerpoMasVendidos.appendChild(fila);
    });
  }
}

// ================= INVENTARIO =================
async function cargarInventario() {
  const { data: productos, error } = await supabaseClient
    .from("productos")
    .select("*")
    .order("existencia", { ascending: true });

  if (error || !productos) return;

  const bajoOAgotado = productos.filter((p) => p.existencia <= p.stock_minimo);
  datosReporte.inventarioBajo = bajoOAgotado;

  const cuerpoInventario = document.getElementById("cuerpoInventario");
  cuerpoInventario.innerHTML = "";
  if (bajoOAgotado.length === 0) {
    cuerpoInventario.innerHTML = "<tr><td colspan='5' class='sin-datos'>Todo el inventario está en niveles saludables.</td></tr>";
  } else {
    bajoOAgotado.forEach((p) => {
      const fila = document.createElement("tr");
      const tag = p.existencia === 0 ? `<span class="tag-agotado">Agotado</span>` : `<span class="tag-bajo">Stock Bajo</span>`;
      fila.innerHTML = `<td>${p.descripcion}</td><td>${p.marca || "—"}</td><td>${p.existencia}</td><td>${p.stock_minimo}</td><td>${tag}</td>`;
      cuerpoInventario.appendChild(fila);
    });
  }
}

// ================= CUENTAS POR COBRAR =================
async function cargarCuentasCobrar() {
  const { data: facturas, error } = await supabaseClient
    .from("facturas")
    .select("*")
    .eq("forma_pago", "Crédito")
    .eq("estado", "activa");

  if (error || !facturas) return;

  const pendientes = facturas.filter((f) => Number(f.total) - Number(f.monto_abonado) > 0.01);
  datosReporte.cuentasCobrar = pendientes;

  const cuerpoCobrar = document.getElementById("cuerpoCobrar");
  cuerpoCobrar.innerHTML = "";
  if (pendientes.length === 0) {
    cuerpoCobrar.innerHTML = "<tr><td colspan='6' class='sin-datos'>No hay cuentas por cobrar pendientes.</td></tr>";
  } else {
    pendientes.forEach((f) => {
      const saldo = Number(f.total) - Number(f.monto_abonado);
      const dias = Math.floor((new Date() - new Date(f.creado_en)) / (1000 * 60 * 60 * 24));
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${f.cliente_nombre}</td>
        <td>#${f.numero_secuencial}</td>
        <td>$${Number(f.total).toFixed(2)}</td>
        <td>$${Number(f.monto_abonado).toFixed(2)}</td>
        <td class="monto-rojo">$${saldo.toFixed(2)}</td>
        <td>${dias} días</td>
      `;
      cuerpoCobrar.appendChild(fila);
    });
  }
}

// ================= CUENTAS POR PAGAR =================
async function cargarCuentasPagar() {
  const { data: cuentas, error } = await supabaseClient
    .from("cuentas_pagar")
    .select("*")
    .eq("estado", "pendiente");

  if (error || !cuentas) return;
  datosReporte.cuentasPagar = cuentas;

  const cuerpoPagar = document.getElementById("cuerpoPagar");
  cuerpoPagar.innerHTML = "";
  if (cuentas.length === 0) {
    cuerpoPagar.innerHTML = "<tr><td colspan='6' class='sin-datos'>No hay cuentas por pagar pendientes.</td></tr>";
  } else {
    cuentas.forEach((c) => {
      const saldo = Number(c.monto) - Number(c.monto_pagado);
      const vence = c.fecha_vencimiento ? new Date(c.fecha_vencimiento + "T00:00:00").toLocaleDateString("es-DO") : "—";
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${c.proveedor_nombre}</td>
        <td>${c.ncf || "—"}</td>
        <td>${vence}</td>
        <td>$${Number(c.monto).toFixed(2)}</td>
        <td>$${Number(c.monto_pagado).toFixed(2)}</td>
        <td class="monto-rojo">$${saldo.toFixed(2)}</td>
      `;
      cuerpoPagar.appendChild(fila);
    });
  }
}

// ================= EXPORTAR A PDF (impresión) =================
document.getElementById("btnExportarPdf").addEventListener("click", () => window.print());

// ================= EXPORTAR A EXCEL (CSV) =================
document.getElementById("btnExportarExcel").addEventListener("click", () => {
  let csv = "";

  csv += "REPORTE INGENIERIA Y TECNOLOGIA HENRIQUEZ\n";
  csv += "Periodo," + fechaDesde.value + " a " + fechaHasta.value + "\n\n";

  csv += "RESUMEN DE VENTAS\n";
  csv += "Total Facturado," + document.getElementById("cifraTotalVentas").textContent + "\n";
  csv += "Cantidad de Facturas," + document.getElementById("cifraCantFacturas").textContent + "\n";
  csv += "Ticket Promedio," + document.getElementById("cifraPromedio").textContent + "\n\n";

  csv += "DESGLOSE POR FORMA DE PAGO\n";
  csv += "Forma de Pago,Cantidad,Total\n";
  datosReporte.porFormaPago.forEach((r) => {
    csv += `"${r.forma}",${r.cantidad},${r.total.toFixed(2)}\n`;
  });
  csv += "\n";

  csv += "PRODUCTOS MAS VENDIDOS\n";
  csv += "Producto,Cantidad Vendida,Total Generado\n";
  datosReporte.masVendidos.forEach((p) => {
    csv += `"${p.descripcion}",${p.cantidad},${p.total.toFixed(2)}\n`;
  });
  csv += "\n";

  csv += "INVENTARIO - STOCK BAJO Y AGOTADO\n";
  csv += "Producto,Marca,Existencia,Stock Minimo\n";
  datosReporte.inventarioBajo.forEach((p) => {
    csv += `"${p.descripcion}","${p.marca || ""}",${p.existencia},${p.stock_minimo}\n`;
  });
  csv += "\n";

  csv += "CUENTAS POR COBRAR PENDIENTES\n";
  csv += "Cliente,Factura,Total,Abonado,Saldo\n";
  datosReporte.cuentasCobrar.forEach((f) => {
    const saldo = Number(f.total) - Number(f.monto_abonado);
    csv += `"${f.cliente_nombre}",#${f.numero_secuencial},${Number(f.total).toFixed(2)},${Number(f.monto_abonado).toFixed(2)},${saldo.toFixed(2)}\n`;
  });
  csv += "\n";

  csv += "CUENTAS POR PAGAR PENDIENTES\n";
  csv += "Proveedor,NCF,Monto,Pagado,Saldo\n";
  datosReporte.cuentasPagar.forEach((c) => {
    const saldo = Number(c.monto) - Number(c.monto_pagado);
    csv += `"${c.proveedor_nombre}","${c.ncf || ""}",${Number(c.monto).toFixed(2)},${Number(c.monto_pagado).toFixed(2)},${saldo.toFixed(2)}\n`;
  });

  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reporte_" + fechaDesde.value + "_a_" + fechaHasta.value + ".csv";
  a.click();
  URL.revokeObjectURL(url);
});

cargarTodo();
