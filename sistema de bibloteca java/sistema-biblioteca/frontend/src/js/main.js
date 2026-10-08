// funciones principales de la aplicacion
// si se corre bajo vite dev server (puerto 5173), redirige al backend en puerto 3001.
// si se sirve directamente desde javalin (puerto 3001 o produccion), usa rutas relativas directas.
const API_URL = (typeof window !== 'undefined' && window.location && window.location.port === '5173')
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : '';
window.API_URL = API_URL;

// escapa caracteres especiales para evitar xss
const MAPA_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, c => MAPA_ESC[c]);
}
window.esc = esc;

// sanitiza urls para enlaces forzando estrictamente protocolos seguros http/https (previene ataques xss via javascript:)
function safeUrl(url) {
    if (!url) return null;
    const str = String(url).trim();
    if (/^https?:\/\//i.test(str)) {
        return esc(str);
    }
    return null;
}
window.safeUrl = safeUrl;

// peticiones al backend
async function api(endpoint, method = 'GET', data = null) {
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (data) options.body = JSON.stringify(data);
    const res = await fetch(`${API_URL}${endpoint}`, options);
    if (!res.ok) throw new Error(await res.text());
    return res.headers.get('content-type')?.includes('application/json') ? res.json() : res.text();
}
window.api = api;

// formato de fechas
function formatFecha(f) {
    if (!f) return '-';
    if (Array.isArray(f)) {
        const [y, m, d] = f;
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return String(f).split('T')[0];
}
window.formatFecha = formatFecha;

// suma dias a una fecha en los inputs
function sumarDiasFecha(inputId, dias) {
    const el = document.getElementById(inputId);
    if (!el) return;
    const base = el.value ? new Date(el.value + 'T00:00:00') : new Date();
    base.setDate(base.getDate() + dias);
    el.value = base.toISOString().split('T')[0];
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
}
window.sumarDiasFecha = sumarDiasFecha;

// confirmacion con sweetalert2
async function dialogConfirmar({ title = '¿Estás seguro?', text = '', confirmText = 'Confirmar', cancelText = 'Cancelar', isDanger = true }) {
    if (typeof Swal === 'undefined') {
        return confirm(text ? `${title}\n${text}` : title);
    }
    const theme = obtenerColorTema();
    const res = await Swal.fire({
        title,
        text,
        icon: isDanger ? 'warning' : 'question',
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        customClass: {
            popup: 'cyber-swal',
            title: 'cyber-swal-title',
            htmlContainer: 'cyber-swal-html',
            confirmButton: isDanger ? 'cyber-swal-btn-danger' : 'cyber-swal-btn-primary',
            cancelButton: 'cyber-swal-btn-cancel'
        },
        buttonsStyling: false,
        background: theme.bg,
        color: theme.color
    });
    return res.isConfirmed;
}
window.dialogConfirmar = dialogConfirmar;

// notificacion tipo toast en la esquina
function toastNotificacion(title, icon = 'success', timer = 2500) {
    if (typeof Swal === 'undefined') return;
    const theme = obtenerColorTema();
    Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: timer,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.onmouseenter = Swal.stopTimer;
            toast.onmouseleave = Swal.resumeTimer;
        },
        customClass: { popup: 'cyber-swal-toast' },
        background: theme.bg,
        color: theme.color
    }).fire({ icon, title });
}
window.toastNotificacion = toastNotificacion;

// modal con mensaje de error o aviso
function alertaModal(title, text = '', icon = 'error') {
    if (typeof Swal === 'undefined') {
        alert(text ? `${title}\n${text}` : title);
        return;
    }
    const theme = obtenerColorTema();
    Swal.fire({
        title,
        text,
        icon,
        customClass: {
            popup: 'cyber-swal',
            title: 'cyber-swal-title',
            htmlContainer: 'cyber-swal-html',
            confirmButton: 'cyber-swal-btn-primary'
        },
        buttonsStyling: false,
        background: theme.bg,
        color: theme.color
    });
}
window.alertaModal = alertaModal;

