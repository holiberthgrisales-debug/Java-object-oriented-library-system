// funciones de codigos de barra y qr

(function () {
    'use strict';

    let html5QrCodeScanner = null;
    let escanerActivo = false;

    // llama al backend
    async function llamarApi(endpoint) {
        if (typeof window.api === 'function') {
            return window.api(endpoint);
        }
        const baseUrl = (typeof window !== 'undefined' && window.location && window.location.port === '5173')
            ? `${window.location.protocol}//${window.location.hostname}:3001`
            : '';
        const res = await fetch(`${baseUrl}${endpoint}`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    }

    // alertas rapidas
    function notificar(msg, tipo = 'success') {
        if (typeof window.toastNotificacion === 'function') {
            window.toastNotificacion(msg, tipo);
        } else if (typeof Swal !== 'undefined') {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: tipo,
                title: msg,
                showConfirmButton: false,
                timer: 2500,
                timerProgressBar: true
            });
        }
    }

    // helpers para dibujar el codigo de barras y el qr

    function generarBarcode(selector, valor, opciones = {}) {
        if (typeof JsBarcode === 'undefined') return;
        try {
            JsBarcode(selector, valor, {
                format: 'CODE128',
                width: opciones.width || 2,
                height: opciones.height || 45,
                displayValue: true,
                fontSize: opciones.fontSize || 12,
                font: 'Inter, sans-serif',
                textMargin: 3,
                lineColor: opciones.lineColor || '#0f172a',
                background: '#ffffff'
            });
        } catch (err) {
            console.warn('Error al generar código de barras:', err);
        }
    }

    function generarQRCode(containerId, datosObj, size = 85) {
        const container = document.getElementById(containerId);
        if (!container || typeof QRCode === 'undefined') return;
        container.innerHTML = '';
        try {
            new QRCode(container, {
                text: typeof datosObj === 'string' ? datosObj : JSON.stringify(datosObj),
                width: size,
                height: size,
                colorDark: '#0f172a',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M
            });
        } catch (err) {
            console.warn('Error al generar código QR:', err);
        }
    }

    // modal para ver e imprimir etiqueta del libro

    function abrirModalEtiquetaLibro(libro) {
        if (!libro) return;
        const modal = document.getElementById('modal-etiqueta-libro');
        if (!modal) return;

        document.getElementById('etiqueta-libro-titulo').textContent = libro.titulo || 'Sin título';
        document.getElementById('etiqueta-libro-autor').textContent = libro.autor ? `Autor: ${libro.autor}` : '';
        document.getElementById('etiqueta-libro-isbn').textContent = libro.isbn ? `ISBN: ${libro.isbn}` : `ID: LIB-${libro.id}`;
        document.getElementById('etiqueta-libro-ubicacion').textContent = libro.ubicacion ? `Ubicación: ${libro.ubicacion}` : 'Acervo General';
        document.getElementById('etiqueta-libro-genero').textContent = libro.genero || 'General';

        // codigo de barras
        const barcodeVal = libro.isbn && libro.isbn.trim().length >= 3
            ? libro.isbn.replace(/[^a-zA-Z0-9]/g, '')
            : `LIB${String(libro.id).padStart(6, '0')}`;
        generarBarcode('#etiqueta-barcode-svg', barcodeVal, { width: 2, height: 48, fontSize: 12 });

        // codigo qr
        generarQRCode('etiqueta-qr-container', {
            tipo: 'LIBRO',
            id: libro.id,
            titulo: libro.titulo,
            isbn: libro.isbn || ''
        }, 88);

        modal.style.display = 'flex';
    }

    function cerrarModalEtiquetaLibro() {
        const modal = document.getElementById('modal-etiqueta-libro');
        if (modal) modal.style.display = 'none';
    }

    // modal para el carnet del socio

    function abrirModalCarnetUsuario(usuario) {
        if (!usuario) return;
        const modal = document.getElementById('modal-carnet-usuario');
        if (!modal) return;

        document.getElementById('carnet-socio-nombre').textContent = usuario.nombre || 'Socio Biblioteca';
        document.getElementById('carnet-socio-doc').textContent = usuario.identificacion ? `CC: ${usuario.identificacion}` : `ID: SOC-${usuario.id}`;
        document.getElementById('carnet-socio-id').textContent = `SOC-${String(usuario.id).padStart(5, '0')}`;
        document.getElementById('carnet-socio-email').textContent = usuario.email || 'Sin correo';
        document.getElementById('carnet-socio-tel').textContent = usuario.telefono || '';

        // codigo de barras
        const barcodeVal = usuario.identificacion && usuario.identificacion.trim().length >= 3
            ? usuario.identificacion.replace(/[^a-zA-Z0-9]/g, '')
            : `SOC${String(usuario.id).padStart(6, '0')}`;
        generarBarcode('#carnet-barcode-svg', barcodeVal, { width: 1.8, height: 40, fontSize: 11 });

        // codigo qr
        generarQRCode('carnet-qr-container', {
            tipo: 'USUARIO',
            id: usuario.id,
            doc: usuario.identificacion || '',
            nombre: usuario.nombre
        }, 76);

        modal.style.display = 'flex';
    }

    function cerrarModalCarnetUsuario() {
        const modal = document.getElementById('modal-carnet-usuario');
        if (modal) modal.style.display = 'none';
    }

    // lector con la camara web o subiendo foto

    async function abrirModalEscaner() {
        const modal = document.getElementById('modal-escaner-camara');
        if (!modal) return;

        modal.style.display = 'flex';
        const feedbackEl = document.getElementById('escaner-feedback');
        if (feedbackEl) {
            feedbackEl.textContent = 'Iniciando cámara web...';
            feedbackEl.className = 'scanner-status-info';
        }

        if (typeof Html5Qrcode === 'undefined') {
            if (feedbackEl) {
                feedbackEl.textContent = 'La librería de escaneo no se encuentra disponible. Usa la opción de foto.';
                feedbackEl.className = 'scanner-status-warning';
            }
            return;
        }

        try {
            if (!html5QrCodeScanner) {
                html5QrCodeScanner = new Html5Qrcode('reader-camara-box');
            }

            const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
            await html5QrCodeScanner.start(
                { facingMode: 'environment' },
                config,
                onCodigoEscaneadoExito,
                () => { } // ignora cuadros sin codigo
            );
            escanerActivo = true;

            if (feedbackEl) {
                feedbackEl.textContent = 'Apunta la cámara al código QR o de barras.';
                feedbackEl.className = 'scanner-status-active';
            }
        } catch (err) {
            console.warn('No fue posible acceder a la cámara:', err);
            if (feedbackEl) {
                feedbackEl.innerHTML = `⚠️ Sin acceso a cámara (${err.message || 'Permiso denegado'}). Puedes <strong>subir una foto</strong> abajo.`;
                feedbackEl.className = 'scanner-status-warning';
            }
        }
    }

    async function cerrarModalEscaner() {
        const modal = document.getElementById('modal-escaner-camara');
        if (modal) modal.style.display = 'none';

        if (html5QrCodeScanner && escanerActivo) {
            try {
                await html5QrCodeScanner.stop();
            } catch (e) {
                console.warn('Error al detener cámara:', e);
            }
            escanerActivo = false;
        }
    }

    function onCodigoEscaneadoExito(decodedText) {
        if (!decodedText) return;
        reproducirBeepConfirmacion();
        procesarResultadoEscaneo(decodedText);
        cerrarModalEscaner();
    }

    async function escanearDesdeArchivo(inputElement) {
        if (!inputElement?.files?.length) return;
        const file = inputElement.files[0];
        const feedbackEl = document.getElementById('escaner-feedback');
        if (feedbackEl) feedbackEl.textContent = 'Procesando imagen...';

        try {
            if (!html5QrCodeScanner) {
                html5QrCodeScanner = new Html5Qrcode('reader-camara-box');
            }
            const decodedText = await html5QrCodeScanner.scanFile(file, true);
            reproducirBeepConfirmacion();
            procesarResultadoEscaneo(decodedText);
            cerrarModalEscaner();
        } catch {
            if (feedbackEl) {
                feedbackEl.textContent = 'No se detectó ningún código legible en la imagen.';
                feedbackEl.className = 'scanner-status-warning';
            }
        }
    }

    // procesa lo que leyo el escaner y llena el formulario
    async function procesarResultadoEscaneo(texto) {
        texto = (texto || '').trim();
        if (!texto) return;

        // si viene en formato json directo del qr
        if (texto.startsWith('{') && texto.endsWith('}')) {
            try {
                const payload = JSON.parse(texto);
                if (payload?.tipo === 'USUARIO') {
                    asignarSocioEnFormulario(payload.id, payload.nombre, payload.doc);
                    return;
                }
                if (payload?.tipo === 'LIBRO') {
                    asignarLibroEnFormulario(payload.id, payload.titulo, payload.isbn);
                    return;
                }
            } catch {
                // si falla el parseo continuamos con la resolucion en backend
            }
        }

        // le pide al backend de java que resuelva el codigo
        try {
            const res = await llamarApi(`/barcode/resolver/${encodeURIComponent(texto)}`);
            if (res && res.encontrado) {
                if (res.tipo === 'AMBIGUO') {
                    if (typeof Swal !== 'undefined') {
                        const { isConfirmed } = await Swal.fire({
                            title: 'Código Ambiguo',
                            text: `El código "${texto}" coincide tanto con un Libro como con un Socio. ¿Cuál deseas seleccionar?`,
                            icon: 'question',
                            showCancelButton: true,
                            confirmButtonText: `Libro: ${res.libro?.titulo || 'ID ' + texto}`,
                            cancelButtonText: `Socio: ${res.usuario?.nombre || 'ID ' + texto}`,
                            customClass: {
                                confirmButton: 'cyber-swal-btn-primary',
                                cancelButton: 'cyber-swal-btn-secondary'
                            }
                        });
                        if (isConfirmed && res.libro) {
                            asignarLibroEnFormulario(res.libro.id, res.libro.titulo, res.libro.isbn);
                        } else if (!isConfirmed && res.usuario) {
                            asignarSocioEnFormulario(res.usuario.id, res.usuario.nombre, res.usuario.identificacion);
                        }
                    } else {
                        const opcion = confirm(`El código "${texto}" coincide con el Libro "${res.libro?.titulo}" y el Socio "${res.usuario?.nombre}".\nPresiona Aceptar para Libro o Cancelar para Socio.`);
                        if (opcion && res.libro) {
                            asignarLibroEnFormulario(res.libro.id, res.libro.titulo, res.libro.isbn);
                        } else if (!opcion && res.usuario) {
                            asignarSocioEnFormulario(res.usuario.id, res.usuario.nombre, res.usuario.identificacion);
                        }
                    }
                    return;
                }
                if (res.tipo === 'LIBRO' && res.datos) {
                    asignarLibroEnFormulario(res.datos.id, res.datos.titulo, res.datos.isbn);
                    return;
                }
                if (res.tipo === 'USUARIO' && res.datos) {
                    asignarSocioEnFormulario(res.datos.id, res.datos.nombre, res.datos.identificacion);
                    return;
                }
            }
            notificar(`Código escaneado: "${texto}"`, 'info');
        } catch {
            notificar(`Código escaneado: "${texto}"`, 'info');
        }
    }

    function asignarSocioEnFormulario(id, nombre, doc) {
        const inputHidden = document.getElementById('p-usuario');
        const inputSearch = document.getElementById('p-usuario-search');
        if (inputHidden && inputSearch) {
            inputHidden.value = id;
            inputSearch.value = `${nombre || 'Socio'} (CC: ${doc || id})`;
            notificar(`Socio seleccionado: ${nombre || 'ID ' + id}`, 'success');
        }
    }

    function asignarLibroEnFormulario(id, titulo) {
        const inputHidden = document.getElementById('p-libro');
        const inputSearch = document.getElementById('p-libro-search');
        if (inputHidden && inputSearch) {
            inputHidden.value = id;
            inputSearch.value = `${titulo || 'Libro'} [ID: ${id}]`;
            notificar(`Libro seleccionado: ${titulo || 'ID ' + id}`, 'success');
        }
    }

    function reproducirBeepConfirmacion() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.12);
        } catch {
            // por si el navegador no deja reproducir audio
        }
    }

    // funcion para imprimir la tarjeta

    function imprimirContenedor(elementId) {
        const elemento = document.getElementById(elementId);
        if (!elemento) return;

        const ventana = window.open('', '_blank', 'width=750,height=600');
        ventana.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Imprimir - Biblioteca</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Inter', sans-serif; margin: 20px; background: #ffffff; color: #0f172a; }
                    .print-card-wrap { display: flex; justify-content: center; align-items: center; padding: 20px; }
                    @media print { body { margin: 0; padding: 0; } .no-print { display: none !important; } }
                </style>
            </head>
            <body>
                <div class="print-card-wrap">${elemento.outerHTML}</div>
                <script>
                    window.onload = function() {
                        window.focus();
                        window.print();
                        setTimeout(() => window.close(), 500);
                    };
                </script>
            </body>
            </html>
        `);
        ventana.document.close();
    }

    // funciones globales
    window.BarcodeQR = {
        abrirModalEtiquetaLibro,
        cerrarModalEtiquetaLibro,
        abrirModalCarnetUsuario,
        cerrarModalCarnetUsuario,
        abrirModalEscaner,
        cerrarModalEscaner,
        escanearDesdeArchivo,
        imprimirContenedor
    };

})();
