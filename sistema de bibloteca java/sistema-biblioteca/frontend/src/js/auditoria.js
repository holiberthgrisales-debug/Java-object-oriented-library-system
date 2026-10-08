/* modulo de auditoria y trazabilidad 
 */

// estado reactivo del modulo
const AuditoriaState = {
    todosLosLogs: [],
    logsFiltrados: [],
    cargando: false,
    ultimaCarga: null,
    filtros: {
        fechaDesde: '',
        fechaHasta: '',
        presetFecha: 'todo',
        entidad: 'todas',
        accion: 'todas',
        busqueda: ''
    },
    paginacion: {
        paginaActual: 1,
        limite: 25,
        totalPaginas: 1
    }
};

// diccionarios o(1) para estilos, iconos y etiquetas
const ACCIONES = {
    CREAR: { clase: 'badge-audit-crear', icono: 'plus-circle', label: 'Nuevo' },
    MODIFICAR: { clase: 'badge-audit-modificar', icono: 'edit-2', label: 'Modificado' },
    ELIMINAR: { clase: 'badge-audit-eliminar', icono: 'trash-2', label: 'Eliminado' },
    PRESTAR: { clase: 'badge-audit-prestar', icono: 'arrow-up-right', label: 'Préstamo' },
    DEVOLVER: { clase: 'badge-audit-devolver', icono: 'arrow-down-left', label: 'Devolución' }
};

const ENTIDADES = {
    LIBRO: { clase: 'badge-entity-libro', icono: 'book', label: 'Libro' },
    USUARIO: { clase: 'badge-entity-usuario', icono: 'user', label: 'Socio' },
    PRESTAMO: { clase: 'badge-entity-prestamo', icono: 'bookmark', label: 'Préstamo' }
};

const $ = id => document.getElementById(id);
const esc = s => (window.esc ? window.esc(s) : String(s ?? ''));
const getConfigAccion = a => ACCIONES[(a || '').toUpperCase().trim()] || { clase: 'badge-audit-general', icono: 'activity', label: a || 'Operación' };
const getConfigEntidad = e => ENTIDADES[(e || '').toUpperCase().trim()] || { clase: 'badge-entity-general', icono: 'database', label: e || 'General' };

/* *
 * formateo amigable de fecha y calculo de tiempo relativo.
 */
function formatearFechaHoraAudit(isoStr) {
    if (!isoStr) return { texto: '-', relativo: '' };
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return { texto: isoStr, relativo: '' };
    const p = n => String(n).padStart(2, '0');
    const texto = `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    let relativo = '';
    if (diff < 60) relativo = 'hace un momento';
    else if (diff < 3600) relativo = `hace ${Math.floor(diff / 60)} min`;
    else if (diff < 86400) relativo = `hace ${Math.floor(diff / 3600)} h`;
    else if (diff < 172800) relativo = 'ayer';
    else if (diff < 2592000) relativo = `hace ${Math.floor(diff / 86400)} días`;
    else relativo = `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
    return { texto, relativo };
}

/* *
 * intenta parsear json o estructurar texto para el visor modal.
 */
function parsearDetalles(det) {
    if (!det) return { esJson: false, valor: 'Sin descripción adicional disponible.' };
    const str = String(det).trim();
    if ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) {
        try { return { esJson: true, valor: JSON.parse(str) }; } catch { }
    }
    return { esJson: false, valor: str };
}

/* *
 * ingesta e indexacion previa para acelerar filtros de busqueda reactiva.
 */
function normalizarLogs(items) {
    return items.map(l => {
        const a = (l.accion || '').toUpperCase().trim();
        const e = (l.entidad || '').toUpperCase().trim();
        const f = l.fechaRegistro ? l.fechaRegistro.slice(0, 10) : '';
        const r = l.usuarioResponsable || 'Sistema';
        const d = l.detalles || '';
        return {
            ...l,
            _accion: a,
            _entidad: e,
            _fecha: f,
            _resp: r,
            _det: d,
            _search: `${l.id} ${l.entidadId ?? ''} ${r} ${d} ${e} ${a}`.toLowerCase(),
            _fmt: null
        };
    });
}

/* *
 * carga de registros desde el backend con manejo de carga y cache.
 */