// variables para guardar listas en memoria
let listaLibrosGlobal = [];
let listaUsuariosGlobal = [];
let listaPrestamosGlobal = [];
let filtroActualPrestamos = 'todos';
let temporizadorBusquedaDB = null;
let solicitudBusquedaDB = 0;

window.listaLibrosGlobal = listaLibrosGlobal;
window.listaUsuariosGlobal = listaUsuariosGlobal;
window.listaPrestamosGlobal = listaPrestamosGlobal;
window.filtroActualPrestamos = filtroActualPrestamos;

// cuando carga el documento
document.addEventListener('DOMContentLoaded', () => {
    // buscador del encabezado
    const topInput = document.getElementById('top-global-search');
    window.ejecutarBusquedaDesdeHeader = function () {
        if (!topInput) return;
        const q = topInput.value.trim();
        if (typeof window.navegarASeccion === 'function') {
            window.navegarASeccion('busqueda-db');
        }
        const inputDB = document.getElementById('input-buscar-db');
        if (inputDB) {
            inputDB.value = q;
            inputDB.focus();
            toggleClearButton();
            programarBusquedaDB(true);
        }
    };

    if (topInput) {
        topInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') ejecutarBusquedaDesdeHeader();
        });
        topInput.addEventListener('input', () => {
            if (topInput.value.trim().length > 0 && document.getElementById('busqueda-db')?.classList.contains('active')) {
                const inputDB = document.getElementById('input-buscar-db');
                if (inputDB) {
                    inputDB.value = topInput.value;
                    programarBusquedaDB();
                }
            }
        });
    }

    // envio de formularios
    // guardar o editar libro
    document.getElementById('form-libro')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('l-edit-id')?.value;
        const anioEdicionRaw = document.getElementById('l-anio-edicion')?.value?.trim();
        const datos = {
            titulo: document.getElementById('l-titulo').value.trim(),
            autor: document.getElementById('l-autor').value.trim(),
            isbn: document.getElementById('l-isbn').value.trim(),
            anioPublicacion: parseInt(document.getElementById('l-anio').value, 10),
            edicion: document.getElementById('l-edicion')?.value?.trim() || null,
            anioEdicion: anioEdicionRaw ? parseInt(anioEdicionRaw, 10) : null,
            genero: document.getElementById('l-genero')?.value?.trim() || 'General',
            cantidadDisponible: parseInt(document.getElementById('l-cantidad').value, 10),
            estado: document.getElementById('l-estado')?.value?.trim() || 'Disponible',
            ubicacion: document.getElementById('l-ubicacion')?.value?.trim() || null,
            urlDescarga: document.getElementById('l-url')?.value?.trim() || null
        };

        if (datos.urlDescarga && !/^https?:\/\//i.test(datos.urlDescarga)) {
            alertaModal('URL de Descarga Inválida', 'La URL del libro digital debe comenzar con http:// o https:// para evitar riesgos de seguridad.');
            return;
        }

        try {
            if (editId) {
                await api(`/libros/${editId}`, 'PUT', datos);
                cancelarEdicionLibro();
                toastNotificacion('Libro actualizado con éxito');
            } else {
                await api('/libros', 'POST', datos);
                toastNotificacion('Libro registrado con éxito');
            }
            e.target.reset();
            document.getElementById('l-edit-id').value = '';
            if (window.cargarLibros) await window.cargarLibros();
            if (document.getElementById('busqueda-db')?.classList.contains('active')) {
                if (window.ejecutarBusquedaDB) window.ejecutarBusquedaDB();
            }
        } catch (err) {
            alertaModal('Error al guardar libro', err.message);
        }
    });

    // guardar o editar usuario
    document.getElementById('form-usuario')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('u-edit-id')?.value;
        const datos = {
            identificacion: document.getElementById('u-identificacion').value.trim(),
            nombre: document.getElementById('u-nombre').value.trim(),
            email: document.getElementById('u-email').value.trim(),
            telefono: document.getElementById('u-telefono').value.trim()
        };

        try {
            if (editId) {
                await api(`/usuarios/${editId}`, 'PUT', datos);
                cancelarEdicionUsuario();
                toastNotificacion('Usuario actualizado con éxito');
            } else {
                await api('/usuarios', 'POST', datos);
                toastNotificacion('Usuario registrado con éxito');
            }
            e.target.reset();
            document.getElementById('u-edit-id').value = '';
            if (window.cargarUsuarios) await window.cargarUsuarios();
            if (document.getElementById('busqueda-db')?.classList.contains('active')) {
                if (window.ejecutarBusquedaDB) window.ejecutarBusquedaDB();
            }
        } catch (err) {
            alertaModal('Error al guardar usuario', err.message);
        }
    });

    // nuevo prestamo
    document.getElementById('form-prestamo')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const usuarioId = parseInt(document.getElementById('p-usuario')?.value, 10);
        const libroId = parseInt(document.getElementById('p-libro')?.value, 10);
        const fechaDevolucion = document.getElementById('p-fecha')?.value;
        const precio = parseFloat(document.getElementById('p-precio')?.value) || 0.0;

        if (!usuarioId) {
            toastNotificacion('Selecciona un usuario de la lista', 'warning');
            document.getElementById('p-usuario-search')?.focus();
            return;
        }
        if (!libroId) {
            toastNotificacion('Selecciona un libro de la lista', 'warning');
            document.getElementById('p-libro-search')?.focus();
            return;
        }

        try {
            await api('/prestamos', 'POST', { usuarioId, libroId, fechaDevolucion, precio });
            e.target.reset();
            ['p-usuario', 'p-libro', 'p-usuario-search', 'p-libro-search'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            if (document.getElementById('p-precio')) document.getElementById('p-precio').value = '0';
            toastNotificacion('Préstamo registrado correctamente');
            await Promise.all([
                window.cargarPrestamos ? window.cargarPrestamos() : Promise.resolve(),
                window.cargarLibros ? window.cargarLibros() : Promise.resolve()
            ]);
            if (document.getElementById('busqueda-db')?.classList.contains('active')) {
                if (window.ejecutarBusquedaDB) window.ejecutarBusquedaDB();
            }
        } catch (err) {
            alertaModal('Error al registrar préstamo', err.message);
        }
    });

    // editar prestamo existente
    document.getElementById('form-editar-prestamo')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = parseInt(document.getElementById('ep-id').value, 10);
        const usuarioId = parseInt(document.getElementById('ep-usuario-id').value, 10);
        const libroId = parseInt(document.getElementById('ep-libro-id').value, 10);
        const fechaPrestamo = document.getElementById('ep-fecha-prestamo').value;
        const fechaDevolucion = document.getElementById('ep-fecha-devolucion').value;
        const devuelto = document.getElementById('ep-devuelto').value === 'true';
        const precio = parseFloat(document.getElementById('ep-precio')?.value) || 0.0;

        try {
            await api(`/prestamos/${id}`, 'PUT', { usuarioId, libroId, fechaPrestamo, fechaDevolucion, devuelto, precio });
            cerrarModalEditarPrestamo();
            toastNotificacion('Préstamo modificado correctamente');
            await Promise.all([
                window.cargarPrestamos ? window.cargarPrestamos() : Promise.resolve(),
                window.cargarLibros ? window.cargarLibros() : Promise.resolve()
            ]);
            if (document.getElementById('busqueda-db')?.classList.contains('active')) {
                if (window.ejecutarBusquedaDB) window.ejecutarBusquedaDB();
            }
        } catch (err) {
            alertaModal('Error al actualizar préstamo', err.message);
        }
    });

    // inicializar selectores y fechas
    if (typeof initSearchablePrestamos === 'function') initSearchablePrestamos();
    if (typeof initTomSelectGenero === 'function') initTomSelectGenero();

    const pFecha = document.getElementById('p-fecha');
    if (pFecha) {
        const hoyStr = new Date().toISOString().split('T')[0];
        pFecha.min = hoyStr;
        if (!pFecha.value) {
            const sugerida = new Date();
            sugerida.setDate(sugerida.getDate() + 15);
            pFecha.value = sugerida.toISOString().split('T')[0];
        }
    }

    document.querySelectorAll('input[type="date"]').forEach(inp => {
        inp.addEventListener('click', () => {
            if (typeof inp.showPicker === 'function') {
                try { inp.showPicker(); } catch (e) { /* ignore */ }
            }
        });
    });

    actualizarPlaceholderBusqueda();
    inicializarBusquedaDB();

    // cerrar modales al presionar la tecla escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (typeof cerrarModalLibro === 'function') cerrarModalLibro();
            if (typeof cerrarModalUsuario === 'function') cerrarModalUsuario();
            if (typeof cerrarModalPrestamo === 'function') cerrarModalPrestamo();
            if (typeof cerrarModalEditarPrestamo === 'function') cerrarModalEditarPrestamo();
        }
    });

    // carga inicial de datos
    cargarTodo();
    if (typeof lucide !== 'undefined') lucide.createIcons();
});

