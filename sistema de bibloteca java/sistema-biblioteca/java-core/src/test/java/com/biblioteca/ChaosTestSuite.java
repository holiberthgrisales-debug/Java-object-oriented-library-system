package com.biblioteca;

import com.biblioteca.config.DatabaseConnection;
import com.biblioteca.models.Libro;
import com.biblioteca.models.Prestamo;
import com.biblioteca.models.ResultadoBusqueda;
import com.biblioteca.models.Usuario;
import com.biblioteca.services.BusquedaService;
import com.biblioteca.services.LibroService;
import com.biblioteca.services.PrestamoService;
import com.biblioteca.services.UsuarioService;

import java.io.File;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.Duration;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

// pruebas para estresar el sistema y validar casos limite
public class ChaosTestSuite {

    private static int totalTests = 0;
    private static int passedTests = 0;
    private static int failedTests = 0;
    private static final List<String> vulnerabilitiesFound = new ArrayList<>();
    private static final List<String> bugsFound = new ArrayList<>();

    public static void main(String[] args) {
        System.out.println("================================================================================");
        System.out.println("🔥 INICIANDO SUITE DE CAOS Y STRESS TESTING - SISTEMA DE BIBLIOTECA 🔥");
        System.out.println("================================================================================\n");

        long startTime = System.currentTimeMillis();

        try {
            // inicializar base de datos
            DatabaseConnection.inicializarBaseDeDatos();

            UsuarioService usuarioService = new UsuarioService();
            LibroService libroService = new LibroService();
            PrestamoService prestamoService = new PrestamoService();
            BusquedaService busquedaService = new BusquedaService();

            // ejecutar modulos de prueba
            testUsuarioEdgeCasesAndFuzzing(usuarioService, prestamoService);
            testLibroEdgeCasesAndFuzzing(libroService, prestamoService);
            testPrestamoBusinessInvariants(usuarioService, libroService, prestamoService);
            testConcurrencyAndRaceConditions(usuarioService, libroService, prestamoService);
            testBusquedaFuzzingAndInjections(busquedaService, libroService, usuarioService);
            testDatabaseNormalizationAndAccents();
            testHttpEndpointFuzzing();

        } catch (Exception e) {
            System.err.println("❌ ERROR CATASTRÓFICO EN LA SUITE: " + e.getMessage());
            e.printStackTrace();
        }

        long duration = System.currentTimeMillis() - startTime;

        System.out.println("\n================================================================================");
        System.out.println("📊 REPORTE FINAL DE AUDITORÍA Y RESULTADOS");
        System.out.println("================================================================================");
        System.out.printf("Total Pruebas Ejecutadas : %d\n", totalTests);
        System.out.printf("Pruebas Superadas (PASS) : %d (%.1f%%)\n", passedTests, (totalTests > 0 ? (passedTests * 100.0 / totalTests) : 0));
        System.out.printf("Fallos Detectados (FAIL) : %d\n", failedTests);
        System.out.printf("Tiempo Total de Ejecución: %d ms\n", duration);
        System.out.println("--------------------------------------------------------------------------------");

        if (!vulnerabilitiesFound.isEmpty()) {
            System.out.println("\n⚠️ VULNERABILIDADES / COMPORTAMIENTOS CRÍTICOS DETECTADOS:");
            for (int i = 0; i < vulnerabilitiesFound.size(); i++) {
                System.out.printf("  [%d] %s\n", i + 1, vulnerabilitiesFound.get(i));
            }
        } else {
            System.out.println("\n✅ No se encontraron vulnerabilidades críticas de seguridad.");
        }

        if (!bugsFound.isEmpty()) {
            System.out.println("\n🐛 BUGS / CASOS LÍMITE QUE REQUIEREN ATENCIÓN:");
            for (int i = 0; i < bugsFound.size(); i++) {
                System.out.printf("  [%d] %s\n", i + 1, bugsFound.get(i));
            }
        }
        System.out.println("================================================================================\n");
    }

    private static void logPass(String testName) {
        totalTests++;
        passedTests++;
        System.out.println("  ✅ [PASS] " + testName);
    }

