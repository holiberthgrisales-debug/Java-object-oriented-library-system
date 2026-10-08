// gestor de tablas interactivas moderno y optimizado con simple-datatables
const datatableInstances = {};

/* *
 * destruye una instancia de datatable si existe, eliminando la referencia limpia
 * @param {string} tableid id de la tabla html
 */
function destruirTablaExcel(tableId) {
    if (datatableInstances[tableId]) {
        try {
            datatableInstances[tableId].destroy();
        } catch (e) {
            console.warn('Destruyendo tabla:', tableId);
        }
        delete datatableInstances[tableId];
    }
}

/* *
 * inicializa una tabla interactiva con ordenamiento y paginacion fija
 * @param {string} tableid id de la tabla html
 */
function registrarTablaExcel(tableId) {
    const table = document.getElementById(tableId);
    if (!table || typeof simpleDatatables === 'undefined') return;

    // si la tabla ya esta envuelta por simple-datatables y tiene instancia activa, destruirla
    if (datatableInstances[tableId]) {
        delete datatableInstances[tableId];
    }

    const tbody = table.querySelector('tbody');
    if (!tbody || tbody.children.length === 0) return;

    // verificar si es una fila de estado vacio
    if (tbody.querySelector('.search-empty-state')) return;

    try {
        datatableInstances[tableId] = new simpleDatatables.DataTable(table, {
            searchable: false, // quitar barras de busqueda internas redundantes
            sortable: true,   // mantener ordenamiento por columnas (▲/▼)
            perPage: 15,      // 15 filas fijas
            perPageSelect: false, // sin selector para modificar la cantidad de filas
            labels: {
                noRows: "No hay registros disponibles",
                info: "Mostrando {start} a {end} de {rows} registros",
                noResults: "No se encontraron coincidencias"
            }
        });

        // actualizar iconos lucide en los botones de la tabla
        datatableInstances[tableId].on('datatable.page', () => {
            if (typeof lucide !== 'undefined') lucide.createIcons();
        });
        datatableInstances[tableId].on('datatable.sort', () => {
            if (typeof lucide !== 'undefined') lucide.createIcons();
        });

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (err) {
        console.error('Error al inicializar Simple-DataTables en ' + tableId, err);
    }
}

function limpiarTodosFiltrosExcel(tableId) {
    if (datatableInstances[tableId]) {
        datatableInstances[tableId].search('');
    }
}

window.registrarTablaExcel = registrarTablaExcel;
window.destruirTablaExcel = destruirTablaExcel;
window.limpiarTodosFiltrosExcel = limpiarTodosFiltrosExcel;