async function cargarAuditoria(forzar = false) {
    if (!forzar && AuditoriaState.todosLosLogs.length > 0) {
        return aplicarFiltrosAuditoria();
    }
    if (AuditoriaState.cargando) return;
    AuditoriaState.cargando = true;

    const tbody = $('tbody-auditoria');
    if (tbody && !AuditoriaState.todosLosLogs.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="search-empty-state"><div style="display:flex;flex-direction:column;align-items:center;gap:0.75rem;padding:2rem;"><i data-lucide="loader-2" class="spin-animation" style="width:28px;height:28px;color:var(--primary);"></i><span style="font-weight:500;">Consultando registros de auditoría y trazabilidad...</span></div></td></tr>`;
        if (window.lucide) lucide.createIcons();
    }

    const btn = $('btn-refresh-auditoria');
    btn?.classList.add('btn-loading');

    try {
        const res = typeof window.api === 'function' ? await window.api('/auditoria') : await fetch('/auditoria').then(r => r.json());
        let items = Array.isArray(res) ? res : (res?.items || []);
        items.sort((a, b) => (b.id || 0) - (a.id || 0));

        AuditoriaState.todosLosLogs = normalizarLogs(items);
        AuditoriaState.ultimaCarga = new Date();

        const badge = $('audit-last-sync');
        if (badge) badge.textContent = `Sincronizado: ${AuditoriaState.ultimaCarga.toLocaleTimeString()}`;

        aplicarFiltrosAuditoria();
    } catch (err) {
        console.error('Error al cargar auditoría:', err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" class="search-empty-state"><div style="color:var(--color-danger);display:flex;flex-direction:column;align-items:center;gap:0.5rem;"><i data-lucide="alert-triangle" style="width:24px;height:24px;"></i><span>Error al cargar registros: ${esc(err.message)}</span><button type="button" class="btn-secondary" onclick="window.cargarAuditoria(true)" style="margin-top:0.5rem;">Reintentar</button></div></td></tr>`;
            if (window.lucide) lucide.createIcons();
        }
    } finally {
        AuditoriaState.cargando = false;
        btn?.classList.remove('btn-loading');
    }
}

/* *
 * filtrado en memoria a velocidad ultra rapida mediante indices pre-calculados.
 */
function aplicarFiltrosAuditoria() {
    if (!AuditoriaState.todosLosLogs.length && !AuditoriaState.cargando) {
        return cargarAuditoria();
    }

    const { fechaDesde: d, fechaHasta: h, entidad: ent, accion: acc, busqueda: q } = AuditoriaState.filtros;
    const term = (q || '').toLowerCase().trim();
    const entF = ent === 'todas' ? null : ent.toUpperCase();
    const accF = acc === 'todas' ? null : acc.toUpperCase();

    AuditoriaState.logsFiltrados = AuditoriaState.todosLosLogs.filter(l => {
        if (entF && l._entidad !== entF) return false;
        if (accF && l._accion !== accF) return false;
        if (d && l._fecha < d) return false;
        if (h && l._fecha > h) return false;
        if (term && !l._search.includes(term)) return false;
        return true;
    });

    AuditoriaState.paginacion.paginaActual = 1;
    AuditoriaState.paginacion.totalPaginas = Math.max(1, Math.ceil(AuditoriaState.logsFiltrados.length / AuditoriaState.paginacion.limite));

    renderizarKpisAuditoria();
    renderizarTablaAuditoria();
}

/* *
 * actualiza los contadores metricos y resumen de filtros.
 */
function renderizarKpisAuditoria() {
    const total = AuditoriaState.todosLosLogs.length;
    let creaciones = 0, modificaciones = 0, eliminaciones = 0, movimientos = 0;

    for (let i = 0; i < total; i++) {
        const a = AuditoriaState.todosLosLogs[i]._accion;
        if (a === 'CREAR') creaciones++;
        else if (a === 'MODIFICAR') modificaciones++;
        else if (a === 'ELIMINAR') eliminaciones++;
        else if (a === 'PRESTAR' || a === 'DEVOLVER') movimientos++;
    }

    const setTxt = (id, v) => { const el = $(id); if (el) el.textContent = v.toLocaleString(); };
    setTxt('kpi-audit-total', total);
    setTxt('kpi-audit-crear', creaciones);
    setTxt('kpi-audit-modificar', modificaciones);
    setTxt('kpi-audit-criticos', eliminaciones + movimientos);

    const resEl = $('audit-filter-summary');
    if (resEl) {
        const f = AuditoriaState.logsFiltrados.length;
        resEl.textContent = f === total ? `Mostrando todos los registros (${total.toLocaleString()})` : `Filtrados ${f.toLocaleString()} de ${total.toLocaleString()} registros`;
    }
}