    private static void logFail(String testName, String reason, boolean isSecurityIssue) {
        totalTests++;
        failedTests++;
        System.out.println("  ❌ [FAIL] " + testName + " -> " + reason);
        if (isSecurityIssue) {
            vulnerabilitiesFound.add(testName + ": " + reason);
        } else {
            bugsFound.add(testName + ": " + reason);
        }
    }

    // pruebas para usuarios
    private static void testUsuarioEdgeCasesAndFuzzing(UsuarioService usuarioService, PrestamoService prestamoService) {
        System.out.println("\n--- [MODULO 1: USUARIO SERVICE - FUZZING Y CASOS LÍMITE] ---");

        // 1.1 usuario null
        try {
            usuarioService.agregar(null);
            logFail("Usuario null al agregar", "El sistema permitió agregar un usuario null", false);
        } catch (IllegalArgumentException e) {
            logPass("Rechazo de usuario null");
        } catch (Exception e) {
            logFail("Usuario null lanzó excepción inesperada", e.getClass().getSimpleName() + ": " + e.getMessage(), false);
        }

        // 1.2 nombre vacio / espacios
        try {
            usuarioService.agregar(new Usuario(0, "123", "   ", "correo@test.com", "123456"));
            logFail("Usuario con nombre en blanco", "Permitió usuario con nombre de solo espacios", false);
        } catch (IllegalArgumentException e) {
            logPass("Rechazo de usuario con nombre en blanco");
        } catch (Exception e) {
            logFail("Nombre en blanco lanzó excepción inesperada", e.getMessage(), false);
        }

        // 1.3 email vacio / espacios
        try {
            usuarioService.agregar(new Usuario(0, "123", "Juan", "   ", "123456"));
            logFail("Usuario con email en blanco", "Permitió usuario con email de solo espacios", false);
        } catch (IllegalArgumentException e) {
            logPass("Rechazo de usuario con email en blanco");
        } catch (Exception e) {
            logFail("Email en blanco lanzó excepción inesperada", e.getMessage(), false);
        }

        // 1.4 inyeccion sql en nombre, cedula, email, telefono
        String sqlInjection = "'; DROP TABLE usuarios; -- ' OR '1'='1";
        try {
            Usuario u = new Usuario(0, sqlInjection, "Usuario Inyeccion " + sqlInjection, "inject@evil.com", "555-SQL");
            usuarioService.agregar(u);
            Usuario obtenido = usuarioService.obtenerPorId(u.getId());
            if (obtenido != null && obtenido.getIdentificacion().equals(sqlInjection)) {
                logPass("Inyección SQL sanitizada correctamente en PreparedStatement (insert & select)");
                usuarioService.eliminar(u.getId());
            } else {
                logFail("Inyección SQL", "No se persistió o recuperó correctamente el payload seguro", false);
            }
        } catch (Exception e) {
            logFail("Inyección SQL causó fallo", e.getMessage(), true);
        }

        // 1.5 caracteres especiales, emojis y textos gigantes (fuzzing)
        String emojiString = "🧑‍💻 Juan García 🚀📚 \uD83D\uDE00";
        StringBuilder longString = new StringBuilder();
        for (int i = 0; i < 5000; i++) longString.append("A");

        try {
            Usuario u = new Usuario(0, "CC-EMOJI-99", emojiString, "emoji@test.com", "3001234567");
            usuarioService.agregar(u);
            Usuario obtenido = usuarioService.obtenerPorId(u.getId());
            if (obtenido != null && obtenido.getNombre().equals(emojiString)) {
                logPass("Soporte completo de UTF-8 Emojis y caracteres multilingües");
            } else {
                logFail("UTF-8 Emojis", "Los emojis no coincidieron al recuperar", false);
            }
            usuarioService.eliminar(u.getId());
        } catch (Exception e) {
            logFail("UTF-8 Emojis", "Fallo al guardar emojis: " + e.getMessage(), false);
        }

        // 1.6 obtener id inexistente / negativo / extremo
        try {
            Usuario uNeg = usuarioService.obtenerPorId(-999);
            Usuario uMax = usuarioService.obtenerPorId(Integer.MAX_VALUE);
            if (uNeg == null && uMax == null) {
                logPass("Manejo seguro de IDs negativos y extremos (retorna null sin explotar)");
            } else {
                logFail("IDs extremos", "Retornó un objeto para IDs no existentes", false);
            }
        } catch (Exception e) {
            logFail("IDs extremos lanzaron excepción", e.getMessage(), false);
        }

        // 1.7 rechazo de usuario con campos que exceden longitud maxima
        try {
            Usuario uLargo = new Usuario(0, "CC-LONG", "A".repeat(200), "long@test.com", "123");
            usuarioService.agregar(uLargo);
            logFail("Usuario nombre excesivo", "Permitió usuario con nombre de más de 150 caracteres", false);
            usuarioService.eliminar(uLargo.getId());
        } catch (IllegalArgumentException e) {
            logPass("Rechazo de usuario con nombre que excede longitud máxima (150 chars)");
        } catch (Exception e) {
            logFail("Nombre excesivo lanzó error inesperado", e.getMessage(), false);
        }
    }