// carga libros, usuarios y prestamos a la vez
async function cargarTodo() {
    const fnL = window.cargarLibros || (typeof cargarLibros === 'function' ? cargarLibros : null);
    const fnU = window.cargarUsuarios || (typeof cargarUsuarios === 'function' ? cargarUsuarios : null);
    const fnP = window.cargarPrestamos || (typeof cargarPrestamos === 'function' ? cargarPrestamos : null);

    await Promise.allSettled([
        fnL ? fnL() : Promise.resolve(),
        fnU ? fnU() : Promise.resolve(),
        fnP ? fnP() : Promise.resolve()
    ]);

    const fnD = window.actualizarDashboardEstadisticas || (typeof actualizarDashboardEstadisticas === 'function' ? actualizarDashboardEstadisticas : null);
    if (fnD) fnD();

    const fnB = window.ejecutarBusquedaDB || (typeof ejecutarBusquedaDB === 'function' ? ejecutarBusquedaDB : null);
    if (fnB) fnB();
}
window.cargarTodo = cargarTodo;

// buscador en base de datos

function inicializarBusquedaDB() {
    const input = document.getElementById('input-buscar-db');
    const filtro = document.getElementById('filtro-categoria-db');

    input?.addEventListener('input', () => {
        toggleClearButton();
        programarBusquedaDB();
    });

    input?.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') limpiarTextoBusquedaDB();
        else if (e.key === 'Enter') programarBusquedaDB(true);
    });

    filtro?.addEventListener('change', () => {
        sincronizarChipsConSelect(filtro.value);
        actualizarPlaceholderBusqueda();
        programarBusquedaDB(true);
    });
}

