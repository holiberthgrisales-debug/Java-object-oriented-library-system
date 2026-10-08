// gestion de libros, usuarios y prestamos (frontend core)
// modulo optimizado para administracion rapida y reactiva

// utilidades del ambito global (puentes seguros y tolerantes a fallos)
const api = (url, method, data) =>
    (typeof window.api === 'function' ? window.api(url, method, data) : fetch(url).then(r => r.json()));
const esc = (s) =>
    (typeof window.esc === 'function' ? window.esc(s) : (s == null ? '' : String(s)));
const safeUrl = (u) =>
    (typeof window.safeUrl === 'function' ? window.safeUrl(u) : u);
const formatFecha = (f) =>
    (typeof window.formatFecha === 'function' ? window.formatFecha(f) : f);
const alertaModal = (t, m, i) =>
    (typeof window.alertaModal === 'function' ? window.alertaModal(t, m, i) : alert(m || t));
const toastNotificacion = (m, t, timer) =>
    (typeof window.toastNotificacion === 'function' ? window.toastNotificacion(m, t, timer) : console.log(m));
const dialogConfirmar = (opts) =>
    (typeof window.dialogConfirmar === 'function' ? window.dialogConfirmar(opts) : Promise.resolve(confirm(opts?.title || 'confirmar')));

// selectores y helpers dom reutilizables
const $ = (id) => document.getElementById(id);
const setVal = (id, val) => {
    const el = $(id); if (el) el.value = val ?? '';
};
const setDisplay = (id, val) => {
    const el = $(id); if (el) el.style.display = val;
};
const setText = (id, text) => {
    const el = $(id); if (el) el.textContent = text ?? '';
};
const setHtml = (id, html) => {
    const el = $(id); if (el) el.innerHTML = html ?? '';
};
const refreshIcons = () => {
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') lucide.createIcons();
};
const formatMoneda = (val) => '$' + Number(val || 0).toLocaleString('es-CO', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
});
const renderFilaVacia = (colspan, mensaje) =>
    `<tr><td colspan="${colspan}" class="search-empty-state">${esc(mensaje)}</td></tr>`;

// helpers de modales y formularios
const renderItemDetalle = (l, v, h, s) => {
    if (!l) {
        return `<div class="modal-detail-full"${s ? ` style="${s}"` : ''}>${h ? v : esc(v)}</div>`;
    }
    return `<div class="modal-detail-item"><span class="modal-detail-label">${esc(l)}:</span><span class="modal-detail-value"${s ? ` style="${s}"` : ''}>${h ? v : esc(v)}</span></div>`;
};
const renderItemsDetalle = (arr) =>
    arr.map(([l, v, h, s]) => renderItemDetalle(l, v, h, s)).join('');

function vincularBotonModal(btnId, accion, visible = true) {
    const btn = $(btnId);
    if (btn) { btn.style.display = visible ? 'inline-flex' : 'none'; btn.onclick = accion; }
}

function poblarFormulario(mapa) {
    Object.entries(mapa).forEach(([id, val]) => setVal(id, val));
}

function navegarYEditar(tabTarget, editFn, id) {
    document.querySelector(`[data-target="${tabTarget}"]`)?.click();
    setTimeout(() => editFn(id), 150);
}

// 1. seccion: gestion de libros
async function cargarLibros() {
    try {
        const libros = await api('/libros');
        window.listaLibrosGlobal = libros || [];
        if (typeof destruirTablaExcel === 'function') destruirTablaExcel('tabla-libros');

        const tbody = $('tbody-libros');
        if (!tbody) return;
        if (!libros?.length) { tbody.innerHTML = renderFilaVacia(12, 'no hay libros registrados en el sistema.'); return; }

        tbody.innerHTML = libros.map(l => {
            const disp = l.cantidadDisponible > 0;
            const ubic = l.ubicacion ? `<div>${esc(l.ubicacion)}</div>` : '';
            const desc = l.urlDescarga ? `<div><a href="${esc(l.urlDescarga)}" target="_blank" style="color: var(--primary);">abrir url</a></div>` : '';
            return `<tr>
                <td>${esc(l.id)}</td><td><strong>${esc(l.titulo)}</strong></td><td>${esc(l.autor)}</td><td>${esc(l.isbn)}</td>
                <td>${esc(l.anioPublicacion)}</td><td>${esc(l.edicion || '-')}</td><td>${esc(l.anioEdicion || '-')}</td><td>${esc(l.genero || '-')}</td>
                <td>${esc(l.cantidadDisponible)}</td><td><span class="status-pill ${disp ? 'status-disponible' : 'status-agotado'}">${esc(l.estado || (disp ? 'disponible' : 'agotado'))}</span></td>
                <td>${ubic || desc || '<span style="color: var(--text-dim);">sin datos</span>'}</td>
                <td><div class="action-buttons-cell"><button class="btn-action btn-action-view" onclick="verMasLibro(${l.id})" title="ver detalles">ver mas</button></div></td>
            </tr>`;
        }).join('');

        if (typeof registrarTablaExcel === 'function') registrarTablaExcel('tabla-libros');
        refreshIcons();
    } catch (err) { console.error('error cargando libros:', err); }
}
window.cargarLibros = cargarLibros;