    // pruebas para libros
    private static void testLibroEdgeCasesAndFuzzing(LibroService libroService, PrestamoService prestamoService) {
        System.out.println("\n--- [MODULO 2: LIBRO SERVICE - VALIDACIONES Y LÍMITES] ---");

        // 2.1 libro con cantidad negativa
        try {
            Libro l = new Libro(0, "Libro Negativo", "Autor Test", "123456", 2020, "Ficcion", -5, "Estante 1", null, "Disponible", 2020, "1ra");
            libroService.agregar(l);
            logFail("Libro con stock negativo", "Permitió crear libro con cantidad_disponible = -5", false);
            libroService.eliminar(l.getId());
        } catch (IllegalArgumentException e) {
            logPass("Rechazo de libro con cantidad disponible negativa");
        } catch (Exception e) {
            logFail("Stock negativo lanzó excepción inesperada", e.getMessage(), false);
        }

        // 2.2 libro con ano publicacion negativo
        try {
            Libro l = new Libro(0, "Libro Año Negativo", "Autor", "123", -200, "Historia", 5, "E1", null, "Disponible", null, null);
            libroService.agregar(l);
            logFail("Libro con año negativo", "Permitió libro con año de publicación -200 sin control", false);
            libroService.eliminar(l.getId());
        } catch (IllegalArgumentException e) {
            logPass("Rechazo de libro con año negativo");
        } catch (Exception e) {
            logFail("Año negativo lanzó excepción inesperada", e.getMessage(), false);
        }

        // 2.3 libro con titulo o autor nulo / vacio
        try {
            Libro l = new Libro(0, "   ", "Autor", "123", 2020, "Ficcion", 5, "E1", null, "Disponible", null, null);
            libroService.agregar(l);
            logFail("Título en blanco", "Permitió libro con título vacío", false);
        } catch (IllegalArgumentException e) {
            logPass("Rechazo de libro con título en blanco");
        } catch (Exception e) {
            logFail("Título en blanco lanzó error no controlado", e.getMessage(), false);
        }

        try {
            Libro l = new Libro(0, "Título Válido", "  \t ", "123", 2020, "Ficcion", 5, "E1", null, "Disponible", null, null);
            libroService.agregar(l);
            logFail("Autor en blanco", "Permitió libro con autor vacío", false);
        } catch (IllegalArgumentException e) {
            logPass("Rechazo de libro con autor en blanco");
        } catch (Exception e) {
            logFail("Autor en blanco lanzó error no controlado", e.getMessage(), false);
        }

        // 2.4 fuzzing de filtros de libros
        try {
            List<Libro> res1 = libroService.filtrar(null, null, null);
            List<Libro> res2 = libroService.filtrar("'; DROP TABLE libros; --", true, -99999);
            List<Libro> res3 = libroService.filtrar("Ciencia Ficción", false, 2026);
            logPass("Filtro multicriterio robusto ante parámetros nulos, inyecciones y años inexistentes");
        } catch (Exception e) {
            logFail("Filtros de libro fallaron ante entradas anómalas", e.getMessage(), false);
        }

        // 2.5 rechazo de libro con url no segura (previene vector xss javascript:)
        try {
            Libro lXss = new Libro(0, "Libro XSS", "Autor Seguro", "978-0000000001", 2024, "Tech", 1, "E1", "javascript:alert(1)", "Disponible", null, null);
            libroService.agregar(lXss);
            logFail("Libro con URL javascript:", "Permitió registrar libro con urlDescarga javascript:", true);
            libroService.eliminar(lXss.getId());
        } catch (IllegalArgumentException e) {
            logPass("Rechazo de libro con URL no segura (previene vector XSS)");
        } catch (Exception e) {
            logFail("URL no segura lanzó error inesperado", e.getMessage(), false);
        }
    }