function toggleClearButton() {
    const input = document.getElementById('input-buscar-db');
    const clearBtn = document.getElementById('btn-clear-search-input');
    if (clearBtn && input) {
        clearBtn.style.display = input.value.trim().length > 0 ? 'inline-flex' : 'none';
    }
}
window.toggleClearButton = toggleClearButton;

function limpiarTextoBusquedaDB() {
    const input = document.getElementById('input-buscar-db');
    if (input) {
        input.value = '';
        input.focus();
    }
    toggleClearButton();
    programarBusquedaDB(true);
}
window.limpiarTextoBusquedaDB = limpiarTextoBusquedaDB;

function seleccionarChipBusqueda(cat) {
    const filtro = document.getElementById('filtro-categoria-db');
    if (filtro) filtro.value = cat;
    sincronizarChipsConSelect(cat);
    actualizarPlaceholderBusqueda();
    programarBusquedaDB(true);
}
window.seleccionarChipBusqueda = seleccionarChipBusqueda;

// categorias de libros y usuarios para sincronizar filtros rapido
const CAMPOS_LIBRO = new Set(['autor', 'titulo', 'genero', 'isbn', 'ubicacion', 'estado', 'edicion', 'anio_edicion']);
const CAMPOS_USUARIO = new Set(['cedula', 'identificacion', 'nombre_usuario', 'email', 'telefono']);

function sincronizarChipsConSelect(categoria) {
    const chips = document.querySelectorAll('.search-tab-pill, .search-chip');
    if (!chips.length) return;

    const esLibro = categoria.startsWith('libros') || CAMPOS_LIBRO.has(categoria);
    const esUsuario = categoria.startsWith('usuarios') || CAMPOS_USUARIO.has(categoria);

    chips.forEach(chip => {
        const cat = chip.dataset.cat;
        const match = cat === categoria ||
            (esLibro && cat === 'libros') ||
            (esUsuario && cat === 'usuarios') ||
            (categoria.startsWith('prestamos') && cat === 'prestamos_activos' && (categoria === 'prestamos_activos' || categoria === 'prestamos_vencidos'));
        chip.classList.toggle('active', !!match);
    });
}