/* *
 * renderiza la pagina actual de registros en la tabla.
 */
function renderizarTablaAuditoria() {
    const tbody = $('tbody-auditoria');
    if (!tbody) return;

    const { paginaActual, limite } = AuditoriaState.paginacion;
    const lista = AuditoriaState.logsFiltrados;
    const total = lista.length;

    if (!total) {
        tbody.innerHTML = `<tr><td colspan="8" class="search-empty-state"><div style="display:flex;flex-direction:column;align-items:center;gap:0.5rem;padding:2rem;"><i data-lucide="info" style="width:36px;height:36px;color:var(--text-dim);"></i><span style="font-weight:600;font-size:0.95rem;">No se encontraron registros de auditoría</span><p style="color:var(--text-dim);font-size:0.82rem;margin:0;">Prueba modificando el rango de fechas o los filtros seleccionados.</p><button type="button" class="btn-secondary" onclick="window.limpiarFiltrosAuditoria()" style="margin-top:0.5rem;">Restablecer Filtros</button></div></td></tr>`;
        actualizarControlesPaginacion(0, 0, 0);
        if (window.lucide) lucide.createIcons();
        return;
    }

    const start = (paginaActual - 1) * limite;
    const end = Math.min(start + limite, total);
    const pagina = lista.slice(start, end);

    tbody.innerHTML = pagina.map(l => {
        if (!l._fmt) l._fmt = formatearFechaHoraAudit(l.fechaRegistro);
        const ca = getConfigAccion(l.accion);
        const ce = getConfigEntidad(l.entidad);
        const entidadIdStr = l.entidadId != null ? `#${l.entidadId}` : '-';
        const detClean = esc(l.detalles || '');
        const usrClean = esc(l.usuarioResponsable || 'Sistema');

        return `
            <tr class="audit-row" data-id="${l.id}">
                <td style="font-size:0.84rem;color:var(--text-dim);font-weight:600;">#${l.id}</td>
                <td>
                    <div class="audit-time-cell">
                        <span class="audit-time-text">${l._fmt.texto}</span>
                        ${l._fmt.relativo ? `<span class="audit-time-rel">${l._fmt.relativo}</span>` : ''}
                    </div>
                </td>
                <td>
                    <span class="badge-entity ${ce.clase}">
                        <i data-lucide="${ce.icono}" style="width:12px;height:12px;"></i>
                        <span>${ce.label}</span>
                    </span>
                </td>
                <td style="font-weight:600;font-size:0.84rem;color:var(--primary);">${entidadIdStr}</td>
                <td>
                    <span class="badge-audit-action ${ca.clase}">
                        <i data-lucide="${ca.icono}" style="width:12px;height:12px;"></i>
                        <span>${ca.label}</span>
                    </span>
                </td>
                <td>
                    <div class="audit-user-badge" title="${usrClean}">
                        <i data-lucide="user-check" style="width:14px;height:14px;color:var(--text-dim);"></i>
                        <span class="audit-user-name">${usrClean}</span>
                    </div>
                </td>
                <td>
                    <div class="audit-details-preview">
                        ${detClean || '<span style="color:var(--text-dim);font-style:italic;">Sin observaciones adicionales</span>'}
                    </div>
                </td>
                <td style="text-align:center;white-space:nowrap;">
                    <button type="button" class="btn-secondary" style="height:30px;padding:0 0.65rem;font-size:0.78rem;" onclick="window.verDetalleAuditoria(${l.id})" title="Ver información completa">
                        <i data-lucide="eye" style="width:13px;height:13px;"></i>
                        <span>Ver</span>
                    </button>
                </td>
            </tr>`;
    }).join('');

    actualizarControlesPaginacion(start + 1, end, total);
    if (window.lucide) lucide.createIcons();
}

/* *
 * actualiza los indicadores numericos y estados de los botones de paginacion.
 */