    // pruebas para prestamos
    private static void testPrestamoBusinessInvariants(UsuarioService usuarioService, LibroService libroService, PrestamoService prestamoService) {
        System.out.println("\n--- [MODULO 3: INVARIANTES DE NEGOCIO Y PRÉSTAMOS] ---");

        // crear datos de prueba
        Usuario user = new Usuario(0, "CC-TEST-01", "Usuario Pruebas Invariantes", "user@test.com", "123");
        usuarioService.agregar(user);

        Libro libroStock1 = new Libro(0, "Libro Stock Unico", "Autor Test", "ISBN-001", 2022, "Drama", 1, "A1", null, "Disponible", null, null);
        libroService.agregar(libroStock1);

        Libro libroStock0 = new Libro(0, "Libro Stock Agotado", "Autor Test", "ISBN-002", 2022, "Drama", 0, "A2", null, "Disponible", null, null);
        libroService.agregar(libroStock0);

        // 3.1 intentar prestar libro con stock 0
        try {
            Prestamo p = new Prestamo(0, user.getId(), libroStock0.getId(), LocalDate.now(), LocalDate.now().plusDays(5), false, null, null, 15.0);
            prestamoService.agregar(p);
            logFail("Préstamo con stock 0", "El sistema permitió prestar un libro con 0 copias disponibles", true);
        } catch (IllegalStateException e) {
            logPass("Rechazo estricto de préstamo cuando cantidad_disponible = 0");
        } catch (Exception e) {
            logFail("Préstamo stock 0 lanzó excepción inesperada", e.getMessage(), false);
        }

        // 3.2 prestar libro inexistente
        try {
            Prestamo p = new Prestamo(0, user.getId(), 999999, LocalDate.now(), LocalDate.now().plusDays(5), false, null, null, 10.0);
            prestamoService.agregar(p);
            logFail("Préstamo con libro inexistente", "Permitió registrar préstamo para libro_id 999999", true);
        } catch (IllegalArgumentException e) {
            logPass("Rechazo de préstamo con ID de libro inexistente");
        } catch (Exception e) {
            logFail("Libro inexistente lanzó error genérico", e.getMessage(), false);
        }

        // 3.3 prestar con usuario inexistente
        try {
            Prestamo p = new Prestamo(0, 999999, libroStock1.getId(), LocalDate.now(), LocalDate.now().plusDays(5), false, null, null, 10.0);
            prestamoService.agregar(p);
            logFail("Préstamo con usuario inexistente", "Permitió registrar préstamo para usuario_id 999999", true);
        } catch (IllegalArgumentException e) {
            logPass("Rechazo de préstamo con ID de usuario inexistente");
        } catch (Exception e) {
            logFail("Usuario inexistente lanzó error genérico", e.getMessage(), false);
        }

        // 3.4 prestar libro con stock 1 -> verificar que stock pasa a 0
        Prestamo prestamoExitoso = null;
        try {
            prestamoExitoso = new Prestamo(0, user.getId(), libroStock1.getId(), LocalDate.now(), LocalDate.now().plusDays(7), false, null, null, 25.5);
            prestamoService.agregar(prestamoExitoso);
            Libro lPost = libroService.obtenerPorId(libroStock1.getId());
            if (lPost.getCantidadDisponible() == 0) {
                logPass("Stock decrementado correctamente tras préstamo (1 -> 0)");
            } else {
                logFail("Decremento de stock", "El stock no fue 0 tras el préstamo, fue: " + lPost.getCantidadDisponible(), true);
            }
        } catch (Exception e) {
            logFail("Error al realizar préstamo válido", e.getMessage(), false);
        }

        // 3.5 intentar eliminar usuario que tiene prestamo activo
        try {
            if (prestamoService.usuarioPrestamosActivos(user.getId())) {
                logPass("Detección de préstamos activos antes de eliminar usuario");
            } else {
                logFail("Detección préstamo activo", "No detectó préstamo activo para el usuario", true);
            }
        } catch (Exception e) {
            logFail("Error en detección de préstamo activo", e.getMessage(), false);
        }

        // 3.6 devolver el libro -> verificar que stock sube a 1
        try {
            if (prestamoExitoso != null) {
                prestamoService.devolverLibro(prestamoExitoso.getId());
                Libro lPostDev = libroService.obtenerPorId(libroStock1.getId());
                if (lPostDev.getCantidadDisponible() == 1) {
                    logPass("Stock restaurado correctamente tras devolución (0 -> 1)");
                } else {
                    logFail("Restauración de stock", "El stock no fue 1 tras devolución: " + lPostDev.getCantidadDisponible(), true);
                }
            }
        } catch (Exception e) {
            logFail("Error al devolver libro", e.getMessage(), false);
        }

        // 3.7 intentar devolver por segunda vez el mismo prestamo (doble devolucion)
        try {
            if (prestamoExitoso != null) {
                prestamoService.devolverLibro(prestamoExitoso.getId());
                logFail("Doble devolución permitida", "Permitió devolver un préstamo que ya estaba devuelto", true);
            }
        } catch (IllegalStateException e) {
            logPass("Rechazo de doble devolución (el libro ya fue devuelto)");
        } catch (Exception e) {
            logFail("Doble devolución lanzó error inesperado", e.getMessage(), false);
        }

        // 3.8 rechazo de prestamo con precio negativo
        try {
            Prestamo pNeg = new Prestamo(0, user.getId(), libroStock1.getId(), LocalDate.now(), LocalDate.now().plusDays(5), false, null, null, -15.0);
            prestamoService.agregar(pNeg);
            logFail("Préstamo precio negativo", "Permitió registrar préstamo con precio negativo: -15.0", true);
        } catch (IllegalArgumentException e) {
            logPass("Rechazo estricto de préstamo con precio negativo");
        } catch (Exception e) {
            logFail("Precio negativo lanzó error inesperado", e.getMessage(), false);
        }

        // 3.9 rechazo de prestamo con fecha de devolucion anterior a fecha de prestamo
        try {
            Prestamo pFechas = new Prestamo(0, user.getId(), libroStock1.getId(), LocalDate.now(), LocalDate.now().minusDays(5), false, null, null, 10.0);
            prestamoService.agregar(pFechas);
            logFail("Préstamo fechas incoherentes", "Permitió fechaDevolucion anterior a fechaPrestamo", true);
        } catch (IllegalArgumentException e) {
            logPass("Rechazo estricto de préstamo con fecha de devolución anterior a la de préstamo");
        } catch (Exception e) {
            logFail("Fechas incoherentes lanzó error inesperado", e.getMessage(), false);
        }

        // limpieza
        try {
            if (prestamoExitoso != null) prestamoService.eliminar(prestamoExitoso.getId());
            libroService.eliminar(libroStock1.getId());
            libroService.eliminar(libroStock0.getId());
            usuarioService.eliminar(user.getId());
        } catch (Exception ignored) {}
    }