function programarBusquedaDB(inmediata = false) {
    if (temporizadorBusquedaDB) clearTimeout(temporizadorBusquedaDB);
    const resumen = document.getElementById('busqueda-db-resumen');
    if (!inmediata && resumen) resumen.textContent = 'Buscando...';
    temporizadorBusquedaDB = setTimeout(ejecutarBusquedaDB, inmediata ? 0 : 200);
}
window.programarBusquedaDB = programarBusquedaDB;

// texto de sugerencia para el campo de busqueda segun la categoria
const PLACEHOLDERS_BUSQUEDA = {
    'todo': 'Buscar por título, autor, usuario, documento o préstamo...',
    'libros': 'Buscar en todos los campos de libros...',
    'libros_disponibles': 'Buscar entre libros disponibles...',
    'libros_agotados': 'Buscar entre libros agotados...',
    'libros_digitales': 'Buscar libros con enlace de descarga...',
    'libros_fisicos': 'Buscar libros con ubicación física...',
    'autor': 'Escribe el nombre del autor...',
    'titulo': 'Escribe el título del libro...',
    'genero': 'Escribe o busca por género literario...',
    'isbn': 'Escribe el código ISBN...',
    'ubicacion': 'Escribe la ubicación física o enlace...',
    'usuarios': 'Buscar en todos los campos de usuarios...',
    'cedula': 'Escribe la cédula o documento...',
    'nombre_usuario': 'Escribe el nombre del usuario...',
    'email': 'Escribe el correo electrónico...',
    'telefono': 'Escribe el número de teléfono...',
    'prestamos': 'Buscar en préstamos...',
    'prestamos_activos': 'Buscar préstamos activos...',
    'prestamos_vencidos': 'Buscar préstamos vencidos...',
    'prestamos_devueltos': 'Buscar préstamos devueltos...'
};

function actualizarPlaceholderBusqueda() {
    const cat = document.getElementById('filtro-categoria-db')?.value || 'todo';
    const input = document.getElementById('input-buscar-db');
    if (input) {
        input.placeholder = PLACEHOLDERS_BUSQUEDA[cat] || 'Escribe para buscar...';
    }
}

// busqueda aproximada con fuse.js si la api no devuelve nada
function buscarFuzzyLocal(query, categoria = 'todo') {
    if (typeof Fuse === 'undefined' || !query.trim()) return [];

    const pool = [];
    if (categoria === 'todo' || categoria.startsWith('libros') || CAMPOS_LIBRO.has(categoria)) {
        listaLibrosGlobal.forEach(l => {
            pool.push({
                tipo: 'Libro',
                accionTipo: 'libro',
                accionId: l.id,
                id: l.id,
                principal: l.titulo,
                detalle: `${l.autor} | ${l.genero || 'General'} | ISBN: ${l.isbn}`,
                estadoUbicacion: `${l.cantidadDisponible} disp.`
            });
        });
    }

    if (categoria === 'todo' || categoria.startsWith('usuarios') || CAMPOS_USUARIO.has(categoria)) {
        listaUsuariosGlobal.forEach(u => {
            pool.push({
                tipo: 'Usuario',
                accionTipo: 'usuario',
                accionId: u.id,
                id: u.id,
                principal: u.nombre,
                detalle: `CC: ${u.identificacion || '-'} | Email: ${u.email || '-'}`,
                estadoUbicacion: u.telefono || 'Sin teléfono'
            });
        });
    }

    if (categoria === 'todo' || categoria.startsWith('prestamos')) {
        // mapas para resolver nombres de socio y libro al instante
        const uMap = new Map((listaUsuariosGlobal || []).map(u => [u.id, u.nombre]));
        const lMap = new Map((listaLibrosGlobal || []).map(l => [l.id, l.titulo]));

        listaPrestamosGlobal.forEach(p => {
            const uNombre = uMap.get(p.usuarioId) || `Usuario #${p.usuarioId}`;
            const lTitulo = lMap.get(p.libroId) || `Libro #${p.libroId}`;
            pool.push({
                tipo: 'Préstamo',
                accionTipo: p.devuelto ? 'prestamo_devuelto' : 'prestamo_activo',
                accionId: p.id,
                id: p.id,
                principal: `${uNombre} ➔ ${lTitulo}`,
                detalle: `Prestado: ${formatFecha(p.fechaPrestamo)} | Dev: ${formatFecha(p.fechaDevolucion)}`,
                estadoUbicacion: p.devuelto ? 'Devuelto' : 'Activo'
            });
        });
    }

    const fuse = new Fuse(pool, {
        keys: ['principal', 'detalle', 'estadoUbicacion'],
        threshold: 0.45,
        ignoreLocation: true,
        minMatchCharLength: 2
    });

    return fuse.search(query).map(r => r.item);
}