function actualizarControlesPaginacion(desde, hasta, total) {
    const { paginaActual, totalPaginas } = AuditoriaState.paginacion;
    const res = $('audit-paginacion-resumen');
    if (res) res.textContent = total > 0 ? `Mostrando ${desde} - ${hasta} de ${total.toLocaleString()} registros` : '0 registros';
    const cur = $('audit-pagina-actual'); if (cur) cur.textContent = paginaActual;
    const tot = $('audit-total-paginas'); if (tot) tot.textContent = totalPaginas;
    const p = $('btn-audit-prev'); if (p) p.disabled = paginaActual <= 1;
    const n = $('btn-audit-next'); if (n) n.disabled = paginaActual >= totalPaginas;
}

function cambiarPaginaAuditoria(delta) {
    const nueva = AuditoriaState.paginacion.paginaActual + delta;
    if (nueva >= 1 && nueva <= AuditoriaState.paginacion.totalPaginas) {
        AuditoriaState.paginacion.paginaActual = nueva;
        renderizarTablaAuditoria();
        document.querySelector('.content')?.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function cambiarLimiteAuditoria(lim) {
    AuditoriaState.paginacion.limite = parseInt(lim, 10) || 25;
    AuditoriaState.paginacion.paginaActual = 1;
    AuditoriaState.paginacion.totalPaginas = Math.max(1, Math.ceil(AuditoriaState.logsFiltrados.length / AuditoriaState.paginacion.limite));
    renderizarTablaAuditoria();
}

/* *
 * filtros de presets de fecha declarativos.
 */
function establecerPresetFecha(preset) {
    AuditoriaState.filtros.presetFecha = preset;
    document.querySelectorAll('.audit-preset-chip').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-preset') === preset);
    });

    const now = new Date();
    const toYMD = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const hoyStr = toYMD(now);
    let d = '', h = '';

    if (preset === 'hoy') {
        d = h = hoyStr;
    } else if (preset === '7d') {
        const d7 = new Date(); d7.setDate(d7.getDate() - 7);
        d = toYMD(d7); h = hoyStr;
    } else if (preset === 'mes') {
        d = toYMD(new Date(now.getFullYear(), now.getMonth(), 1)); h = hoyStr;
    }

    AuditoriaState.filtros.fechaDesde = d;
    AuditoriaState.filtros.fechaHasta = h;
    if ($('audit-fecha-desde')) $('audit-fecha-desde').value = d;
    if ($('audit-fecha-hasta')) $('audit-fecha-hasta').value = h;

    aplicarFiltrosAuditoria();
}

function limpiarFiltrosAuditoria() {
    AuditoriaState.filtros = { fechaDesde: '', fechaHasta: '', presetFecha: 'todo', entidad: 'todas', accion: 'todas', busqueda: '' };
    if ($('audit-fecha-desde')) $('audit-fecha-desde').value = '';
    if ($('audit-fecha-hasta')) $('audit-fecha-hasta').value = '';
    if ($('audit-select-entidad')) $('audit-select-entidad').value = 'todas';
    if ($('audit-select-accion')) $('audit-select-accion').value = 'todas';
    if ($('audit-input-busqueda')) $('audit-input-busqueda').value = '';

    document.querySelectorAll('.audit-preset-chip').forEach(b => b.classList.toggle('active', b.getAttribute('data-preset') === 'todo'));
    const clearBtn = $('btn-clear-audit-search');
    if (clearBtn) clearBtn.style.display = 'none';

    aplicarFiltrosAuditoria();
}

/* *
 * modal de detalle profundo con ficha y formateador json.
 */
function verDetalleAuditoria(id) {
    const log = AuditoriaState.todosLosLogs.find(l => l.id === id);
    if (!log) return;

    if (!log._fmt) log._fmt = formatearFechaHoraAudit(log.fechaRegistro);
    const ca = getConfigAccion(log.accion);
    const ce = getConfigEntidad(log.entidad);

    const setTxt = (idEl, val) => { const el = $(idEl); if (el) el.textContent = val; };
    setTxt('audit-modal-id', `#${log.id}`);
    setTxt('audit-modal-fecha', `${log._fmt.texto} (${log._fmt.relativo || 'hace poco'})`);
    setTxt('audit-modal-responsable', log.usuarioResponsable || 'Sistema / Administrador');
    setTxt('audit-modal-entidad-id', log.entidadId != null ? `#${log.entidadId}` : 'N/A');

    const be = $('audit-modal-badge-entidad');
    if (be) { be.className = `badge-entity ${ce.clase}`; be.innerHTML = `<i data-lucide="${ce.icono}" style="width:12px;height:12px;"></i> <span>${ce.label}</span>`; }

    const ba = $('audit-modal-badge-accion');
    if (ba) { ba.className = `badge-audit-action ${ca.clase}`; ba.innerHTML = `<i data-lucide="${ca.icono}" style="width:12px;height:12px;"></i> <span>${ca.label}</span>`; }

    const visor = $('audit-modal-detalles-visor');
    if (visor) {
        const p = parsearDetalles(log.detalles);
        visor.innerHTML = p.esJson
            ? `<pre class="audit-code-block">${esc(JSON.stringify(p.valor, null, 2))}</pre>`
            : `<div class="audit-text-block">${esc(p.valor)}</div>`;
    }

    const btnCopy = $('btn-audit-copiar-json');
    if (btnCopy) btnCopy.onclick = () => copiarJsonAuditoria(log);

    const modal = $('modal-detalle-auditoria');
    if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); }
    if (window.lucide) lucide.createIcons();
}