function verMasLibro(id) {
    const l = (window.listaLibrosGlobal || []).find(it => it.id === id);
    if (!l) return;
    const urlSeg = typeof safeUrl === 'function' ? safeUrl(l.urlDescarga) : (l.urlDescarga && /^https?:\/\//i.test(l.urlDescarga) ? esc(l.urlDescarga) : null);
    const enl = urlSeg ? `<a href="${urlSeg}" target="_blank" rel="noopener noreferrer" style="color: var(--primary);">${urlSeg}</a>` : 'no tiene';

    setText('m-titulo', l.titulo);
    setHtml('m-contenido', renderItemsDetalle([
        ['autor', l.autor], ['genero', l.genero || 'general'], ['isbn', l.isbn],
        ['ano de publicacion', l.anioPublicacion], ['edicion', l.edicion || 'no especificada'],
        ['ano de edicion', l.anioEdicion || 'no especificado'],
        ['estado', l.estado || 'disponible', false, 'color: var(--primary); font-weight: 600;'],
        ['copias disponibles', l.cantidadDisponible], ['ubicacion fisica', l.ubicacion || 'no especificada'],
        ['enlace digital', enl, true]
    ]));

    vincularBotonModal('btn-modal-etiqueta-libro', () => { cerrarModalLibro(); window.BarcodeQR?.abrirModalEtiquetaLibro(l); });
    vincularBotonModal('btn-modal-editar-libro', () => { cerrarModalLibro(); editarLibroDesdeBusqueda(l.id); });
    vincularBotonModal('btn-modal-eliminar-libro', () => { cerrarModalLibro(); eliminarLibroDesdeBusqueda(l.id); });
    setDisplay('modal-detalle-libro', 'flex');
    refreshIcons();
}
window.verMasLibro = verMasLibro;
const cerrarModalLibro = () => setDisplay('modal-detalle-libro', 'none');
window.cerrarModalLibro = cerrarModalLibro;

function editarLibro(id) {
    const l = (window.listaLibrosGlobal || []).find(it => it.id === id);
    if (!l) return;
    poblarFormulario({
        'l-edit-id': l.id, 'l-titulo': l.titulo || '', 'l-autor': l.autor || '',
        'l-isbn': l.isbn || '', 'l-anio': l.anioPublicacion || '', 'l-edicion': l.edicion || '',
        'l-anio-edicion': l.anioEdicion || '', 'l-estado': l.estado || 'disponible',
        'l-cantidad': l.cantidadDisponible ?? 1, 'l-ubicacion': l.ubicacion || '', 'l-url': l.urlDescarga || ''
    });
    if (window.tomSelectGenero) {
        const g = l.genero || '';
        if (g && !window.tomSelectGenero.options[g]) window.tomSelectGenero.addOption({ value: g, text: g });
        window.tomSelectGenero.setValue(g);
    }
    else setVal('l-genero', l.genero || '');

    setText('form-libro-titulo', `editando libro #${l.id}`);
    setText('btn-guardar-libro', 'actualizar libro');
    setDisplay('btn-cancelar-libro', 'inline-block');
    $('form-libro')?.scrollIntoView({ behavior: 'smooth' });
}
window.editarLibro = editarLibro;

function cancelarEdicionLibro() {
    $('form-libro')?.reset();
    window.tomSelectGenero?.clear();
    poblarFormulario({ 'l-edit-id': '', 'l-estado': 'disponible' });
    setText('form-libro-titulo', 'anadir libro');
    setText('btn-guardar-libro', 'guardar libro');
    setDisplay('btn-cancelar-libro', 'none');
}
window.cancelarEdicionLibro = cancelarEdicionLibro;

async function eliminarLibro(id) {
    const ok = await dialogConfirmar({ title: 'eliminar libro', text: 'esta accion eliminara el libro.', confirmText: 'si, eliminar', isDanger: true });
    if (!ok) return;
    try {
        await api(`/libros/${id}`, 'DELETE');
        toastNotificacion('libro eliminado correctamente');
        await cargarLibros();
    } catch (err) { alertaModal('error al eliminar libro', err.message); }
}
window.eliminarLibro = eliminarLibro;

// 2. seccion: gestion de usuarios
async function cargarUsuarios() {
    try {
        const usuarios = await api('/usuarios');
        window.listaUsuariosGlobal = usuarios || [];
        if (typeof destruirTablaExcel === 'function') destruirTablaExcel('tabla-usuarios');

        const tbody = $('tbody-usuarios');
        if (!tbody) return;
        if (!usuarios?.length) { tbody.innerHTML = renderFilaVacia(6, 'no hay usuarios registrados en el sistema.'); return; }

        tbody.innerHTML = usuarios.map(u => `<tr>
            <td>${esc(u.id)}</td><td>${esc(u.identificacion) || '<span style="color: var(--text-dim);">sin cc</span>'}</td>
            <td><strong>${esc(u.nombre)}</strong></td><td>${esc(u.email)}</td><td>${esc(u.telefono || '-')}</td>
            <td><div class="action-buttons-cell"><button class="btn-action btn-action-view" onclick="verMasUsuario(${u.id})" title="ver detalles">ver mas</button></div></td>
        </tr>`).join('');

        if (typeof registrarTablaExcel === 'function') registrarTablaExcel('tabla-usuarios');
        refreshIcons();
    } catch (err) { console.error('error cargando usuarios:', err); }
}
window.cargarUsuarios = cargarUsuarios;

function verMasUsuario(id) {
    const u = (window.listaUsuariosGlobal || []).find(it => it.id === id);
    if (!u) return;
    const prestamos = (window.listaPrestamosGlobal || []).filter(p => p.usuarioId === id);
    const activos = prestamos.filter(p => !p.devuelto && !String(p.estado).toLowerCase().includes('devuelto')).length;

    const pList = prestamos.length === 0
        ? '<div style="color: var(--text-dim); font-size: 0.85rem; padding: 0.5rem 0;">No tiene préstamos registrados actualmente.</div>'
        : prestamos.map(p => {
            const dev = p.devuelto || String(p.estado).toLowerCase().includes('devuelto');
            const ven = String(p.estado).toLowerCase().includes('vencido');
            const estadoClase = dev ? 'status-activo' : (ven ? 'status-retrasado' : 'status-prestado');
            const estadoTexto = p.estado || (dev ? 'Devuelto' : (ven ? 'Vencido' : 'Activo'));
            return `<div class="modal-loan-history-card">
                <div class="modal-loan-history-info">
                    <div class="modal-loan-title"><strong>${esc(p.tituloLibro || `Libro #${p.libroId}`)}</strong></div>
                    <div class="modal-loan-dates">${esc(formatFecha(p.fechaPrestamo))} - ${esc(formatFecha(p.fechaDevolucion))}</div>
                </div>
                <span class="status-badge ${estadoClase}">${esc(estadoTexto)}</span>
            </div>`;
        }).join('');

    setText('m-u-titulo', u.nombre);
    setHtml('m-u-contenido', renderItemsDetalle([
        ['documento / cc', u.identificacion || 'sin documento'], ['nombre completo', u.nombre],
        ['correo electronico', u.email], ['telefono', u.telefono || 'sin telefono'],
        ['prestamos pendientes', `${activos} activos`],
        ['', `<div style="margin-top: 1rem;"><div style="font-weight: 600; font-size: 0.88rem; margin-bottom: 0.4rem; color: var(--primary);">historial de prestamos (${prestamos.length}):</div><div style="max-height: 140px; overflow-y: auto;">${pList}</div></div>`, true]
    ]));

    vincularBotonModal('btn-modal-carnet-usuario', () => { cerrarModalUsuario(); window.BarcodeQR?.abrirModalCarnetUsuario(u); });
    vincularBotonModal('btn-modal-editar-usuario', () => { cerrarModalUsuario(); editarUsuarioDesdeBusqueda(u.id); });
    vincularBotonModal('btn-modal-eliminar-usuario', () => { cerrarModalUsuario(); eliminarUsuarioDesdeBusqueda(u.id); });
    setDisplay('modal-detalle-usuario', 'flex');
    refreshIcons();
}
window.verMasUsuario = verMasUsuario;
const cerrarModalUsuario = () => setDisplay('modal-detalle-usuario', 'none');
window.cerrarModalUsuario = cerrarModalUsuario;

function editarUsuario(id) {
    const u = (window.listaUsuariosGlobal || []).find(it => it.id === id);
    if (!u) return;
    poblarFormulario({
        'u-edit-id': u.id, 'u-identificacion': u.identificacion || '',
        'u-nombre': u.nombre || '', 'u-email': u.email || '', 'u-telefono': u.telefono || ''
    });
    setText('form-usuario-titulo', `editando usuario #${u.id}`);
    setText('btn-guardar-usuario', 'actualizar usuario');
    setDisplay('btn-cancelar-usuario', 'inline-block');
    $('form-usuario')?.scrollIntoView({ behavior: 'smooth' });
}
window.editarUsuario = editarUsuario;

function cancelarEdicionUsuario() {
    $('form-usuario')?.reset();
    setVal('u-edit-id', '');
    setText('form-usuario-titulo', 'anadir usuario');
    setText('btn-guardar-usuario', 'guardar usuario');
    setDisplay('btn-cancelar-usuario', 'none');
}
window.cancelarEdicionUsuario = cancelarEdicionUsuario;

async function eliminarUsuario(id) {
    const ok = await dialogConfirmar({ title: 'eliminar usuario', text: 'esta accion eliminara al socio.', confirmText: 'si, eliminar', isDanger: true });
    if (!ok) return;
    try {
        await api(`/usuarios/${id}`, 'DELETE');
        toastNotificacion('usuario eliminado correctamente');
        await cargarUsuarios();
    } catch (err) { alertaModal('error al eliminar usuario', err.message); }
}
window.eliminarUsuario = eliminarUsuario;

// 3. seccion: gestion de prestamos
function filtrarPrestamos(tipo) {
    window.filtroActualPrestamos = tipo;
    $('btn-filtro-todos')?.classList.toggle('active', tipo === 'todos');
    $('btn-filtro-vencidos')?.classList.toggle('active', tipo === 'vencidos');
    cargarPrestamos();
}
window.filtrarPrestamos = filtrarPrestamos;

async function cargarPrestamos() {
    try {
        const todos = await api('/prestamos');
        window.listaPrestamosGlobal = todos || [];
        const esVenc = window.filtroActualPrestamos === 'vencidos';
        const lista = esVenc ? await api('/prestamos/vencidos') : todos;

        if (typeof destruirTablaExcel === 'function') destruirTablaExcel('tabla-prestamos');
        const tbody = $('tbody-prestamos');
        if (!tbody) return;
        if (!lista?.length) { tbody.innerHTML = renderFilaVacia(8, esVenc ? 'no hay prestamos vencidos actualmente.' : 'no hay prestamos registrados.'); return; }

        tbody.innerHTML = lista.map(p => {
            const dev = p.devuelto || String(p.estado).toLowerCase().includes('devuelto');
            const ven = String(p.estado).toLowerCase().includes('vencido');
            const pillClass = dev ? 'status-devuelto' : (ven ? 'status-vencido' : 'status-activo');
            return `<tr>
                <td>${esc(p.id)}</td><td><strong>${esc(p.nombreUsuario || p.usuarioId)}</strong></td>
                <td>${esc(p.tituloLibro || p.libroId)}</td><td>${esc(formatFecha(p.fechaPrestamo))}</td>
                <td style="${ven ? 'color: var(--color-danger); font-weight: 600;' : ''}">${esc(formatFecha(p.fechaDevolucion))}</td>
                <td style="font-weight: 500;">${formatMoneda(p.precio)}</td>
                <td><span class="status-pill ${pillClass}">${esc(p.estado || (dev ? 'devuelto' : (ven ? 'vencido' : 'activo')))}</span></td>
                <td><div class="action-buttons-cell"><button class="btn-action btn-action-view" onclick="verMasPrestamo(${p.id})" title="ver detalles">ver mas</button></div></td>
            </tr>`;
        }).join('');

        if (typeof registrarTablaExcel === 'function') registrarTablaExcel('tabla-prestamos');
        refreshIcons();
    } catch (err) { console.error('error cargando prestamos:', err); }
}
window.cargarPrestamos = cargarPrestamos;

function verMasPrestamo(id) {
    const p = (window.listaPrestamosGlobal || []).find(it => it.id === id);
    if (!p) return;
    const dev = p.devuelto || String(p.estado).toLowerCase().includes('devuelto');
    const ven = String(p.estado).toLowerCase().includes('vencido');
    const badge = `<span class="status-pill" style="background: ${ven ? 'var(--color-danger)' : (dev ? 'var(--text-dim)' : 'var(--color-success)')}; color: #fff;">${esc(p.estado)}</span>`;

    setText('m-p-titulo', `prestamo #${p.id}`);
    setHtml('m-p-contenido', renderItemsDetalle([
        ['estado', badge, true], ['usuario', p.nombreUsuario || `id #${p.usuarioId}`],
        ['libro', p.tituloLibro || `id #${p.libroId}`], ['fecha prestamo', formatFecha(p.fechaPrestamo)],
        ['fecha devolucion', formatFecha(p.fechaDevolucion), false, ven ? 'color: var(--color-danger); font-weight: bold;' : ''],
        ['precio / tarifa', formatMoneda(p.precio), false, 'font-weight: 600; color: var(--primary);']
    ]));

    vincularBotonModal('btn-modal-devolver-prestamo', async () => { cerrarModalPrestamo(); await devolver(p.id); }, !dev);
    vincularBotonModal('btn-modal-editar-prestamo', () => { cerrarModalPrestamo(); editarPrestamo(p.id); });
    vincularBotonModal('btn-modal-eliminar-prestamo', () => { cerrarModalPrestamo(); eliminarPrestamo(p.id); });
    setDisplay('modal-detalle-prestamo', 'flex');
    refreshIcons();
}
window.verMasPrestamo = verMasPrestamo;
const cerrarModalPrestamo = () => setDisplay('modal-detalle-prestamo', 'none');
window.cerrarModalPrestamo = cerrarModalPrestamo;

function editarPrestamo(id) {
    const p = (window.listaPrestamosGlobal || []).find(it => it.id === id);
    if (!p) return;
    poblarFormulario({
        'ep-id': p.id, 'ep-usuario-id': p.usuarioId, 'ep-libro-id': p.libroId,
        'ep-fecha-prestamo': formatFecha(p.fechaPrestamo),
        'ep-usuario-nombre': p.nombreUsuario || `usuario #${p.usuarioId}`,
        'ep-libro-titulo': p.tituloLibro || `libro #${p.libroId}`,
        'ep-fecha-devolucion': formatFecha(p.fechaDevolucion),
        'ep-precio': p.precio || 0,
        'ep-devuelto': (p.devuelto || String(p.estado).toLowerCase().includes('devuelto')) ? 'true' : 'false'
    });
    setText('edit-p-titulo', `modificar prestamo #${p.id}`);
    setDisplay('modal-editar-prestamo', 'flex');
}
window.editarPrestamo = editarPrestamo;
const cerrarModalEditarPrestamo = () => setDisplay('modal-editar-prestamo', 'none');
window.cerrarModalEditarPrestamo = cerrarModalEditarPrestamo;

async function eliminarPrestamo(id) {
    const ok = await dialogConfirmar({ title: 'eliminar prestamo', text: 'esta accion eliminara el prestamo.', confirmText: 'si, eliminar', isDanger: true });
    if (!ok) return;
    try {
        await api(`/prestamos/${id}`, 'DELETE');
        toastNotificacion('prestamo eliminado correctamente');
        await Promise.all([cargarPrestamos(), cargarLibros()]);
        if (typeof window.ejecutarBusquedaDB === 'function' && $('busqueda-db')?.classList.contains('active')) window.ejecutarBusquedaDB();
    } catch (err) { alertaModal('error al eliminar prestamo', err.message); }
}
window.eliminarPrestamo = eliminarPrestamo;

async function devolver(id) {
    const ok = await dialogConfirmar({ title: 'marcar devolucion', text: 'deseas registrar este libro como devuelto?', confirmText: 'si, devolver', isDanger: false });
    if (!ok) return;
    try {
        await api(`/prestamos/${id}/devolver`, 'PUT');
        toastNotificacion('libro devuelto con exito');
        await Promise.all([cargarPrestamos(), cargarLibros()]);
        if (typeof window.ejecutarBusquedaDB === 'function' && $('busqueda-db')?.classList.contains('active')) window.ejecutarBusquedaDB();
    } catch (err) { alertaModal('error al devolver libro', err.message); }
}
window.devolver = devolver;

// enlaces desde busqueda global
const editarLibroDesdeBusqueda = (id) => navegarYEditar('libros', editarLibro, id);
const editarUsuarioDesdeBusqueda = (id) => navegarYEditar('usuarios', editarUsuario, id);
const eliminarLibroDesdeBusqueda = async (id) => { await eliminarLibro(id); window.ejecutarBusquedaDB?.(); };
const eliminarUsuarioDesdeBusqueda = async (id) => { await eliminarUsuario(id); window.ejecutarBusquedaDB?.(); };
window.editarLibroDesdeBusqueda = editarLibroDesdeBusqueda;
window.editarUsuarioDesdeBusqueda = editarUsuarioDesdeBusqueda;
window.eliminarLibroDesdeBusqueda = eliminarLibroDesdeBusqueda;
window.eliminarUsuarioDesdeBusqueda = eliminarUsuarioDesdeBusqueda;

// 4. selectores buscables de prestamos
function initSearchablePrestamos() {
    configurarSelectorBuscable('p-usuario-search', 'p-usuario-dropdown', 'p-usuario', 'wrapper-usuario', renderDropdownUsuarios);
    configurarSelectorBuscable('p-libro-search', 'p-libro-dropdown', 'p-libro', 'wrapper-libro', renderDropdownLibros);
}
window.initSearchablePrestamos = initSearchablePrestamos;

function configurarSelectorBuscable(inputId, dropdownId, hiddenId, wrapperId, renderFn) {
    const input = $(inputId), dropdown = $(dropdownId), hidden = $(hiddenId);
    if (!input || !dropdown) return;
    let idx = -1;

    input.addEventListener('focus', () => renderFn(input.value));
    input.addEventListener('input', () => { if (hidden) hidden.value = ''; idx = -1; renderFn(input.value); });
    input.addEventListener('keydown', (e) => {
        const items = dropdown.querySelectorAll('.searchable-item:not(.disabled)');
        if (!items.length || dropdown.style.display === 'none') return;
        if (e.key === 'ArrowDown') { e.preventDefault(); idx = (idx + 1) % items.length; resaltarItem(items, idx); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); idx = (idx - 1 + items.length) % items.length; resaltarItem(items, idx); }
        else if (e.key === 'Enter' && idx >= 0 && items[idx]) { e.preventDefault(); items[idx].click(); }
        else if (e.key === 'Escape') { dropdown.style.display = 'none'; }
    });
    document.addEventListener('click', (e) => {
        if (!$(wrapperId)?.contains(e.target)) dropdown.style.display = 'none';
    });
}

function resaltarItem(items, index) {
    items.forEach((it, i) => {
        it.classList.toggle('active-item', i === index);
        if (i === index) it.scrollIntoView({ block: 'nearest' });
    });
}

async function renderDropdownUsuarios(query = '') {
    const dd = $('p-usuario-dropdown');
    if (!dd) return;
    try {
        const list = query.trim() ? await api(`/usuarios?busqueda=${encodeURIComponent(query)}`) : (window.listaUsuariosGlobal || []);
        dd.style.display = 'block';
        if (!list?.length) { dd.innerHTML = '<div class="searchable-empty">no se encontraron usuarios</div>'; return; }
        dd.innerHTML = list.map(u => `<div class="searchable-item" onclick="seleccionarUsuarioPrestamo(${u.id})">
            <div class="searchable-item-main"><div class="searchable-item-title">${esc(u.nombre)}</div>
            <div class="searchable-item-sub">${u.identificacion ? `cc: <strong>${esc(u.identificacion)}</strong>` : 'sin cc'}${u.email ? ` | ${esc(u.email)}` : ''}</div></div>
            <span class="badge" style="background: rgba(99, 102, 241, 0.2); color: #818cf8; font-size: 0.75rem;">id #${esc(u.id)}</span>
        </div>`).join('');
    } catch { dd.innerHTML = '<div class="searchable-empty">error al consultar usuarios</div>'; }
}

async function renderDropdownLibros(query = '') {
    const dd = $('p-libro-dropdown');
    if (!dd) return;
    try {
        const list = query.trim() ? await api(`/libros?q=${encodeURIComponent(query)}`) : (window.listaLibrosGlobal || []);
        dd.style.display = 'block';
        if (!list?.length) { dd.innerHTML = '<div class="searchable-empty">no se encontraron libros</div>'; return; }
        dd.innerHTML = list.map(l => {
            const disp = l.cantidadDisponible > 0;
            return `<div class="searchable-item ${disp ? '' : 'disabled'}" onclick="${disp ? `seleccionarLibroPrestamo(${l.id})` : "toastNotificacion('el libro no tiene copias disponibles', 'warning')"}">
                <div class="searchable-item-main"><div class="searchable-item-title">${esc(l.titulo)}</div>
                <div class="searchable-item-sub">${esc(l.autor)} | ${esc(l.genero || 'general')} | isbn: ${esc(l.isbn)}</div></div>
                <span class="book-badge ${disp ? 'badge-disponible' : 'badge-agotado'}">${disp ? `${l.cantidadDisponible} disp.` : 'agotado'}</span>
            </div>`;
        }).join('');
    } catch { dd.innerHTML = '<div class="searchable-empty">error al consultar libros</div>'; }
}

function seleccionarUsuarioPrestamo(id) {
    const u = (window.listaUsuariosGlobal || []).find(it => it.id === id);
    if (!u) return;
    setVal('p-usuario', u.id);
    setVal('p-usuario-search', `${u.nombre} ${u.identificacion ? `(cc: ${u.identificacion})` : ''}`);
    setDisplay('p-usuario-dropdown', 'none');
}
window.seleccionarUsuarioPrestamo = seleccionarUsuarioPrestamo;

function seleccionarLibroPrestamo(id) {
    const l = (window.listaLibrosGlobal || []).find(it => it.id === id);
    if (!l) return;
    setVal('p-libro', l.id);
    setVal('p-libro-search', `${l.titulo} (${l.cantidadDisponible} disp.)`);
    setDisplay('p-libro-dropdown', 'none');
}
window.seleccionarLibroPrestamo = seleccionarLibroPrestamo;

// 5. autocompletado unificado (openlibrary y google books)
let debounceTimer = null, ultimoIsbn = '', busquedaActiva = false;
const sanitizarIsbn = (v) => (v || '').toString().replace(/[-\s]/g, '').trim().toUpperCase();
const esIsbnValido = (v) => (v.length === 13 && (v.startsWith('978') || v.startsWith('979'))) || (v.length === 10 && !v.startsWith('978') && !v.startsWith('979'));
const extraerAnio = (s) => (String(s || '').match(/\b(18|19|20)\d{2}\b/) || [''])[0];

function obtenerIdiomaConsultaLibros() {
    return (window.obtenerIdiomaActivo?.() || $('custom-lang-select')?.value || 'es').toLowerCase();
}
window.obtenerIdiomaConsultaLibros = obtenerIdiomaConsultaLibros;

function resolverGeneroAdaptado(cat, lang) {
    if (!cat) return '';
    if (typeof window.resolverMejorGenero === 'function' && Array.isArray(cat)) return window.resolverMejorGenero(cat, lang);
    if (typeof window.traducirOAdaptarGenero === 'function') return window.traducirOAdaptarGenero(cat, lang);
    return String(cat);
}

async function aplicarDatosLibroAFormulario(d) {
    const lang = obtenerIdiomaConsultaLibros();
    if (d.isbn) setVal('l-isbn', d.isbn);
    if (d.autor) setVal('l-autor', d.autor);
    if (d.anio) setVal('l-anio', d.anio);
    if (d.editorial && $('l-edicion') && !$('l-edicion').value) setVal('l-edicion', d.editorial);
    if (d.portada && $('l-url') && !$('l-url').value) setVal('l-url', d.portada);

    if (d.categoria) {
        const gen = resolverGeneroAdaptado(d.categoria, lang);
        if (window.tomSelectGenero) {
            window.tomSelectGenero.setValue(gen, true);
            if (!window.tomSelectGenero.getValue()) {
                window.tomSelectGenero.addOption({ value: gen, text: gen, optgroup: lang === 'es' ? 'Otros' : 'Others' });
                window.tomSelectGenero.setValue(gen, true);
            }
        } else setVal('l-genero', gen);
    }

    if (d.titulo) {
        let finalTitle = d.titulo;
        if (typeof window.traducirTextoLibre === 'function') {
            try { const tr = await window.traducirTextoLibre(d.titulo, lang); if (tr?.trim()) finalTitle = tr.trim(); }
            catch (e) { console.warn('error traduciendo titulo:', e); }
        }
        setVal('l-titulo', finalTitle);
        return finalTitle;
    }
    return d.titulo || '';
}
window.aplicarDatosLibroAFormulario = aplicarDatosLibroAFormulario;

async function consultarMetadatosApi({ isbn, titulo }) {
    const lang = obtenerIdiomaConsultaLibros();
    // 1. openlibrary
    try {
        if (isbn) {
            const r = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`);
            if (r.ok) {
                const b = (await r.json())[`ISBN:${isbn}`];
                if (b) return {
                    titulo: b.title,
                    autor: Array.isArray(b.authors) ? b.authors.map(a => a.name).join(', ') : '',
                    anio: extraerAnio(b.publish_date),
                    editorial: Array.isArray(b.publishers) ? b.publishers[0]?.name : '',
                    categoria: b.subjects,
                    portada: b.cover?.medium || b.cover?.large || ''
                };
            }
        }
        const q = isbn ? `isbn=${encodeURIComponent(isbn)}` : `title=${encodeURIComponent(titulo)}&fields=key,title,author_name,first_publish_year,publisher,subject,cover_i,isbn,language`;
        const rS = await fetch(`https://openlibrary.org/search.json?${q}&limit=5`);
        if (rS.ok) {
            const dataS = await rS.json();
            const docs = dataS.docs || [];
            const doc = docs.find(d => Array.isArray(d.language) && d.language.includes(lang === 'es' ? 'spa' : lang)) || docs[0];
            if (doc) {
                const isbns = (doc.isbn || []).map(sanitizarIsbn);
                return {
                    titulo: doc.title,
                    isbn: isbns.find(i => (i.startsWith('978') || i.startsWith('979')) && i.length === 13) || isbns[0] || '',
                    autor: Array.isArray(doc.author_name) ? doc.author_name.join(', ') : '',
                    anio: doc.first_publish_year ? String(doc.first_publish_year) : '',
                    editorial: Array.isArray(doc.publisher) ? doc.publisher[0] : '',
                    categoria: doc.subject,
                    portada: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : ''
                };
            }
        }
    } catch (e) { console.warn('openlibrary fallo:', e); }

    // 2. google books
    try {
        const param = isbn ? `isbn:${encodeURIComponent(isbn)}` : `intitle:${encodeURIComponent(titulo)}`;
        const rG = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${param}&hl=${encodeURIComponent(lang)}&maxResults=5`);
        if (rG.ok) {
            const dataG = await rG.json();
            const items = dataG.items || [];
            const item = items.find(it => it.volumeInfo?.language === lang) || items[0];
            const inf = item?.volumeInfo;
            if (inf) {
                const ids = inf.industryIdentifiers || [];
                return {
                    titulo: inf.title ? (inf.subtitle ? `${inf.title}: ${inf.subtitle}` : inf.title) : '',
                    isbn: (ids.find(i => i.type === 'ISBN_13') || ids.find(i => i.type === 'ISBN_10'))?.identifier || '',
                    autor: Array.isArray(inf.authors) ? inf.authors.join(', ') : (inf.authors || ''),
                    anio: extraerAnio(inf.publishedDate),
                    editorial: inf.publisher || '',
                    categoria: inf.categories,
                    portada: (inf.imageLinks?.thumbnail || inf.imageLinks?.smallThumbnail || '').replace('http://', 'https://')
                };
            }
        }
    } catch (e) { console.warn('google books fallo:', e); }
    return null;
}

async function ejecutarAutocompletado({ param, valor, indicadorId, errorMsg, noEncontradoMsg, silencioso }) {
    if (busquedaActiva) return;
    busquedaActiva = true;
    const ind = $(indicadorId);
    if (ind) { ind.style.display = 'inline-flex'; refreshIcons(); }
    try {
        const metadatos = await consultarMetadatosApi({ [param]: valor });
        if (metadatos) {
            const t = await aplicarDatosLibroAFormulario(metadatos);
            toastNotificacion(`encontrado:"${t || metadatos.titulo}"`, 'success');
        } else if (!silencioso) {
            toastNotificacion(noEncontradoMsg, 'info');
        }
    } catch {
        if (!silencioso) toastNotificacion(errorMsg, 'warning');
    } finally {
        busquedaActiva = false;
        if (ind) ind.style.display = 'none';
    }
}

async function autocompletarLibroPorISBN(val, silencioso = false) {
    const clean = sanitizarIsbn(val);
    if (!esIsbnValido(clean)) {
        if (!silencioso && (val || '').trim().length > 0) toastNotificacion('ingresa un isbn valido de 10 o 13 digitos', 'warning');
        return;
    }
    if (clean === ultimoIsbn) return;
    ultimoIsbn = clean;
    await ejecutarAutocompletado({
        param: 'isbn', valor: clean, indicadorId: 'isbn-loading-indicator',
        errorMsg: 'no se pudo conectar con el servicio de libros',
        noEncontradoMsg: `no se encontro el isbn ${clean}. ingresa los datos manualmente.`,
        silencioso
    });
}
window.autocompletarLibroPorISBN = autocompletarLibroPorISBN;

async function autocompletarLibroPorTitulo(val, silencioso = false) {
    const raw = (val || '').toString().trim();
    if (raw.length < 2) {
        if (!silencioso && raw.length > 0) toastNotificacion('ingresa al menos 2 caracteres del titulo', 'warning');
        return;
    }
    await ejecutarAutocompletado({
        param: 'titulo', valor: raw, indicadorId: 'titulo-loading-indicator',
        errorMsg: 'no se pudo conectar con el servicio de busqueda',
        noEncontradoMsg: `no se encontro informacion para "${raw}"`,
        silencioso
    });
}
window.autocompletarLibroPorTitulo = autocompletarLibroPorTitulo;

function inicializarListenersLibroFormulario() {
    const inputIsbn = $('l-isbn');
    if (inputIsbn) {
        const trig = (sil) => { const v = sanitizarIsbn(inputIsbn.value); if (esIsbnValido(v)) autocompletarLibroPorISBN(v, sil); };
        inputIsbn.addEventListener('input', () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(() => trig(true), 350); });
        inputIsbn.addEventListener('paste', () => setTimeout(() => trig(true), 100));
        inputIsbn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); trig(false); } });
        inputIsbn.addEventListener('blur', () => { if (sanitizarIsbn(inputIsbn.value) !== ultimoIsbn) trig(true); });
    }
    const inputTitulo = $('l-titulo');
    if (inputTitulo) {
        inputTitulo.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); autocompletarLibroPorTitulo(inputTitulo.value, false); }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarListenersLibroFormulario);
} else {
    inicializarListenersLibroFormulario();
}