// dibuja cada fila de resultado segun si es libro, usuario o prestamo
function renderFilaResultado(r, cache = null) {
    const esLibro = r.accionTipo === 'libro' || (r.tipo && r.tipo.toLowerCase().includes('libro'));
    const esUsuario = r.accionTipo === 'usuario' || (r.tipo && r.tipo.toLowerCase().includes('usuario'));

    if (esLibro) {
        const libro = cache?.libros?.get(r.accionId) || (window.listaLibrosGlobal || []).find(l => l.id === r.accionId);
        const autor = libro?.autor || extraerDeTexto(r.detalle, 'Autor:') || '-';
        const genero = libro?.genero || extraerDeTexto(r.detalle, 'Género:') || '-';
        const isbn = libro?.isbn || extraerDeTexto(r.detalle, 'ISBN:') || '-';
        const stockNum = libro ? libro.cantidadDisponible : extraerDeTexto(r.estadoUbicacion, 'Stock:');
        const disponible = libro ? libro.cantidadDisponible > 0 : !r.estadoUbicacion?.toLowerCase().includes('agotado');
        const estado = libro?.estado || (disponible ? 'Disponible' : 'Agotado');
        const ubicacion = libro?.ubicacion || libro?.urlDescarga || extraerDeTexto(r.estadoUbicacion, 'Ubic:') || '';

        return `
            <tr>
                <td><span class="search-type-pill badge-libro">Libro</span></td>
                <td><span class="id-tag">#${esc(r.id)}</span></td>
                <td><strong class="search-item-title">${esc(r.principal)}</strong></td>
                <td>${esc(autor)}</td>
                <td>${esc(genero)}</td>
                <td>${esc(isbn)}</td>
                <td>${stockNum !== '' && stockNum !== null && stockNum !== undefined ? `<strong>${esc(stockNum)} copias</strong>` : '-'}</td>
                <td><span style="color: var(--text-dim);">-</span></td>
                <td>
                    <span class="status-pill ${disponible ? 'status-disponible' : 'status-agotado'}">${esc(estado)}</span>
                    ${ubicacion ? `<div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 2px;">${esc(ubicacion)}</div>` : ''}
                </td>
                <td>
                    <div class="action-buttons-cell">
                        <button class="btn-action btn-action-view" onclick="verMasLibro(${r.accionId})" title="Ver detalles">Ver más</button>
                    </div>
                </td>
            </tr>
        `;
    }

    if (esUsuario) {
        const usuario = cache?.usuarios?.get(r.accionId) || (window.listaUsuariosGlobal || []).find(u => u.id === r.accionId);
        const identificacion = usuario?.identificacion || extraerCCDeTexto(r.principal) || r.estadoUbicacion || '-';
        const email = usuario?.email || extraerDeTexto(r.detalle, 'Correo:') || '-';
        const telefono = usuario?.telefono || extraerDeTexto(r.detalle, 'Tel:') || '-';

        return `
            <tr>
                <td><span class="search-type-pill badge-usuario">Usuario</span></td>
                <td><span class="id-tag">#${esc(r.id)}</span></td>
                <td><strong class="search-item-title">${esc(limpiarNombrePrincipal(r.principal))}</strong></td>
                <td><strong>CC: ${esc(identificacion)}</strong></td>
                <td>${esc(email)}</td>
                <td>${esc(telefono)}</td>
                <td><span style="color: var(--text-dim);">-</span></td>
                <td><span style="color: var(--text-dim);">-</span></td>
                <td><span class="status-pill status-activo">Activo</span></td>
                <td>
                    <div class="action-buttons-cell">
                        <button class="btn-action btn-action-view" onclick="verMasUsuario(${r.accionId})" title="Ver detalles">Ver más</button>
                    </div>
                </td>
            </tr>
        `;
    }

    // prestamos
    const prestamo = cache?.prestamos?.get(r.accionId) || (window.listaPrestamosGlobal || []).find(p => p.id === r.accionId);
    const usuarioNombre = prestamo?.nombreUsuario || extraerDeTexto(r.detalle, 'Usuario:') || `Usuario #${prestamo?.usuarioId || '-'}`;
    const fechaPrestamo = prestamo?.fechaPrestamo ? formatFecha(prestamo.fechaPrestamo) : (extraerDeTexto(r.detalle, 'Prestado:') || '-');
    const fechaDevolucion = prestamo?.fechaDevolucion ? formatFecha(prestamo.fechaDevolucion) : (extraerDeTexto(r.detalle, 'Hasta:') || '-');
    const precio = prestamo?.precio ? `$${Number(prestamo.precio).toLocaleString('es-CO', { minimumFractionDigits: 2 })}` : (extraerDeTexto(r.detalle, 'Precio:') || '$0.00');

    const esDevuelto = prestamo ? (prestamo.estado === 'Devuelto' || prestamo.devuelto) : r.estadoUbicacion?.toLowerCase().includes('devuelto');
    const esVencido = prestamo ? (prestamo.estado === 'Vencido') : r.estadoUbicacion?.toLowerCase().includes('vencido');
    const estado = prestamo?.estado || (esDevuelto ? 'Devuelto' : (esVencido ? 'Vencido' : 'Activo'));

    return `
        <tr>
            <td><span class="search-type-pill badge-prestamo">Préstamo</span></td>
            <td><span class="id-tag">#${esc(r.id)}</span></td>
            <td><strong class="search-item-title">${esc(limpiarNombrePrincipal(r.principal))}</strong></td>
            <td><strong>${esc(usuarioNombre)}</strong></td>
            <td>Prest: ${esc(fechaPrestamo)}</td>
            <td><span style="${esVencido ? 'color: var(--color-danger); font-weight: 600;' : ''}">Dev: ${esc(fechaDevolucion)}</span></td>
            <td><span style="color: var(--text-dim);">-</span></td>
            <td><strong>${esc(precio)}</strong></td>
            <td><span class="status-pill ${esDevuelto ? 'status-devuelto' : (esVencido ? 'status-vencido' : 'status-activo')}">${esc(estado)}</span></td>
            <td>
                <div class="action-buttons-cell">
                    <button class="btn-action btn-action-view" onclick="verMasPrestamo(${r.accionId})" title="Ver detalles">Ver más</button>
                </div>
            </td>
        </tr>
    `;
}

// ejecuta la consulta en el servidor
async function ejecutarBusquedaDB() {
    const input = document.getElementById('input-buscar-db');
    const query = (input?.value || '').trim();
    const categoria = document.getElementById('filtro-categoria-db')?.value || 'todo';
    const resumen = document.getElementById('busqueda-db-resumen');

    toggleClearButton();
    sincronizarChipsConSelect(categoria);

    const idSolicitud = ++solicitudBusquedaDB;
    const inicioTiempo = performance.now();

    if (typeof destruirTablaExcel === 'function') {
        destruirTablaExcel('tabla-buscar-db');
    }

    const tbody = document.getElementById('tbody-buscar-db');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="10" class="search-empty-state"><div class="search-loader"></div> Consultando registros...</td></tr>`;
    if (resumen) resumen.textContent = 'Consultando...';

    try {
        let resultados = await api(`/busqueda?q=${encodeURIComponent(query)}&categoria=${encodeURIComponent(categoria)}`);
        if (idSolicitud !== solicitudBusquedaDB) return;

        let esFuzzy = false;
        if ((!resultados || resultados.length === 0) && query.length >= 2) {
            const fuzzy = buscarFuzzyLocal(query, categoria);
            if (fuzzy && fuzzy.length > 0) {
                resultados = fuzzy;
                esFuzzy = true;
            }
        }

        const finTiempo = Math.round(performance.now() - inicioTiempo);
        const currentTbody = document.getElementById('tbody-buscar-db');
        if (!currentTbody) return;

        if (!resultados || resultados.length === 0) {
            currentTbody.innerHTML = `
                <tr>
                    <td colspan="10" class="search-empty-state">
                        <div>${query ? `No se encontraron registros para "<strong>${esc(query)}</strong>".` : 'No hay registros disponibles en la categoría seleccionada.'}</div>
                    </td>
                </tr>
            `;
            if (resumen) resumen.textContent = `0 resultados (${finTiempo} ms)`;
            return;
        }

        // indexa en mapas para que el renderizado sea inmediato
        const cache = {
            libros: new Map((window.listaLibrosGlobal || []).map(l => [l.id, l])),
            usuarios: new Map((window.listaUsuariosGlobal || []).map(u => [u.id, u])),
            prestamos: new Map((window.listaPrestamosGlobal || []).map(p => [p.id, p]))
        };

        currentTbody.innerHTML = resultados.map(r => renderFilaResultado(r, cache)).join('');

        const cant = resultados.length;
        const textoCant = cant === 1 ? '1 resultado' : `${cant} resultados`;
        const criterioTexto = query ? ` para "${query}"` : '';
        const indicadorFuzzy = esFuzzy ? ' (Búsqueda aproximada)' : '';
        if (resumen) {
            resumen.textContent = `${textoCant}${criterioTexto}${indicadorFuzzy} (${finTiempo} ms)`;
        }

        if (typeof registrarTablaExcel === 'function') {
            registrarTablaExcel('tabla-buscar-db');
        }
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

    } catch (err) {
        if (idSolicitud !== solicitudBusquedaDB) return;
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="search-empty-state search-error-state">
                    No fue posible consultar la base de datos. ${esc(err.message)}
                </td>
            </tr>
        `;
        if (resumen) resumen.textContent = 'Error al consultar la base de datos.';
    }
}
window.ejecutarBusquedaDB = ejecutarBusquedaDB;