function cerrarModalAuditoria() {
    const modal = $('modal-detalle-auditoria');
    if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
}

async function copiarJsonAuditoria(log) {
    try {
        await navigator.clipboard.writeText(JSON.stringify(log, null, 2));
        if (typeof window.toastNotificacion === 'function') {
            window.toastNotificacion('Información copiada al portapapeles');
        } else if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'success', title: 'Copiado', text: 'Información copiada al portapapeles', timer: 1800, showConfirmButton: false });
        }
    } catch {
        alert('No se pudo acceder al portapapeles');
    }
}

/* *
 * exportacion a excel (.xlsx) estructurada.
 */
function exportarAuditoriaExcel() {
    if (typeof XLSX === 'undefined') {
        const err = 'La biblioteca SheetJS (XLSX) no está cargada en la aplicación.';
        if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Error de exportación', text: err }); else alert(err);
        return;
    }
    const data = AuditoriaState.logsFiltrados;
    if (!data.length) {
        if (typeof Swal !== 'undefined') Swal.fire({ icon: 'info', title: 'Sin datos', text: 'No hay eventos en la vista actual para exportar.' }); else alert('No hay eventos.');
        return;
    }

    const filas = data.map(item => ({
        'ID Evento': item.id,
        'Fecha y Hora': item.fechaRegistro,
        'Entidad': item.entidad,
        'ID Entidad': item.entidadId ?? '',
        'Acción': item.accion,
        'Usuario Responsable': item.usuarioResponsable || 'Sistema',
        'Detalles': item.detalles || ''
    }));

    const ws = XLSX.utils.json_to_sheet(filas);
    ws['!cols'] = [{ wch: 10 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 24 }, { wch: 50 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoria_Sistema');
    const nombre = `Auditoria_Biblioteca_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, nombre);
    if (typeof window.toastNotificacion === 'function') window.toastNotificacion(`Archivo ${nombre} descargado con éxito`);
}

/* *
 * exportacion a archivo csv con codificacion utf-8 bom.
 */
function exportarAuditoriaCsv() {
    const data = AuditoriaState.logsFiltrados;
    if (!data.length) return;

    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const filas = [
        'ID Evento,Fecha y Hora,Entidad,ID Entidad,Acción,Usuario Responsable,Detalles',
        ...data.map(i => [i.id, q(i.fechaRegistro), q(i.entidad), i.entidadId ?? '', q(i.accion), q(i.usuarioResponsable || 'Sistema'), q(i.detalles || '')].join(','))
    ];

    const blob = new Blob(['\uFEFF' + filas.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement('a'), { href: url, download: `Auditoria_Biblioteca_${new Date().toISOString().split('T')[0]}.csv` });
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

/* *
 * obtiene los ultimos n eventos de auditoria (para alimentar el widget del dashboard).
 */
async function obtenerAuditoriasRecientes(limite = 5) {
    if (AuditoriaState.todosLosLogs.length > 0) {
        return AuditoriaState.todosLosLogs.slice(0, limite);
    }
    try {
        const res = typeof window.api === 'function'
            ? await window.api(`/auditoria?limit=${limite}&page=1`)
            : await fetch(`/auditoria?limit=${limite}&page=1`).then(r => r.json());
        if (Array.isArray(res)) return res.slice(0, limite);
        if (res && Array.isArray(res.items)) return res.items;
        return [];
    } catch {
        return [];
    }
}

/* *
 * invalidacion de cache cuando se realizan cambios en libros, usuarios o prestamos.
 */
function invalidarCacheAuditoria() {
    AuditoriaState.todosLosLogs = [];
    const seccion = $('auditoria');
    if (seccion && (seccion.classList.contains('active') || seccion.style.display !== 'none')) {
        cargarAuditoria(true);
    }
}

/* *
 * inicializacion de escuchadores de eventos con debounce reactivo.
 */
function inicializarEventosAuditoria() {
    $('audit-fecha-desde')?.addEventListener('change', e => {
        AuditoriaState.filtros.fechaDesde = e.target.value;
        AuditoriaState.filtros.presetFecha = 'custom';
        document.querySelectorAll('.audit-preset-chip').forEach(b => b.classList.remove('active'));
        aplicarFiltrosAuditoria();
    });

    $('audit-fecha-hasta')?.addEventListener('change', e => {
        AuditoriaState.filtros.fechaHasta = e.target.value;
        AuditoriaState.filtros.presetFecha = 'custom';
        document.querySelectorAll('.audit-preset-chip').forEach(b => b.classList.remove('active'));
        aplicarFiltrosAuditoria();
    });

    $('audit-select-entidad')?.addEventListener('change', e => {
        AuditoriaState.filtros.entidad = e.target.value;
        aplicarFiltrosAuditoria();
    });

    $('audit-select-accion')?.addEventListener('change', e => {
        AuditoriaState.filtros.accion = e.target.value;
        aplicarFiltrosAuditoria();
    });

    let debounceTimer = null;
    const inputSearch = $('audit-input-busqueda');
    const btnClear = $('btn-clear-audit-search');

    inputSearch?.addEventListener('input', e => {
        const val = e.target.value;
        if (btnClear) btnClear.style.display = val ? 'inline-flex' : 'none';
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            AuditoriaState.filtros.busqueda = val;
            aplicarFiltrosAuditoria();
        }, 160);
    });

    btnClear?.addEventListener('click', () => {
        if (inputSearch) inputSearch.value = '';
        btnClear.style.display = 'none';
        AuditoriaState.filtros.busqueda = '';
        aplicarFiltrosAuditoria();
    });

    $('btn-restablecer-auditoria')?.addEventListener('click', limpiarFiltrosAuditoria);

    const modal = $('modal-detalle-auditoria');
    if (modal) modal.addEventListener('click', e => { if (e.target === modal) cerrarModalAuditoria(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal?.style.display !== 'none') cerrarModalAuditoria(); });

    const tabActual = window.__alpineRoot?.tab || localStorage.getItem('activeTab');
    if (tabActual === 'auditoria' || $('auditoria')?.classList.contains('active')) {
        cargarAuditoria();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarEventosAuditoria);
} else {
    inicializarEventosAuditoria();
}

// api global y aliases para alpine.js y eventos html
window.Auditoria = {
    cargar: cargarAuditoria,
    aplicarFiltros: aplicarFiltrosAuditoria,
    limpiarFiltros: limpiarFiltrosAuditoria,
    establecerPreset: establecerPresetFecha,
    verDetalle: verDetalleAuditoria,
    cerrarModal: cerrarModalAuditoria,
    cambiarPagina: cambiarPaginaAuditoria,
    cambiarLimite: cambiarLimiteAuditoria,
    exportarExcel: exportarAuditoriaExcel,
    exportarCsv: exportarAuditoriaCsv,
    obtenerRecientes: obtenerAuditoriasRecientes,
    invalidarCache: invalidarCacheAuditoria,
    getState: () => AuditoriaState
};

window.cargarAuditoria = cargarAuditoria;
window.limpiarFiltrosAuditoria = limpiarFiltrosAuditoria;
window.establecerPresetFecha = establecerPresetFecha;
window.verDetalleAuditoria = verDetalleAuditoria;
window.cerrarModalAuditoria = cerrarModalAuditoria;
window.cambiarPaginaAuditoria = cambiarPaginaAuditoria;
window.cambiarLimiteAuditoria = cambiarLimiteAuditoria;
window.exportarAuditoriaExcel = exportarAuditoriaExcel;
window.exportarAuditoriaCsv = exportarAuditoriaCsv;
window.invalidarCacheAuditoria = invalidarCacheAuditoria;
