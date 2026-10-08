// gestion del tema claro y oscuro de la aplicacion

// colores para alertas y modales segun el tema actual
function obtenerColorTema() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return {
        bg: isLight ? '#ffffff' : '#1e293b',
        color: isLight ? '#0f172a' : '#f8fafc',
        border: isLight ? '#e2e8f0' : '#334155'
    };
}
window.obtenerColorTema = obtenerColorTema;

// cambia el icono entre sol y luna sin reescanear todo el dom
function actualizarIconoTema(isLight) {
    const slot = document.getElementById('theme-icon-slot');
    if (!slot) return;
    slot.innerHTML = isLight ? '<i data-lucide="moon"></i>' : '<i data-lucide="sun"></i>';
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: slot });
}
window.actualizarIconoTema = actualizarIconoTema;

// cambio de tema instantaneo y ligero
function alternarTema() {
    const isLight = document.documentElement.getAttribute('data-theme') !== 'light';
    if (isLight) {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'dark');
    }
    actualizarIconoTema(isLight);

    // solo recalcular estadisticas si la pestana esta activa y de forma asincrona
    const tab = window.__alpineRoot?.tab || localStorage.getItem('activeTab');
    if (tab === 'estadisticas' && typeof window.actualizarDashboardEstadisticas === 'function') {
        requestAnimationFrame(() => window.actualizarDashboardEstadisticas());
    }
}
window.alternarTema = alternarTema;

// inicializa el tema guardado al cargar la pagina
function inicializarTema() {
    const isLight = localStorage.getItem('theme') === 'light';
    if (isLight) document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
    actualizarIconoTema(isLight);

    const btn = document.getElementById('theme-toggle');
    if (btn) btn.addEventListener('click', alternarTema);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarTema);
} else {
    inicializarTema();
}