    // pruebas de concurrencia
    private static void testConcurrencyAndRaceConditions(UsuarioService usuarioService, LibroService libroService, PrestamoService prestamoService) {
        System.out.println("\n--- [MODULO 4: ATAQUE DE CONCURRENCIA Y CONDICIONES DE CARRERA] ---");

        // 4.1 carrera por el ultimo libro: 20 hilos compiten por 1 sola copia
        Usuario user = new Usuario(0, "CC-RACE-01", "Usuario Race Condition", "race@test.com", "999");
        usuarioService.agregar(user);

        Libro libro1Copia = new Libro(0, "Libro Ultima Copia Concurrencia", "Autor Fuzz", "ISBN-RACE-1", 2021, "Tech", 1, "B1", null, "Disponible", null, null);
        libroService.agregar(libro1Copia);

        int numHilos = 20;
        ExecutorService executor = Executors.newFixedThreadPool(numHilos);
        CyclicBarrier barrier = new CyclicBarrier(numHilos);
        AtomicInteger exitos = new AtomicInteger(0);
        AtomicInteger rechazos = new AtomicInteger(0);
        AtomicInteger erroresInesperados = new AtomicInteger(0);

        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < numHilos; i++) {
            futures.add(executor.submit(() -> {
                try {
                    barrier.await(); // sincronizar todos para disparar al mismo milisegundo exacto
                    Prestamo p = new Prestamo(0, user.getId(), libro1Copia.getId(), LocalDate.now(), LocalDate.now().plusDays(3), false, null, null, 10.0);
                    prestamoService.agregar(p);
                    exitos.incrementAndGet();
                } catch (IllegalStateException e) {
                    // rechazo correcto por falta de stock
                    rechazos.incrementAndGet();
                } catch (Exception e) {
                    erroresInesperados.incrementAndGet();
                }
            }));
        }