// funciones para parsear textos de las respuestas
const REGEX_CC = /\(CC:\s*([^)]+)\)/i;
const REGEX_CLEAN_CC = /\s*\(CC:[^)]+\)/i;

function extraerDeTexto(texto, etiqueta) {
    if (!texto || !etiqueta) return '';
    const partes = texto.split('|');
    const prefijo = etiqueta.toLowerCase();
    for (let i = 0; i < partes.length; i++) {
        const tr = partes[i].trim();
        if (tr.toLowerCase().startsWith(prefijo)) {
            return tr.substring(etiqueta.length).trim();
        }
    }
    return '';
}

function extraerCCDeTexto(texto) {
    if (!texto) return '';
    const match = texto.match(REGEX_CC);
    return match ? match[1].trim() : '';
}

function limpiarNombrePrincipal(texto) {
    if (!texto) return '';
    return texto.replace(REGEX_CLEAN_CC, '').trim();
}

function limpiarBusquedaDB() {
    const input = document.getElementById('input-buscar-db');
    if (input) input.value = '';
    const filtro = document.getElementById('filtro-categoria-db');
    if (filtro) filtro.value = 'todo';
    toggleClearButton();
    sincronizarChipsConSelect('todo');
    actualizarPlaceholderBusqueda();
    if (typeof limpiarTodosFiltrosExcel === 'function') {
        limpiarTodosFiltrosExcel('tabla-buscar-db');
    }
    programarBusquedaDB(true);
}
window.limpiarBusquedaDB = limpiarBusquedaDB;
window.extraerDeTexto = extraerDeTexto;
window.extraerCCDeTexto = extraerCCDeTexto;
window.limpiarNombrePrincipal = limpiarNombrePrincipal;
