/* *
 * modulo de estadisticas y analitica gerencial
 * arquitectura modular reactiva, apexcharts y reporte excel estructurado.
 * codigo ultra-limpio: single-pass o(1), constructores dry y cero redundancias.
 */
(() => {
    'use strict';

    // 1. estado y configuracion
    const charts = { tendencia: null, generos: null, inventario: null, dias: null };
    const chartConfig = {
        tendencia: { tipo: 'area', periodo: '6m' },
        generos: { tipo: 'donut', modo: 'catalogo' }, // 'catalogo' | 'demanda'
        inventario: { vista: 'estado' },              // 'estado' | 'cumplimiento'
        dias: { vista: 'dias' }                       // 'dias' | 'ingresos'
    };
    const viewState = {
        topLibrosTab: 'pedidos', // 'pedidos' | 'frios'
        sociosTab: 'activos',    // 'activos' | 'inactivos'
        periodoActual: 'all',
        lastData: null
    };

    // 2. utilidades basicas y formato
    const $ = (id) => document.getElementById(id);
    const setText = (id, val) => { const el = $(id); if (el) el.textContent = val ?? '0'; };
    const setHtml = (id, html) => { const el = $(id); if (el) el.innerHTML = html || ''; };
    const isLight = () => document.documentElement.getAttribute('data-theme') === 'light';
    const esc = (s) => (typeof window.esc === 'function' ? window.esc(s) : String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]));
    const formatDinero = (n) => `$ ${Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
    const hasDayjs = typeof dayjs !== 'undefined';
    const emptyRow = (msg) => `<tr><td colspan="5" class="search-empty-state">${msg}</td></tr>`;
    const emptyDiv = (msg) => `<div class="search-empty-state">${msg}</div>`;

    const normalizarPrestamo = (p) => ({
        ...p,
        id: p.id,
        libroId: p.libroId || p.libro?.id || null,
        usuarioId: p.usuarioId || p.usuario?.id || null,
        devuelto: p.devuelto === true || /devuelto/i.test(p.estado),
        precio: parseFloat(p.precio) || 0,
        fechaPrestamo: typeof window.formatFecha === 'function' ? window.formatFecha(p.fechaPrestamo) : p.fechaPrestamo,
        fechaDevolucion: typeof window.formatFecha === 'function' ? window.formatFecha(p.fechaDevolucion) : p.fechaDevolucion
    });

    async function obtenerDatosGlobales() {
        let [libros, usuarios, prestamos] = [
            window.listaLibrosGlobal || [],
            window.listaUsuariosGlobal || [],
            (window.listaPrestamosGlobal || []).map(normalizarPrestamo)
        ];

        if ((!libros.length || !usuarios.length || !prestamos.length) && typeof window.api === 'function') {
            try {
                const [l, u, p] = await Promise.all([
                    libros.length ? libros : window.api('/libros').catch(() => []),
                    usuarios.length ? usuarios : window.api('/usuarios').catch(() => []),
                    prestamos.length ? prestamos : window.api('/prestamos').catch(() => [])
                ]);
                if (Array.isArray(l) && l.length) libros = window.listaLibrosGlobal = l;
                if (Array.isArray(u) && u.length) usuarios = window.listaUsuariosGlobal = u;
                if (Array.isArray(p) && p.length) prestamos = window.listaPrestamosGlobal = p.map(normalizarPrestamo);
            } catch (e) {
                console.warn('[Estadísticas] Error sincronizando API:', e);
            }
        }
        return { libros, usuarios, prestamos };
    }

    // 3. motor de filtrado temporal
    function filtrarPrestamosPorPeriodo(prestamos, periodo) {
        if (!Array.isArray(prestamos) || periodo === 'all' || !hasDayjs) return prestamos;
        const periodosMap = {
            '7d': dayjs().subtract(7, 'day').startOf('day'),
            '30d': dayjs().subtract(30, 'day').startOf('day'),
            '90d': dayjs().subtract(90, 'day').startOf('day'),
            year: dayjs().startOf('year')
        };
        const fechaInicio = periodosMap[periodo];
        if (!fechaInicio) return prestamos;
        const hoy = dayjs().endOf('day');

        return prestamos.filter(p => {
            if (!p.fechaPrestamo) return false;
            const fp = dayjs(p.fechaPrestamo);
            return fp.isValid() && !fp.isBefore(fechaInicio) && !fp.isAfter(hoy);
        });
    }

    // 4. motor de calculo de metricas (single pass o(1))
    function calcularMetricas(libros, usuarios, todosPrestamos, prestamosPeriodo) {
        const hoy = hasDayjs ? dayjs().startOf('day') : null;
        const [mesActKey, mesAntKey] = hasDayjs ? [dayjs().format('YYYY-MM'), dayjs().subtract(1, 'month').format('YYYY-MM')] : [null, null];

        const librosMap = new Map(libros.map(l => [l.id, l]));
        const usuariosMap = new Map(usuarios.map(u => [u.id, u]));

        // inicializar estadisticas de generos desde el catalogo
        const generosStats = new Map();
        const getGen = (g) => {
            const nom = (g || '').trim() || 'Sin categoría';
            if (!generosStats.has(nom)) generosStats.set(nom, { genero: nom, titulos: 0, stock: 0, prestamosTotal: 0, prestamosPeriodo: 0 });
            return generosStats.get(nom);
        };

        const agotadosLista = [];
        let [totalStock, fisicos, digitales, agotados] = [0, 0, 0, 0];
        libros.forEach(l => {
            const s = parseInt(l.cantidadDisponible, 10);
            if (!isNaN(s) && s > 0) totalStock += s; else { agotados++; agotadosLista.push(l); }
            if (l.urlDescarga?.trim()) digitales++; else fisicos++;
            const g = getGen(l.genero);
            g.titulos++;
            g.stock += (s > 0 ? s : 0);
        });

        // demanda acotada y distribucion semanal en el periodo
        const periodLibroCounts = new Map();
        const periodUsuarioCounts = new Map();
        const conteoDiasSemana = [0, 0, 0, 0, 0, 0, 0];
        let recaudadoPeriodo = 0;

        prestamosPeriodo.forEach(p => {
            if (p.libroId) {
                periodLibroCounts.set(p.libroId, (periodLibroCounts.get(p.libroId) || 0) + 1);
                const lib = librosMap.get(p.libroId);
                if (lib) getGen(lib.genero).prestamosPeriodo++;
            }
            if (p.usuarioId) periodUsuarioCounts.set(p.usuarioId, (periodUsuarioCounts.get(p.usuarioId) || 0) + 1);
            recaudadoPeriodo += (p.precio || 0);

            if (p.fechaPrestamo && hasDayjs && dayjs(p.fechaPrestamo).isValid()) {
                const dayNum = dayjs(p.fechaPrestamo).day();
                conteoDiasSemana[dayNum === 0 ? 6 : dayNum - 1]++;
            }
        });

        // agregacion historica completa
        const lifetimeLibroCounts = new Map();
        const userLoanStats = new Map(usuarios.map(u => [u.id, { total: 0, activos: 0, vencidos: 0 }]));
        const monthlyBuckets = new Map();
        const dailyBuckets = new Map();
        const activosSet = new Set();
        const moraLista = [];
        const prestamosVencidos = [];

        let [vigentes, vencidos, devueltos, recaudadoTotal, sumDias, cDias, valorRiesgoMora] = [0, 0, 0, 0, 0, 0, 0];
        let [saludPuntual, saludLeve, saludMedio, saludSevero] = [0, 0, 0, 0];

        const agregarCubo = (dateStr, tipo, val = 1) => {
            if (!dateStr || !hasDayjs) return;
            const d = dayjs(dateStr);
            if (!d.isValid()) return;
            const [mk, dk] = [d.format('YYYY-MM'), d.format('YYYY-MM-DD')];
            if (!monthlyBuckets.has(mk)) monthlyBuckets.set(mk, { sol: 0, dev: 0, recaudado: 0 });
            if (!dailyBuckets.has(dk)) dailyBuckets.set(dk, { sol: 0, dev: 0 });
            monthlyBuckets.get(mk)[tipo] += val;
            if (tipo !== 'recaudado') dailyBuckets.get(dk)[tipo] += val;
        };

        todosPrestamos.forEach(p => {
            const precio = p.precio || 0;
            recaudadoTotal += precio;

            if (p.libroId) {
                lifetimeLibroCounts.set(p.libroId, (lifetimeLibroCounts.get(p.libroId) || 0) + 1);
                const lib = librosMap.get(p.libroId);
                if (lib) getGen(lib.genero).prestamosTotal++;
            }

            const uStat = p.usuarioId ? userLoanStats.get(p.usuarioId) : null;
            if (uStat) uStat.total++;

            const [fp, fd] = [p.fechaPrestamo, p.fechaDevolucion];
            agregarCubo(fp, 'sol');
            agregarCubo(fp, 'recaudado', precio);
            if (p.devuelto) agregarCubo(fd, 'dev');

            if (fp && fd && hasDayjs && dayjs(fp).isValid() && dayjs(fd).isValid()) {
                sumDias += Math.max(1, dayjs(fd).diff(dayjs(fp), 'day'));
                cDias++;
            }

            if (p.devuelto) {
                devueltos++;
                saludPuntual++;
            } else {
                vigentes++;
                if (p.usuarioId) { activosSet.add(p.usuarioId); if (uStat) uStat.activos++; }

                const esVencido = p.estado === 'Vencido' || (hoy && fd && dayjs(fd).isValid() && dayjs(fd).isBefore(hoy));
                if (esVencido) {
                    vencidos++;
                    valorRiesgoMora += precio;
                    prestamosVencidos.push(p);
                    if (uStat) uStat.vencidos++;
                    const diff = hoy && fd ? Math.max(1, hoy.diff(dayjs(fd), 'day')) : 1;
                    if (diff <= 3) saludLeve++; else if (diff <= 7) saludMedio++; else saludSevero++;
                } else saludPuntual++;

                if (hoy && fd && dayjs(fd).isValid() && dayjs(fd).isBefore(hoy.add(3, 'day'))) moraLista.push(p);
            }
        });

        const recMesAct = (mesActKey && monthlyBuckets.get(mesActKey)?.recaudado) || 0;
        const recMesAnt = (mesAntKey && monthlyBuckets.get(mesAntKey)?.recaudado) || 0;
        const librosFriosLista = libros.filter(l => (lifetimeLibroCounts.get(l.id) || 0) === 0);
        const sociosInactivosLista = usuarios.filter(u => (periodUsuarioCounts.get(u.id) || 0) === 0);

        moraLista.sort((a, b) => new Date(a.fechaDevolucion || 0) - new Date(b.fechaDevolucion || 0));
        prestamosVencidos.sort((a, b) => new Date(a.fechaDevolucion || 0) - new Date(b.fechaDevolucion || 0));

        const totalEval = devueltos + vencidos;
        const tasaPuntual = totalEval > 0 ? Math.round((devueltos / totalEval) * 100) : 100;
        const salud = tasaPuntual < 70 ? ['health-pill red', 'Riesgo Alto'] : (tasaPuntual < 88 ? ['health-pill yellow', 'Atención'] : ['health-pill green', 'Excelente']);
        const baseInv = totalStock + vigentes;

        const topLibros = libros.map(l => ({ ...l, prestamosCount: periodLibroCounts.get(l.id) || 0 })).sort((a, b) => b.prestamosCount - a.prestamosCount).slice(0, 6);
        const topSocios = usuarios.map(u => ({ ...u, prestamosCount: periodUsuarioCounts.get(u.id) || 0 })).sort((a, b) => b.prestamosCount - a.prestamosCount).slice(0, 5);

        return {
            totalLibros: libros.length, totalStock, fisicos, digitales, agotados, agotadosLista,
            librosFriosLista, sociosInactivosLista, totalUsuarios: usuarios.length, sociosActivos: activosSet.size,
            vigentes, vencidos, devueltos, recaudadoTotal, recaudadoPeriodo, recMesAct, recMesAnt, valorRiesgoMora,
            tasaPuntual, saludClass: salud[0], saludTexto: salud[1],
            rotacion: baseInv > 0 ? Math.round((vigentes / baseInv) * 100) : 0,
            morosidad: vigentes > 0 ? Math.round((vencidos / vigentes) * 100) : 0,
            promDias: cDias > 0 ? Math.round(sumDias / cDias) : 7,
            saludRetorno: { puntual: saludPuntual, leve: saludLeve, medio: saludMedio, severo: saludSevero },
            librosMap, usuariosMap, userLoanStats, moraLista, prestamosVencidos, topLibros, topSocios,
            generosStats: Array.from(generosStats.values()), monthlyBuckets, dailyBuckets, conteoDiasSemana
        };
    }

    // 5. builder declarativo de apexcharts
    const getBaseChartConfig = (type, height = 270) => {
        const light = isLight();
        const txtColor = light ? '#64748b' : '#9ca3af';
        return {
            chart: { type, height, background: 'transparent', toolbar: { show: false }, animations: { enabled: true, speed: 250 } },
            theme: { mode: light ? 'light' : 'dark' },
            dataLabels: { enabled: false },
            grid: { borderColor: light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)' },
            tooltip: { theme: light ? 'light' : 'dark' },
            xaxis: { labels: { style: { colors: txtColor, fontSize: '11px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
            yaxis: { min: 0, forceNiceScale: true, labels: { style: { colors: txtColor, fontSize: '11px' } } },
            legend: { position: 'top', horizontalAlign: 'left', labels: { colors: light ? '#334155' : '#e5e7eb' } }
        };
    };

    const createDonutConfig = (series, labels, colors, totalLabel, totalFormatter) => {
        const light = isLight();
        return {
            ...getBaseChartConfig('donut'),
            series: series.length ? series : [1],
            labels: labels.length ? labels : ['Sin datos'],
            colors,
            legend: { position: 'bottom', labels: { colors: light ? '#334155' : '#e5e7eb' } },
            dataLabels: { enabled: true, style: { fontSize: '11px' } },
            plotOptions: {
                pie: {
                    donut: {
                        size: '60%',
                        labels: {
                            show: true,
                            total: { show: true, label: totalLabel, color: light ? '#334155' : '#e5e7eb', formatter: totalFormatter || (() => String(series.reduce((a, b) => a + b, 0))) }
                        }
                    }
                }
            }
        };
    };

    function renderChart(key, id, options) {
        if (typeof ApexCharts === 'undefined' || !$(id)) return;
        if (charts[key]) {
            try { charts[key].updateOptions(options, true, true); return; }
            catch { try { charts[key].destroy(); } catch { } charts[key] = null; }
        }
        $(id).innerHTML = '';
        charts[key] = new ApexCharts($(id), options);
        charts[key].render();
    }

    // 6. renderizado de graficos optimizados
    function renderizarGraficos(m) {
        const light = isLight();
        const txtColor = light ? '#64748b' : '#9ca3af';

        // 1. tendencia temporal unificada
        const { periodo, tipo } = chartConfig.tendencia;
        const is30 = periodo === '30d';
        const numIter = is30 ? 30 : (periodo === '12m' ? 12 : 6);
        const [labels, serieSol, serieDev] = [[], [], []];

        for (let i = numIter - 1; i >= 0; i--) {
            const d = dayjs().subtract(i, is30 ? 'day' : 'month');
            const k = d.format(is30 ? 'YYYY-MM-DD' : 'YYYY-MM');
            const b = (is30 ? m.dailyBuckets : m.monthlyBuckets).get(k) || { sol: 0, dev: 0 };
            labels.push(is30 ? (i % 5 === 0 || i === 0 ? d.format('DD MMM') : '') : d.locale('es').format('MMM').toUpperCase());
            serieSol.push(b.sol);
            serieDev.push(b.dev);
        }

        renderChart('tendencia', 'wrap-chart-tendencia', {
            ...getBaseChartConfig(tipo === 'bar' ? 'bar' : (tipo === 'area' ? 'area' : 'line')),
            series: [{ name: 'Préstamos Solicitados', data: serieSol }, { name: 'Libros Devueltos', data: serieDev }],
            colors: ['#2563eb', '#059669'],
            stroke: { curve: 'smooth', width: tipo === 'area' ? 2.5 : (tipo === 'bar' ? 0 : 3) },
            fill: { type: tipo === 'area' ? 'gradient' : 'solid', gradient: { opacityFrom: 0.45, opacityTo: 0.05 } },
            xaxis: { categories: labels, labels: { style: { colors: txtColor, fontSize: '11px' } }, axisBorder: { show: false }, axisTicks: { show: false } }
        });

        // 2. generos literarios
        const modoGen = chartConfig.generos.modo;
        setText('chart-generos-subtitle', modoGen === 'demanda' ? 'Préstamos solicitados desglosados por categoría' : 'Participación por categoría en el catálogo');
        const sortedGen = [...m.generosStats].sort((a, b) => modoGen === 'demanda' ? b.prestamosPeriodo - a.prestamosPeriodo : b.titulos - a.titulos);
        const topGen = sortedGen.slice(0, 5);
        const otrosSum = sortedGen.slice(5).reduce((s, g) => s + (modoGen === 'demanda' ? g.prestamosPeriodo : g.titulos), 0);

        const genLabels = topGen.map(g => g.genero);
        const genData = topGen.map(g => modoGen === 'demanda' ? g.prestamosPeriodo : g.titulos);
        if (otrosSum > 0) { genLabels.push('Otros Géneros'); genData.push(otrosSum); }

        const genColors = ['#2563eb', '#059669', '#d97706', '#db2777', '#7c3aed', '#0891b2'];
        const genType = chartConfig.generos.tipo;

        const optGen = genType === 'bar' ? {
            ...getBaseChartConfig('bar'),
            series: [{ name: modoGen === 'demanda' ? 'Préstamos' : 'Títulos', data: genData }],
            colors: genColors,
            plotOptions: { bar: { borderRadius: 4, horizontal: true, distributed: true } },
            xaxis: { categories: genLabels, labels: { style: { colors: txtColor } } },
            yaxis: { labels: { style: { colors: light ? '#334155' : '#e5e7eb' } } },
            legend: { show: false }
        } : {
            ...getBaseChartConfig(genType === 'pie' ? 'pie' : (genType === 'polarArea' ? 'polarArea' : 'donut')),
            series: genData.length ? genData : [1],
            labels: genLabels.length ? genLabels : ['Sin datos'],
            colors: genColors,
            legend: { position: 'bottom', labels: { colors: light ? '#334155' : '#e5e7eb' } },
            dataLabels: { enabled: true, style: { fontSize: '11px' } }
        };
        optGen.chart.events = { dataPointSelection: (_, __, c) => navegarABusquedaCategoria(genLabels[c.dataPointIndex]) };
        renderChart('generos', 'wrap-chart-generos', optGen);

        // 3. inventario / salud de retorno
        const vistaInv = chartConfig.inventario.vista;
        if (vistaInv === 'cumplimiento') {
            setText('chart-inventario-title', 'Salud y Cumplimiento de Devolución');
            setText('chart-inventario-subtitle', 'Distribución de puntualidad y nivel de mora');
            const tot = m.saludRetorno.puntual + m.saludRetorno.leve + m.saludRetorno.medio + m.saludRetorno.severo;
            setText('badge-inventario-total', `${tot} evaluados`);
            renderChart('inventario', 'wrap-chart-inventario', createDonutConfig(
                [m.saludRetorno.puntual, m.saludRetorno.leve, m.saludRetorno.medio, m.saludRetorno.severo],
                ['A Tiempo / Puntual', 'Retraso Leve (1-3d)', 'Retraso Medio (4-7d)', 'Mora Crítica (>7d)'],
                ['#059669', '#f59e0b', '#ea580c', '#dc2626'],
                'Cumplimiento',
                () => `${m.tasaPuntual}%`
            ));
        } else {
            setText('chart-inventario-title', 'Estado y Disponibilidad de Inventario');
            setText('chart-inventario-subtitle', 'Proporción de ejemplares en estante, activos y agotados');
            const totalCopias = m.totalStock + m.vigentes;
            setText('badge-inventario-total', `${totalCopias} copias`);
            renderChart('inventario', 'wrap-chart-inventario', createDonutConfig(
                [m.totalStock, m.vigentes, m.agotados, m.digitales],
                ['En Estante (Disponibles)', 'En Préstamo (Activos)', 'Títulos Agotados', 'Recursos Digitales'],
                ['#059669', '#2563eb', '#dc2626', '#0891b2'],
                'Total Acervo',
                () => `${totalCopias}`
            ));
        }

        // 4. demanda semanal o finanzas mensuales
        const vistaDias = chartConfig.dias.vista;
        if (vistaDias === 'ingresos') {
            setText('chart-dias-title', 'Evolución de Ingresos y Finanzas');
            setText('chart-dias-subtitle', 'Recaudación mensual por tarifas de préstamo');
            const [finLabels, finData] = [[], []];
            for (let i = 5; i >= 0; i--) {
                const d = dayjs().subtract(i, 'month');
                finLabels.push(d.locale('es').format('MMM YYYY').toUpperCase());
                finData.push(m.monthlyBuckets.get(d.format('YYYY-MM'))?.recaudado || 0);
            }
            setText('badge-dia-pico', `Total: ${formatDinero(m.recaudadoTotal)}`);
            renderChart('dias', 'wrap-chart-dias', {
                ...getBaseChartConfig('area'),
                series: [{ name: 'Recaudado ($)', data: finData }],
                colors: ['#d97706'],
                stroke: { curve: 'smooth', width: 2.5 },
                fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.05 } },
                xaxis: { categories: finLabels, labels: { style: { colors: txtColor, fontSize: '11px' } } },
                yaxis: { min: 0, forceNiceScale: true, labels: { formatter: (v) => formatDinero(v), style: { colors: txtColor, fontSize: '11px' } } }
            });
        } else {
            setText('chart-dias-title', 'Demanda y Afluencia Semanal');
            setText('chart-dias-subtitle', 'Distribución de solicitudes de Lunes a Domingo');
            const diasNombres = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
            const maxIdx = m.conteoDiasSemana.indexOf(Math.max(...m.conteoDiasSemana));
            setText('badge-dia-pico', m.conteoDiasSemana[maxIdx] > 0 ? `Pico: ${diasNombres[maxIdx]} (${m.conteoDiasSemana[maxIdx]})` : 'Pico: -');
            renderChart('dias', 'wrap-chart-dias', {
                ...getBaseChartConfig('bar'),
                series: [{ name: 'Solicitudes', data: m.conteoDiasSemana }],
                colors: ['#4f46e5'],
                plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
                xaxis: { categories: diasNombres, labels: { style: { colors: txtColor, fontSize: '11px' } } }
            });
        }
    }

    // 7. renderizadores dry de tablas y bitacora
    const renderFilaLibro = (l, i, isFrio) => `
        <tr class="clickable-row" onclick="window.verMasLibro ? window.verMasLibro(${l.id}) : null">
            <td style="font-weight:700; color:var(--text-dim); text-align:center;">${i + 1}</td>
            <td><div class="table-book-title">${esc(l.titulo)}</div><div class="table-book-sub">${esc(l.editorial || 'Sin editorial')} · ${esc(l.anioPublicacion || '')}</div></td>
            <td><div class="table-user-name">${esc(l.autor)}</div><div class="table-user-sub">${esc(l.genero || 'General')}</div></td>
            <td style="text-align:center;"><span class="kpi-trend-badge ${isFrio ? 'down' : 'up'} font-semibold">${isFrio ? '0 préstamos (Sin rotación)' : `${l.prestamosCount} préstamos`}</span></td>
            <td style="text-align:center;"><span class="health-pill ${parseInt(l.cantidadDisponible, 10) > 0 ? 'green' : 'red'}">${parseInt(l.cantidadDisponible, 10) > 0 ? `${l.cantidadDisponible} disp.` : 'Agotado'}</span></td>
        </tr>`;

    const renderItemSocio = (u, i, isInactivo) => `
        <div class="ranking-item clickable" onclick="window.verMasUsuario ? window.verMasUsuario(${u.id}) : null">
            <div class="ranking-item-left"><span class="ranking-pos top-${i + 1}">${i + 1}</span><div class="ranking-info"><div class="ranking-title">${esc(u.nombre)}</div><div class="ranking-sub">CC: ${esc(u.identificacion || 'N/A')} · ${esc(u.email || u.telefono || '')}</div></div></div>
            <span class="kpi-trend-badge ${isInactivo ? 'neutral' : 'up'} font-semibold">${isInactivo ? 'Sin actividad' : `${u.prestamosCount} préstamos`}</span>
        </div>`;

    async function renderizarBitacoraActividad(m) {
        const renderFallback = () => {
            const ultimos = (window.listaPrestamosGlobal || []).slice(-5).reverse();
            return ultimos.length === 0 ? emptyDiv('No hay actividad reciente.') : ultimos.map(p => `
                <div class="activity-item">
                    <span class="activity-dot ${p.devuelto ? 'green' : 'blue'}"></span>
                    <div class="activity-details">
                        <div class="activity-text"><strong>${esc(m.usuariosMap.get(p.usuarioId)?.nombre || `Socio #${p.usuarioId}`)}</strong> ${p.devuelto ? 'devolvió' : 'solicitó préstamo de'} <em>"${esc(m.librosMap.get(p.libroId)?.titulo || `Libro #${p.libroId}`)}"</em></div>
                        <div class="activity-time">${esc((p.devuelto ? p.fechaDevolucion : p.fechaPrestamo) || (p.devuelto ? 'Devuelto' : 'En curso'))}</div>
                    </div>
                </div>`).join('');
        };

        let html = '';
        if (window.Auditoria && typeof window.Auditoria.obtenerRecientes === 'function') {
            try {
                const logs = await window.Auditoria.obtenerRecientes(5);
                if (Array.isArray(logs) && logs.length > 0) {
                    const dotColors = { CREAR: 'green', ELIMINAR: 'red', MODIFICAR: 'cyan' };
                    html = logs.map(l => {
                        const acc = (l.accion || '').toUpperCase();
                        const fechaRel = l.fechaRegistro ? l.fechaRegistro.replace('T', ' ').split('.')[0] : '-';
                        let det = (l.detalles || `${acc} en ${l.entidad}`).trim();
                        if (det.length > 72) det = det.substring(0, 69) + '...';
                        return `
                            <div class="activity-item clickable" onclick="navegarASeccion('auditoria')" title="Ver en Auditoría: ${esc(l.detalles || '')}">
                                <span class="activity-dot ${dotColors[acc] || 'blue'}"></span>
                                <div class="activity-details">
                                    <div class="activity-text"><strong>${esc((l.usuarioResponsable || 'Sistema').trim())}</strong>: ${esc(det)}</div>
                                    <div class="activity-time">${esc(fechaRel)}</div>
                                </div>
                            </div>`;
                    }).join('');
                }
            } catch { }
        }
        setHtml('dash-activity-timeline', html || renderFallback());
    }

    function renderizarTablasYListas(m) {
        const hoy = hasDayjs ? dayjs().startOf('day') : null;

        // vencimientos y control de mora
        setText('badge-proximos-vencer-count', `${m.moraLista.length} en alerta`);
        if ($('badge-proximos-vencer-count')) $('badge-proximos-vencer-count').className = m.moraLista.length > 0 ? 'kpi-trend-badge down' : 'kpi-trend-badge up';

        setHtml('dash-vencimientos-tbody', m.moraLista.length === 0
            ? emptyRow('<i data-lucide="check-circle" style="color:#059669; vertical-align:middle; width:15px; height:15px;"></i> Sin préstamos en mora ni alertas.')
            : m.moraLista.slice(0, 5).map(p => {
                const [usr, lib] = [m.usuariosMap.get(p.usuarioId), m.librosMap.get(p.libroId)];
                const esV = hoy && dayjs(p.fechaDevolucion).isBefore(hoy);
                const diff = hoy ? Math.abs(dayjs(p.fechaDevolucion).diff(hoy, 'day')) : 0;
                const badge = esV
                    ? `<span class="health-pill red"><i data-lucide="alert-octagon" style="width:10px;height:10px;"></i> Vencido hace ${diff || 1}d</span>`
                    : `<span class="health-pill yellow"><i data-lucide="clock" style="width:10px;height:10px;"></i> ${diff === 0 ? 'Vence Hoy' : `Vence en ${diff}d`}</span>`;
                return `<tr>
                    <td><div class="table-book-title">${esc(lib?.titulo || `Libro #${p.libroId}`)}</div><div class="table-book-sub">ISBN: ${esc(lib?.isbn || '-')}</div></td>
                    <td><div class="table-user-name">${esc(usr?.nombre || `Socio #${p.usuarioId}`)}</div><div class="table-user-sub">${esc(usr?.telefono || usr?.email || `CC: ${usr?.identificacion || '-'}`)}</div></td>
                    <td><span class="mono-date">${esc(p.fechaDevolucion || '-')}</span></td>
                    <td>${badge}</td>
                    <td style="text-align: right;"><button class="btn-table-action-sm" onclick="window.verMasPrestamo ? window.verMasPrestamo(${p.id}) : navegarASeccion('prestamos')"><i data-lucide="external-link" style="width:11px;height:11px;"></i> Gestionar</button></td>
                </tr>`;
            }).join(''));

        // top libros vs libros frios
        const isFrios = viewState.topLibrosTab === 'frios';
        setText('th-top-libros-metric', isFrios ? 'Estado Demanda' : 'Préstamos');
        const librosLista = isFrios ? m.librosFriosLista : m.topLibros;
        setHtml('dash-top-libros-tbody', librosLista.length === 0
            ? emptyRow(isFrios ? '<i data-lucide="check-circle" style="color:#059669; vertical-align:middle; width:15px; height:15px;"></i> ¡Excelente! Todo el catálogo tiene al menos un préstamo.' : 'No hay préstamos en el período seleccionado.')
            : librosLista.slice(0, 6).map((l, i) => renderFilaLibro(l, i, isFrios)).join(''));

        // socios activos vs inactivos
        const isInactivos = viewState.sociosTab === 'inactivos';
        const sociosLista = isInactivos ? m.sociosInactivosLista : m.topSocios;
        setHtml('dash-top-usuarios-list', sociosLista.length === 0
            ? emptyDiv(isInactivos ? '<i data-lucide="check-circle" style="color:#059669; vertical-align:middle; width:15px; height:15px;"></i> Todos los socios han solicitado préstamos.' : 'No hay socios con actividad en este período.')
            : sociosLista.slice(0, 5).map((u, i) => renderItemSocio(u, i, isInactivos)).join(''));

        // stock critico
        setHtml('dash-stock-critico-list', m.agotadosLista.length === 0
            ? emptyDiv('<i data-lucide="check-circle" style="color:#059669; vertical-align:middle; width:15px; height:15px;"></i> Todos los títulos tienen stock disponible.')
            : m.agotadosLista.slice(0, 4).map(l => `
                <div class="alert-item">
                    <div class="alert-item-left"><div class="alert-icon-tag danger"><i data-lucide="package-x" style="width:14px;height:14px;"></i></div><div><div class="alert-info-title">${esc(l.titulo)}</div><div class="alert-info-sub">${esc(l.autor)} · ISBN: ${esc(l.isbn || 'S/N')}</div></div></div>
                    <button class="alert-btn-action" onclick="window.verMasLibro ? window.verMasLibro(${l.id}) : navegarASeccion('libros')"><i data-lucide="edit-3" style="width:11px;height:11px;"></i> Reponer</button>
                </div>`).join(''));

        renderizarBitacoraActividad(m);
    }

    // 8. exportador excel (.xlsx) declarativo de 8 hojas
    async function exportarReporteCompletoExcel() {
        if (typeof XLSX === 'undefined') {
            const err = 'No se pudo cargar el motor SheetJS (XLSX).';
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Librería no disponible', text: err }); else alert(err);
            return;
        }

        if (typeof Swal !== 'undefined') Swal.fire({ title: 'Generando Reporte Gerencial...', text: 'Compilando catálogo, socios, finanzas y libros sin rotación en Excel...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
            const { libros, usuarios, prestamos } = await obtenerDatosGlobales();
            const periodo = $('dash-global-period')?.value || 'all';
            const prestamosPeriodo = filtrarPrestamosPorPeriodo(prestamos, periodo);
            const m = calcularMetricas(libros, usuarios, prestamos, prestamosPeriodo);
            const hoyStr = hasDayjs ? dayjs().format('YYYY-MM-DD HH:mm:ss') : new Date().toLocaleString();
            const hoy = hasDayjs ? dayjs().startOf('day') : null;

            const rowLibro = (l) => [l.id, l.isbn || 'S/N', l.titulo || 'Sin título', l.autor || 'Anónimo', l.genero || 'General', l.editorial || '-', l.anioPublicacion || '-', l.urlDescarga?.trim() ? 'Digital' : 'Físico', parseInt(l.cantidadDisponible, 10) || 0, l.ubicacion || 'General', (parseInt(l.cantidadDisponible, 10) || 0) > 0 ? 'Disponible' : 'Agotado'];

            const sheets = {
                Resumen_Ejecutivo: [
                    ['SISTEMA DE GESTIÓN BIBLIOTECARIA - INFORME GERENCIAL INTEGRAL'],
                    ['Fecha de Generación:', hoyStr],
                    ['Período Evaluado:', periodo === 'all' ? 'Histórico Completo' : `Filtro: ${periodo}`],
                    ['Estado Operativo:', 'Sincronizado en Tiempo Real'], [''],
                    ['INDICADORES CLAVE (KPIS)', 'VALOR', 'DESCRIPCIÓN'],
                    ['Total de Títulos en Catálogo', m.totalLibros, 'Títulos únicos registrados'],
                    ['Total de Ejemplares en Inventario', m.totalStock, 'Copias físicas en estante'],
                    ['Libros Físicos / Digitales', `${m.fisicos} fís. / ${m.digitales} dig.`, 'Desglose por formato'],
                    ['Títulos con Stock Agotado', m.agotados, 'Requieren reposición'],
                    ['Títulos Sin Rotación (0 Préstamos)', m.librosFriosLista.length, 'Acervo estancado'],
                    ['Directorio de Socios Registrados', m.totalUsuarios, 'Total lectores registrados'],
                    ['Socios Inactivos en el Período', m.sociosInactivosLista.length, 'Sin solicitudes recientes'],
                    ['Préstamos en Circulación Activos', m.vigentes, 'En poder de socios'],
                    ['Préstamos en Mora / Vencidos', m.vencidos, 'Fecha límite superada'],
                    ['Valor de Cartera en Riesgo de Mora', formatDinero(m.valorRiesgoMora), 'Monto en tarifas de libros vencidos'],
                    ['Préstamos Devueltos Históricos', m.devueltos, 'Devoluciones exitosas'],
                    ['Tasa de Cumplimiento Puntual', `${m.tasaPuntual}%`, 'Efectividad de retorno'],
                    ['Tasa de Rotación de Inventario', `${m.rotacion}%`, 'Catálogo en circulación activa'],
                    ['Recaudación Total Acumulada', formatDinero(m.recaudadoTotal), 'Tarifas y multas históricas']
                ],
                Catalogo_Libros: [
                    ['ID', 'ISBN', 'TÍTULO', 'AUTOR', 'GÉNERO', 'EDITORIAL', 'AÑO', 'FORMATO', 'STOCK', 'UBICACIÓN', 'ESTADO'],
                    ...libros.map(rowLibro)
                ],
                Libros_Sin_Rotacion: [
                    ['ID', 'ISBN', 'TÍTULO', 'AUTOR', 'GÉNERO', 'EDITORIAL', 'STOCK DISPONIBLE', 'PRÉSTAMOS HISTÓRICOS', 'DIAGNÓSTICO'],
                    ...m.librosFriosLista.map(l => [l.id, l.isbn || 'S/N', l.titulo || 'Sin título', l.autor || 'Anónimo', l.genero || 'General', l.editorial || '-', parseInt(l.cantidadDisponible, 10) || 0, 0, 'Sin rotación (Promocionar / Reubicar)'])
                ],
                Directorio_Socios: [
                    ['ID', 'IDENTIFICACIÓN', 'NOMBRE', 'CORREO', 'TELÉFONO', 'PRÉSTAMOS HISTÓRICOS', 'PRÉSTAMOS ACTIVOS', 'ESTADO'],
                    ...usuarios.map(u => {
                        const st = m.userLoanStats.get(u.id) || { total: 0, activos: 0, vencidos: 0 };
                        return [u.id, u.identificacion || '-', u.nombre || '-', u.email || '-', u.telefono || '-', st.total, st.activos, st.vencidos > 0 ? 'En Mora' : (st.activos > 0 ? 'Con Préstamos' : 'Al Día')];
                    })
                ],
                Socios_Inactivos: [
                    ['ID', 'IDENTIFICACIÓN', 'NOMBRE', 'CORREO', 'TELÉFONO', 'PRÉSTAMOS EN EL PERÍODO', 'ACCIÓN SUGERIDA'],
                    ...m.sociosInactivosLista.map(u => [u.id, u.identificacion || '-', u.nombre || '-', u.email || '-', u.telefono || '-', 0, 'Enviar campaña de reactivación'])
                ],
                Historial_Prestamos: [
                    ['ID PRÉSTAMO', 'ID LIBRO', 'TÍTULO', 'ID SOCIO', 'DOC. IDENTIDAD', 'SOCIO', 'FECHA PRÉSTAMO', 'FECHA DEVOLUCIÓN', 'PRECIO', 'ESTADO', 'DÍAS'],
                    ...prestamos.map(p => {
                        const [lib, usr] = [m.librosMap.get(p.libroId), m.usuariosMap.get(p.usuarioId)];
                        const dias = p.fechaPrestamo && p.fechaDevolucion && hasDayjs && dayjs(p.fechaPrestamo).isValid() && dayjs(p.fechaDevolucion).isValid() ? Math.max(1, dayjs(p.fechaDevolucion).diff(dayjs(p.fechaPrestamo), 'day')) : '-';
                        const est = p.devuelto ? 'Devuelto' : (hoy && p.fechaDevolucion && dayjs(p.fechaDevolucion).isBefore(hoy) ? 'Vencido (En Mora)' : 'Activo al Día');
                        return [p.id, p.libroId, lib?.titulo || `Libro #${p.libroId}`, p.usuarioId, usr?.identificacion || '-', usr?.nombre || `Socio #${p.usuarioId}`, p.fechaPrestamo || '-', p.fechaDevolucion || '-', p.precio || 0, est, dias];
                    })
                ],
                Cartera_En_Mora: [
                    ['ID PRÉSTAMO', 'LIBRO', 'SOCIO', 'IDENTIFICACIÓN', 'TELÉFONO', 'CORREO', 'FECHA PRÉSTAMO', 'VENCIMIENTO', 'DÍAS ATRASO', 'VALOR TARIFA'],
                    ...m.prestamosVencidos.map(p => {
                        const [lib, usr] = [m.librosMap.get(p.libroId), m.usuariosMap.get(p.usuarioId)];
                        return [p.id, lib?.titulo || `Libro #${p.libroId}`, usr?.nombre || `Socio #${p.usuarioId}`, usr?.identificacion || '-', usr?.telefono || '-', usr?.email || '-', p.fechaPrestamo || '-', p.fechaDevolucion || '-', Math.max(1, hoy.diff(dayjs(p.fechaDevolucion), 'day')), p.precio || 0];
                    })
                ],
                Estadisticas_Generos: [
                    ['GÉNERO / CATEGORÍA', 'TOTAL TÍTULOS', 'TOTAL EJEMPLARES', 'PRÉSTAMOS HISTÓRICOS', '% PARTICIPACIÓN ACERVO'],
                    ...[...m.generosStats].sort((a, b) => b.titulos - a.titulos).map(st => [st.genero, st.titulos, st.stock, st.prestamosTotal, `${Math.round((st.titulos / (m.totalLibros || 1)) * 100)}%`])
                ]
            };

            const wb = XLSX.utils.book_new();
            Object.entries(sheets).forEach(([name, aoa]) => {
                const ws = XLSX.utils.aoa_to_sheet(aoa);
                const colWidths = [];
                aoa.forEach(row => row.forEach((cell, idx) => { colWidths[idx] = Math.max(colWidths[idx] || 10, String(cell ?? '').length + 3); }));
                ws['!cols'] = colWidths.map(w => ({ wch: Math.min(w, 55) }));
                XLSX.utils.book_append_sheet(wb, ws, name);
            });

            const fileName = `Reporte_Gerencial_Biblioteca_${dayjs().format('YYYY-MM-DD_HHmm')}.xlsx`;
            XLSX.writeFile(wb, fileName);

            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: '¡Reporte Excel Generado!',
                    html: `Se descargó <strong>${fileName}</strong> con 8 hojas completas y analítica avanzada.`,
                    confirmButtonColor: '#2563eb'
                });
            }
        } catch (err) {
            console.error('[Excel Export] Error:', err);
            const msg = err.message || 'Error al compilar el archivo Excel.';
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Error al exportar', text: msg }); else alert(msg);
        }
    }

    // 9. navegacion y drilldown
    function navegarASeccion(seccionId, filtroPrestamos = null) {
        if (window.__alpineRoot) window.__alpineRoot.tab = seccionId;
        else {
            document.querySelectorAll('.nav-btn, .tab-content').forEach(el => el.classList.remove('active'));
            document.querySelector(`.nav-btn[data-target="${seccionId}"]`)?.classList.add('active');
            $(`${seccionId}`)?.classList.add('active');
        }
        try { localStorage.setItem('activeTab', seccionId); } catch { }
        if (seccionId === 'prestamos' && filtroPrestamos && typeof window.filtrarPrestamos === 'function') window.filtrarPrestamos(filtroPrestamos);
        if (seccionId === 'auditoria' && typeof window.cargarAuditoria === 'function') window.cargarAuditoria();
        document.querySelector('.content')?.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function navegarABusquedaCategoria(termino) {
        if (!termino || /Sin categoría|Otros Géneros/i.test(termino)) return;
        navegarASeccion('busqueda-db');
        setTimeout(() => {
            const input = $('search-box-db') || $('input-buscar-db');
            if (input) { input.value = termino; if (typeof window.ejecutarBusquedaDB === 'function') window.ejecutarBusquedaDB(); }
        }, 120);
    }

    // 10. orquestador principal y reactividad
    async function actualizarDashboardEstadisticas() {
        const { libros, usuarios, prestamos } = await obtenerDatosGlobales();
        const periodo = $('dash-global-period')?.value || 'all';
        viewState.periodoActual = periodo;

        const prestamosPeriodo = filtrarPrestamosPorPeriodo(prestamos, periodo);
        const m = calcularMetricas(libros, usuarios, prestamos, prestamosPeriodo);
        viewState.lastData = { libros, usuarios, prestamos, prestamosPeriodo, m };

        const delta = m.recMesAnt === 0 ? (m.recMesAct > 0 ? '+100%' : '0%') : `${Math.round(((m.recMesAct - m.recMesAnt) / m.recMesAnt) * 100) >= 0 ? '+' : ''}${Math.round(((m.recMesAct - m.recMesAnt) / m.recMesAnt) * 100)}%`;
        const kpiMap = [
            ['kpi-total-libros', m.totalLibros],
            ['kpi-sub-libros', `${m.totalStock} ejemplares (${m.fisicos} fís. / ${m.digitales} dig.)`],
            ['kpi-sub-frios', `${m.librosFriosLista.length} sin rotación`],
            ['kpi-total-usuarios', m.totalUsuarios],
            ['kpi-sub-usuarios', `${m.sociosActivos} socios con préstamos`],
            ['kpi-sub-inactivos', `${m.sociosInactivosLista.length} inactivos`],
            ['kpi-prestamos-activos', m.vigentes],
            ['kpi-sub-rotacion', `${m.rotacion}% rotación`],
            ['kpi-prestamos-vencidos', m.vencidos],
            ['kpi-sub-vencidos', `${m.morosidad}% morosidad`],
            ['kpi-sub-riesgo', `${formatDinero(m.valorRiesgoMora)} en riesgo`],
            ['kpi-tasa-puntual', `${m.tasaPuntual}%`],
            ['kpi-sub-puntual', `${m.devueltos} devueltos`],
            ['kpi-total-ingresos', formatDinero(periodo === 'all' ? m.recaudadoTotal : m.recaudadoPeriodo)],
            ['kpi-sub-ingresos-mes', `Mes actual: ${formatDinero(m.recMesAct)}`],
            ['kpi-libros-agotados', m.agotados],
            ['kpi-sub-stock-critico', m.agotados > 0 ? `${m.agotados} títulos sin stock` : 'Catálogo al 100%'],
            ['badge-stock-critico', `${m.agotados} títulos`],
            ['badge-stock-critico-count', `${m.agotados} alertas`],
            ['kpi-promedio-dias', `${m.promDias} días`],
            ['kpi-sub-dias', 'Ciclo medio de retención']
        ];
        kpiMap.forEach(([id, val]) => setText(id, val));

        ['badge-stock-critico', 'badge-stock-critico-count'].forEach(id => {
            const el = $(id);
            if (el) el.className = m.agotados > 0 ? 'kpi-trend-badge down' : 'kpi-trend-badge up';
        });

        if ($('kpi-badge-salud')) {
            $('kpi-badge-salud').className = m.saludClass;
            $('kpi-badge-salud').textContent = m.saludTexto;
        }

        setHtml('kpi-delta-mes', `<i data-lucide="${/^-/.test(delta) ? 'trending-down' : 'trending-up'}" style="width:11px;height:11px;"></i> ${delta} mes ant.`);

        const periodLabels = { all: 'Histórico', '7d': 'Últimos 7 días', '30d': 'Últimos 30 días', '90d': 'Último Trimestre', year: 'Año Actual' };
        setHtml('dash-last-updated', `<i data-lucide="shield-check" style="width:14px;height:14px;"></i> ${periodLabels[periodo] || 'Sincronizado'} · ${hasDayjs ? dayjs().format('HH:mm:ss') : new Date().toLocaleTimeString()}`);

        renderizarGraficos(m);
        renderizarTablasYListas(m);

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // 11. controladores dry de tabs y selectores
    const syncSelect = (selId, cfgObj, key) => { const el = $(selId); if (el) cfgObj[key] = el.value; };
    const cambiarConfigGraficoTendencia = () => { syncSelect('select-tipo-chart-tendencia', chartConfig.tendencia, 'tipo'); syncSelect('select-periodo-chart-tendencia', chartConfig.tendencia, 'periodo'); actualizarDashboardEstadisticas(); };
    const cambiarConfigGraficoGeneros = () => { syncSelect('select-tipo-chart-generos', chartConfig.generos, 'tipo'); syncSelect('select-modo-chart-generos', chartConfig.generos, 'modo'); actualizarDashboardEstadisticas(); };
    const cambiarConfigGraficoInventario = () => { syncSelect('select-vista-chart-inventario', chartConfig.inventario, 'vista'); actualizarDashboardEstadisticas(); };
    const cambiarConfigGraficoDias = () => { syncSelect('select-vista-chart-dias', chartConfig.dias, 'vista'); actualizarDashboardEstadisticas(); };

    function alternarPillTab(propiedad, valor, pills) {
        viewState[propiedad] = valor;
        Object.entries(pills).forEach(([id, activo]) => $(id)?.classList.toggle('active', activo));
        if (viewState.lastData) {
            renderizarTablasYListas(viewState.lastData.m);
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }

    const cambiarTabTopLibros = (tab) => alternarPillTab('topLibrosTab', tab, { 'tab-top-pedidos': tab === 'pedidos', 'tab-top-frios': tab === 'frios' });
    const cambiarTabSocios = (tab) => alternarPillTab('sociosTab', tab, { 'tab-socios-activos': tab === 'activos', 'tab-socios-inactivos': tab === 'inactivos' });

    // 12. exposicion global
    window.actualizarDashboardEstadisticas = actualizarDashboardEstadisticas;
    window.cambiarConfigGraficoTendencia = cambiarConfigGraficoTendencia;
    window.cambiarConfigGraficoGeneros = cambiarConfigGraficoGeneros;
    window.cambiarConfigGraficoInventario = cambiarConfigGraficoInventario;
    window.cambiarConfigGraficoDias = cambiarConfigGraficoDias;
    window.cambiarTabTopLibros = cambiarTabTopLibros;
    window.cambiarTabSocios = cambiarTabSocios;
    window.navegarASeccion = navegarASeccion;
    window.navegarABusquedaCategoria = navegarABusquedaCategoria;
    window.exportarReporteCompletoExcel = exportarReporteCompletoExcel;
})();
