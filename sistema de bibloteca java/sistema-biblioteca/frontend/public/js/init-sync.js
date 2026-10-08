// 
// inicializacion temprana (tema + cookie de traduccion + callback google)
// este script se ejecuta en <head> de forma sincrona sin parpadeos
// 

(function () {
    try {
        // 1. restaurar tema claro/oscuro antes de que el navegador pinte el dom
        const theme = localStorage.getItem('theme');
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }

        // 2. sincronizar cookie googtrans con el idioma guardado antes de que cargue google translate
        const lang = (localStorage.getItem('idioma_seleccionado') || '').toLowerCase();
        if (lang && lang !== 'es') {
            const cookieVal = '/es/' + lang;
            document.cookie = 'googtrans=' + cookieVal + '; path=/;';
            if (location.hostname && location.hostname !== 'localhost') {
                document.cookie = 'googtrans=' + cookieVal + '; domain=' + location.hostname + '; path=/;';
            }
        } else if (lang === 'es') {
            document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        }
    } catch (e) { }
})();

// inicializador sincrono registrado para el callback cb=googletranslateelementinit
function googleTranslateElementInit() {
    if (typeof google === 'undefined' || !google.translate) return;
    try {
        new google.translate.TranslateElement({
            pageLanguage: 'es',
            includedLanguages: 'es,en,fr,de,it,pt',
            layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false
        }, 'google_translate_element');
    } catch (e) { }
}
window.googleTranslateElementInit = googleTranslateElementInit;

// 
// proxies tempranos de auditoria (garantiza disponibilidad en onclick de botones)
// 
window.establecerPresetFecha = window.establecerPresetFecha || function (p) {
    if (window.Auditoria && typeof window.Auditoria.establecerPreset === 'function') {
        window.Auditoria.establecerPreset(p);
    }
};

window.limpiarFiltrosAuditoria = window.limpiarFiltrosAuditoria || function () {
    if (window.Auditoria && typeof window.Auditoria.limpiarFiltros === 'function') {
        window.Auditoria.limpiarFiltros();
    }
};

window.cargarAuditoria = window.cargarAuditoria || function (f) {
    if (window.Auditoria && typeof window.Auditoria.cargar === 'function') {
        return window.Auditoria.cargar(f);
    }
};

window.verDetalleAuditoria = window.verDetalleAuditoria || function (id) {
    if (window.Auditoria && typeof window.Auditoria.verDetalle === 'function') {
        window.Auditoria.verDetalle(id);
    }
};

window.cerrarModalAuditoria = window.cerrarModalAuditoria || function () {
    if (window.Auditoria && typeof window.Auditoria.cerrarModal === 'function') {
        window.Auditoria.cerrarModal();
    }
};

window.cambiarPaginaAuditoria = window.cambiarPaginaAuditoria || function (d) {
    if (window.Auditoria && typeof window.Auditoria.cambiarPagina === 'function') {
        window.Auditoria.cambiarPagina(d);
    }
};

window.cambiarLimiteAuditoria = window.cambiarLimiteAuditoria || function (l) {
    if (window.Auditoria && typeof window.Auditoria.cambiarLimite === 'function') {
        window.Auditoria.cambiarLimite(l);
    }
};

window.exportarAuditoriaExcel = window.exportarAuditoriaExcel || function () {
    if (window.Auditoria && typeof window.Auditoria.exportarExcel === 'function') {
        window.Auditoria.exportarExcel();
    }
};

window.exportarAuditoriaCsv = window.exportarAuditoriaCsv || function () {
    if (window.Auditoria && typeof window.Auditoria.exportarCsv === 'function') {
        window.Auditoria.exportarCsv();
    }
};