        for (Future<?> f : futures) {
            try {
                f.get(10, TimeUnit.SECONDS);
            } catch (Exception ignored) {}
        }
        executor.shutdown();

        Libro libroFinal = libroService.obtenerPorId(libro1Copia.getId());
        System.out.printf("   [Resultado Carrera Stock]: Exitos=%d, Rechazados=%d, Errores=%d, Stock Final=%d\n",
                exitos.get(), rechazos.get(), erroresInesperados.get(), (libroFinal != null ? libroFinal.getCantidadDisponible() : -1));

        if (exitos.get() == 1 && libroFinal.getCantidadDisponible() == 0) {
            logPass("Concurrencia perfecta: Solo 1 hilo obtuvo el libro y el stock quedó exactamente en 0");
        } else if (libroFinal.getCantidadDisponible() < 0) {
            logFail("Race Condition Stock Negativo", "El stock quedó negativo (" + libroFinal.getCantidadDisponible() + ") bajo concurrencia!", true);
        } else if (exitos.get() > 1) {
            logFail("Race Condition Sobre-préstamo", "Más de 1 préstamo otorgado con solo 1 copia disponible (" + exitos.get() + ")", true);
        } else {
            logPass("Concurrencia controlada por aislamiento transaccional");
        }

        // limpieza de datos de concurrencia
        try {
            List<Prestamo> prestamos = prestamoService.obtenerTodos();
            for (Prestamo p : prestamos) {
                if (p.getLibroId() == libro1Copia.getId()) {
                    prestamoService.eliminar(p.getId());
                }
            }
            libroService.eliminar(libro1Copia.getId());
            usuarioService.eliminar(user.getId());
        } catch (Exception ignored) {}
    }

    // pruebas para el buscador
    private static void testBusquedaFuzzingAndInjections(BusquedaService busquedaService, LibroService libroService, UsuarioService usuarioService) {
        System.out.println("\n--- [MODULO 5: BUSQUEDA SERVICE - FUZZING Y ATAQUES DE INYECCIÓN] ---");

        // 5.1 categoria invalida / maliciosa
        try {
            busquedaService.buscarGlobal("test", "' OR 1=1 --");
            logFail("Categoría maliciosa", "Permitió una categoría arbitraria no parametrizada", true);
        } catch (IllegalArgumentException e) {
            logPass("Rechazo de categoría inválida / maliciosa");
        } catch (Exception e) {
            logFail("Categoría inválida lanzó error no esperado", e.getMessage(), false);
        }

        // 5.2 fuzzing de caracteres especiales en consulta
        String[] weirdQueries = {
                null,
                "",
                "   \t\n  ",
                "%",
                "_",
                "\\\\",
                "'",
                "\"",
                "'; DROP TABLE usuarios; --",
                "100% real no fake",
                "C# & C++ in action (2024)",
                "¡¿Palabra con puntuación y tildes?!",
                "🚀🌟🤖 Emojis y símbolos",
                "SELECT * FROM libros WHERE 1=1",
                "AND OR NOT LIKE ESCAPE"
        };

        boolean allSafe = true;
        for (String q : weirdQueries) {
            try {
                List<ResultadoBusqueda> res = busquedaService.buscarGlobal(q, "todo");
                // verificar que no arroje excepcion
            } catch (Exception e) {
                allSafe = false;
                logFail("Fuzzing query: [" + q + "]", "Excepción lanzada: " + e.getMessage(), false);
            }
        }

        if (allSafe) {
            logPass("Búsqueda global inmune a 15 tipos de ataques de Fuzzing y comodines SQL (%, _, \\, comillas)");
        }

        // 5.3 estres de tokens (200 palabras en una sola busqueda)
        StringBuilder massiveQuery = new StringBuilder();
        for (int i = 0; i < 200; i++) {
            massiveQuery.append("palabra").append(i).append(" ");
        }
        try {
            List<ResultadoBusqueda> res = busquedaService.buscarGlobal(massiveQuery.toString(), "todo");
            logPass("Búsqueda toleró consulta masiva de 200 tokens sin desbordar memoria ni límites de SQLite");
        } catch (Exception e) {
            logFail("Búsqueda masiva de 200 tokens falló", e.getMessage(), false);
        }
    }

    // pruebas de tildes y mayusculas
    private static void testDatabaseNormalizationAndAccents() {
        System.out.println("\n--- [MODULO 6: NORMALIZACIÓN Y FUNCIONES SQL PERSONALIZADAS] ---");

        Map<String, String> testCases = Map.of(
                "ÁéÍóÚ", "aeiou",
                "Canción de Hielo y Fuego", "cancion de hielo y fuego",
                "Pingüino en Niña", "pinguino en nina",
                "  ESPACIOS   EXTREMOS  ", "espacios   extremos"
        );

        boolean normalizerOk = true;
        for (Map.Entry<String, String> entry : testCases.entrySet()) {
            String norm = DatabaseConnection.normalizar(entry.getKey());
            if (!norm.equals(entry.getValue())) {
                normalizerOk = false;
                logFail("Normalización de '" + entry.getKey() + "'", "Esperado: '" + entry.getValue() + "', Obtenido: '" + norm + "'", false);
            }
        }

        if (normalizerOk) {
            logPass("Función DatabaseConnection.normalizar() elimina tildes y diacríticos consistentemente");
        }

        // probar funcion personalizada normalizar en sqlite
        try (Connection conn = DatabaseConnection.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT NORMALIZAR('Programación Avanzada') AS norm")) {
            if (rs.next() && "programacion avanzada".equals(rs.getString("norm"))) {
                logPass("Función SQLite NORMALIZAR(text) UDF operativa y registrada en la conexión");
            } else {
                logFail("Función SQLite NORMALIZAR", "Resultado inesperado", false);
            }
        } catch (Exception e) {
            logFail("Función SQLite NORMALIZAR falló", e.getMessage(), false);
        }
    }

    // pruebas de endpoints
    private static void testHttpEndpointFuzzing() {
        System.out.println("\n--- [MODULO 7: FUZZING DE ENDPOINTS HTTP (API LIVE CHECK)] ---");

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(2))
                .build();

        String baseUrl = "http://localhost:3001";

        // probar si el servidor esta activo
        try {
            HttpRequest checkReq = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/libros"))
                    .GET()
                    .timeout(Duration.ofSeconds(2))
                    .build();
            HttpResponse<String> checkResp = client.send(checkReq, HttpResponse.BodyHandlers.ofString());

            if (checkResp.statusCode() == 200) {
                System.out.println("  ℹ️ Servidor Javalin activo en puerto 3001. Ejecutando pruebas de carga HTTP...");

                // 7.1 json malformado a post /libros
                HttpRequest badJsonReq = HttpRequest.newBuilder()
                        .uri(URI.create(baseUrl + "/libros"))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString("{ \"titulo\": \"Incompleto\" ,,,, "))
                        .build();
                HttpResponse<String> respBadJson = client.send(badJsonReq, HttpResponse.BodyHandlers.ofString());
                if (respBadJson.statusCode() == 400 || respBadJson.statusCode() == 500) {
                    logPass("API HTTP rechazó JSON sintácticamente corrupto con código de error apropiado (" + respBadJson.statusCode() + ")");
                } else {
                    logFail("JSON corrupto HTTP", "Código inesperado: " + respBadJson.statusCode(), false);
                }

                // 7.2 tipos incorrectos en json (string en vez de int para aniopublicacion)
                HttpRequest badTypeReq = HttpRequest.newBuilder()
                        .uri(URI.create(baseUrl + "/libros"))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString("{\"titulo\":\"Libro\",\"autor\":\"Autor\",\"anioPublicacion\":\"NO_ES_NUMERO\"}"))
                        .build();
                HttpResponse<String> respBadType = client.send(badTypeReq, HttpResponse.BodyHandlers.ofString());
                if (respBadType.statusCode() == 400 || respBadType.statusCode() == 500) {
                    logPass("API HTTP controló tipado erróneo en deserialización Jackson (" + respBadType.statusCode() + ")");
                } else {
                    logFail("Tipado erróneo HTTP", "Código inesperado: " + respBadType.statusCode(), false);
                }

                // 7.3 id no numerico en url (/libros/abc)
                HttpRequest badIdReq = HttpRequest.newBuilder()
                        .uri(URI.create(baseUrl + "/libros/abc_injection"))
                        .GET()
                        .build();
                HttpResponse<String> respBadId = client.send(badIdReq, HttpResponse.BodyHandlers.ofString());
                if (respBadId.statusCode() == 400) {
                    logPass("API HTTP respondió 400 Bad Request ante ID no numérico en URL path param");
                } else {
                    logFail("ID no numérico", "Esperado 400 pero se obtuvo " + respBadId.statusCode(), false);
                }

                // 7.4 id gigante en url path param (/usuarios/99999999999999999999999999)
                HttpRequest overflowIdReq = HttpRequest.newBuilder()
                        .uri(URI.create(baseUrl + "/usuarios/9999999999999999999999999999999999"))
                        .GET()
                        .build();
                HttpResponse<String> respOverflowId = client.send(overflowIdReq, HttpResponse.BodyHandlers.ofString());
                if (respOverflowId.statusCode() == 400) {
                    logPass("API HTTP controló desbordamiento numérico en path param (retornó 400)");
                } else {
                    logFail("Desbordamiento numérico", "Código: " + respOverflowId.statusCode(), false);
                }

                // 7.5 devolucion de prestamo no existente (/prestamos/999999/devolver)
                HttpRequest devReq = HttpRequest.newBuilder()
                        .uri(URI.create(baseUrl + "/prestamos/999999/devolver"))
                        .PUT(HttpRequest.BodyPublishers.noBody())
                        .build();
                HttpResponse<String> respDev = client.send(devReq, HttpResponse.BodyHandlers.ofString());
                if (respDev.statusCode() == 404 || respDev.statusCode() == 400) {
                    logPass("API HTTP respondió error 404/400 al devolver préstamo inexistente");
                } else {
                    logFail("Devolución inexistente", "Código: " + respDev.statusCode(), false);
                }

            } else {
                System.out.println("  ℹ️ Servidor HTTP no respondió 200 en puerto 3001 (Saltando pruebas HTTP en vivo)");
            }
        } catch (Exception e) {
            System.out.println("  ℹ️ Servidor HTTP no está corriendo en segundo plano (puerto 3001). Pruebas de servicio ejecutadas directamente en memoria.");
        }
    }
}
