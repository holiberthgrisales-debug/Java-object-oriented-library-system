// 
// modulo de traduccion e idiomas (google translate + sincronizacion ui)

// inicializador seguro de google translate (respaldo si se llama directamente)
export function googleTranslateElementInit() {
    if (typeof google === 'undefined' || !google.translate) return;
    try {
        new google.translate.TranslateElement({
            pageLanguage: 'es',
            includedLanguages: 'es,en,fr,de,it,pt',
            layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false
        }, 'google_translate_element');
    } catch { }
}
if (!window.googleTranslateElementInit) {
    window.googleTranslateElementInit = googleTranslateElementInit;
}

// elimina cookies de traduccion para resetear a espanol
export function borrarCookiesTraduccion() {
    const host = window.location.hostname;
    const dominios = ['', host, '.' + host];
    const rutas = ['/', window.location.pathname];
    dominios.forEach(d => {
        rutas.forEach(p => {
            document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${p};` + (d ? ` domain=${d};` : '');
        });
    });
}

// obtiene el codigo del idioma activo ('es', 'en', 'fr', 'de', 'it', 'pt')
export function obtenerIdiomaActivo() {
    const guardado = localStorage.getItem('idioma_seleccionado');
    if (guardado) return guardado.toLowerCase();

    const match = document.cookie.match(/googtrans=\/es\/([a-z]{2})/i);
    return match?.[1] ? match[1].toLowerCase() : 'es';
}

// cambia el idioma en toda la aplicacion
export function cambiarIdiomaGoogle(lang) {
    const target = (lang || 'es').toLowerCase();

    localStorage.setItem('idioma_seleccionado', target);

    const sel = document.getElementById('custom-lang-select');
    if (sel && sel.value !== target) sel.value = target;

    // 1. limpiar cookies previas para evitar conflictos
    borrarCookiesTraduccion();

    // 2. si el idioma es espanol, recargar directamente en idioma base
    if (target === 'es') {
        setTimeout(() => window.location.reload(), 100);
        return;
    }

    // 3. configurar cookie de google translate para el nuevo idioma
    const hostname = window.location.hostname;
    const cookieVal = `/es/${target}`;
    document.cookie = `googtrans=${cookieVal}; path=/;`;
    if (hostname && hostname !== 'localhost') {
        document.cookie = `googtrans=${cookieVal}; domain=${hostname}; path=/;`;
        document.cookie = `googtrans=${cookieVal}; domain=.${hostname}; path=/;`;
    }

    // 4. recargar para que google translate procese el dom original y traduzca todo limpiamente
    setTimeout(() => window.location.reload(), 100);
}

// sincroniza el selector superior y las cookies al cargar o refrescar la pagina
function sincronizarSelectorIdioma() {
    const guardado = (localStorage.getItem('idioma_seleccionado') || 'es').toLowerCase();
    const sel = document.getElementById('custom-lang-select');
    if (sel && sel.value !== guardado) {
        sel.value = guardado;
    }

    // si el usuario eligio un idioma pero la cookie de google translate no esta activa al recargar,
    // escribirla inmediatamente para que google translate no caiga en espanol por defecto.
    if (guardado && guardado !== 'es') {
        const match = document.cookie.match(/googtrans=\/es\/([a-z]{2})/i);
        if (!match || match[1].toLowerCase() !== guardado) {
            const cookieVal = `/es/${guardado}`;
            document.cookie = `googtrans=${cookieVal}; path=/;`;
            if (window.location.hostname && window.location.hostname !== 'localhost') {
                document.cookie = `googtrans=${cookieVal}; domain=${window.location.hostname}; path=/;`;
            }
            setTimeout(() => window.location.reload(), 80);
        }
    }
}

// sincroniza campos dinamicos (generos, titulos)
export async function actualizarCamposAlCambiarIdioma(lang) {
    const targetLang = (lang || obtenerIdiomaActivo()).toLowerCase();
    if (typeof window.actualizarTomSelectIdioma === 'function') {
        window.actualizarTomSelectIdioma(targetLang);
    }
}

// inicializacion
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sincronizarSelectorIdioma);
} else {
    sincronizarSelectorIdioma();
}

// exportar al ambito global
window.googleTranslateElementInit = googleTranslateElementInit;
window.cambiarIdiomaGoogle = cambiarIdiomaGoogle;
window.obtenerIdiomaActivo = obtenerIdiomaActivo;
window.actualizarCamposAlCambiarIdioma = actualizarCamposAlCambiarIdioma;
window.borrarCookiesTraduccion = borrarCookiesTraduccion;
