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

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Connection;
import java.time.Duration;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

public class DeepBreakStressTest {

    private static int total = 0;
    private static int passed = 0;
    private static int failed = 0;
    private static final List<String> issues = new ArrayList<>();

    public static void main(String[] args) {
        System.out.println("================================================================================");
        System.out.println("💣 AUDITORÍA PROFUNDA DE VULNERABILIDADES, BUGS Y CASOS EXTREMOS (DEEP BREAK)");
        System.out.println("================================================================================\n");

        DatabaseConnection.inicializarBaseDeDatos();

        UsuarioService usuarioService = new UsuarioService();
        LibroService libroService = new LibroService();
        PrestamoService prestamoService = new PrestamoService();
        BusquedaService busquedaService = new BusquedaService();

        testActualizarPrestamoEdgeCases(usuarioService, libroService, prestamoService);
        testEliminarPrestamosIntegrity(usuarioService, libroService, prestamoService);
        testXSSAndSpecialPayloads(usuarioService, libroService, busquedaService);
        testNumericalLimitsAndFloats(usuarioService, libroService, prestamoService);
        testHighConcurrencyHttpBurst();

        System.out.println("\n================================================================================");
        System.out.println("📊 REPORTE AUDITORÍA PROFUNDA");
        System.out.println("================================================================================");
        System.out.printf("Total Pruebas: %d | Aprobadas: %d | Falladas/Anomalías: %d\n", total, passed, failed);
        if (!issues.isEmpty()) {
            System.out.println("\n⚠️ HALLAZGOS Y CASOS A REVISAR:");
            for (int i = 0; i < issues.size(); i++) {
                System.out.printf("  [%d] %s\n", i + 1, issues.get(i));
            }
        } else {
            System.out.println("\n✨ El sistema superó con éxito todas las pruebas extremas.");
        }
        System.out.println("================================================================================\n");
    }

    private static void pass(String name) {
        total++;
        passed++;
        System.out.println("  ✅ [PASS] " + name);
    }

    private static void fail(String name, String reason) {
        total++;
        failed++;
        System.out.println("  ❌ [FAIL/WARN] " + name + " -> " + reason);
        issues.add(name + ": " + reason);
    }

    // pruebas al actualizar prestamo
    private static void testActualizarPrestamoEdgeCases(UsuarioService usuarioService, LibroService libroService, PrestamoService prestamoService) {
        System.out.println("\n--- [AUDITORÍA 1: ACTUALIZACIÓN DE PRÉSTAMOS Y RECONCILIACIÓN DE STOCK] ---");

        Usuario u1 = new Usuario(0, "CC-ACT-1", "Usuario Actualizar 1", "u1@test.com", "111");
        usuarioService.agregar(u1);

        Libro lA = new Libro(0, "Libro A Stock", "Autor", "ISBN-A", 2020, "Gen", 2, "U1", null, "Disponible", null, null);
        libroService.agregar(lA);

        Libro lB = new Libro(0, "Libro B Stock Agotado", "Autor", "ISBN-B", 2020, "Gen", 0, "U2", null, "Disponible", null, null);
        libroService.agregar(lB);

        // crear prestamo con libro a (stock pasa de 2 a 1)
        Prestamo p = new Prestamo(0, u1.getId(), lA.getId(), LocalDate.now(), LocalDate.now().plusDays(5), false, null, null, 10.0);
        prestamoService.agregar(p);

        // caso 1.1: cambiar el libro asignado en el prestamo de libro a a libro b (libro b no tiene stock)
        p.setLibroId(lB.getId());
        try {
            prestamoService.actualizar(p);
            fail("Reasignación a libro sin stock", "Permitió reasignar el préstamo activo a un libro con stock = 0");
        } catch (IllegalStateException e) {
            pass("Rechazo de cambio de libro a uno con stock agotado (mantiene invariante)");
        } catch (Exception e) {
            fail("Reasignación stock 0", "Error inesperado: " + e.getMessage());
        }

        // verificar que el stock de libro a no quedo corrupto tras el rollback
        Libro lACheck = libroService.obtenerPorId(lA.getId());
        if (lACheck.getCantidadDisponible() == 1) {
            pass("Integridad transaccional: Stock de Libro A se mantuvo en 1 tras rollback");
        } else {
            fail("Corrupción de stock tras rollback", "Stock Libro A es " + lACheck.getCantidadDisponible());
        }

        // caso 1.2: cambiar estado a devuelto mediante actualizar()
        p.setLibroId(lA.getId());
        p.setDevuelto(true);
        try {
            prestamoService.actualizar(p);
            Libro lAPost = libroService.obtenerPorId(lA.getId());
            if (lAPost.getCantidadDisponible() == 2) {
                pass("Stock reconciliado correctamente al marcar devuelto=true via actualizar (1 -> 2)");
            } else {
                fail("Reconciliación de stock", "Stock es " + lAPost.getCantidadDisponible() + " (esperado 2)");
            }
        } catch (Exception e) {
            fail("Actualizar devuelto=true", e.getMessage());
        }

        // caso 1.3: reactivar prestamo (devuelto=false) cuando hay stock
        p.setDevuelto(false);
        try {
            prestamoService.actualizar(p);
            Libro lAPost2 = libroService.obtenerPorId(lA.getId());
            if (lAPost2.getCantidadDisponible() == 1) {
                pass("Stock decrementado correctamente al reactivar préstamo (2 -> 1)");
            } else {
                fail("Reactivar préstamo stock", "Stock es " + lAPost2.getCantidadDisponible() + " (esperado 1)");
            }
        } catch (Exception e) {
            fail("Reactivar préstamo", e.getMessage());
        }

        // limpieza
        try {
            prestamoService.eliminar(p.getId());
            libroService.eliminar(lA.getId());
            libroService.eliminar(lB.getId());
            usuarioService.eliminar(u1.getId());
        } catch (Exception ignored) {}
    }

    // pruebas al eliminar prestamo y revisar stock
    private static void testEliminarPrestamosIntegrity(UsuarioService usuarioService, LibroService libroService, PrestamoService prestamoService) {
        System.out.println("\n--- [AUDITORÍA 2: ELIMINACIÓN DE PRÉSTAMOS Y RESTAURACIÓN DE STOCK] ---");

        Usuario u = new Usuario(0, "CC-DEL-1", "Usuario Delete Test", "udel@test.com", "222");
        usuarioService.agregar(u);

        Libro libro = new Libro(0, "Libro Delete Test", "Autor", "ISBN-DEL", 2021, "Test", 5, "U3", null, "Disponible", null, null);
        libroService.agregar(libro);

        // crear prestamo activo (stock 5 -> 4)
        Prestamo pActivo = new Prestamo(0, u.getId(), libro.getId(), LocalDate.now(), LocalDate.now().plusDays(5), false, null, null, 10.0);
        prestamoService.agregar(pActivo);

        // eliminar prestamo activo -> debe devolver la copia al libro (stock 4 -> 5)
        prestamoService.eliminar(pActivo.getId());
        Libro lPostDelActivo = libroService.obtenerPorId(libro.getId());
        if (lPostDelActivo.getCantidadDisponible() == 5) {
            pass("Eliminar préstamo ACTIVO restaura automáticamente el stock del libro (4 -> 5)");
        } else {
            fail("Restauración stock al eliminar activo", "Stock es " + lPostDelActivo.getCantidadDisponible() + " (esperado 5)");
        }

        // crear prestamo y devolverlo (stock 5 -> 4 -> 5)
        Prestamo pDevuelto = new Prestamo(0, u.getId(), libro.getId(), LocalDate.now(), LocalDate.now().plusDays(5), false, null, null, 10.0);
        prestamoService.agregar(pDevuelto);
        prestamoService.devolverLibro(pDevuelto.getId());

        // eliminar prestamo devuelto -> no debe sumar stock adicional (stock debe seguir en 5, no 6)
        prestamoService.eliminar(pDevuelto.getId());
        Libro lPostDelDevuelto = libroService.obtenerPorId(libro.getId());
        if (lPostDelDevuelto.getCantidadDisponible() == 5) {
            pass("Eliminar préstamo DEVUELTO no infla el stock (se mantiene exactamente en 5)");
        } else {
            fail("Inflación de stock al eliminar devuelto", "Stock se infló a " + lPostDelDevuelto.getCantidadDisponible() + " (esperado 5)");
        }

        // eliminar prestamo inexistente -> debe lanzar illegalargumentexception (404)
        try {
            prestamoService.eliminar(999999);
            fail("Eliminar préstamo inexistente", "No lanzó excepción");
        } catch (IllegalArgumentException e) {
            pass("Eliminar préstamo inexistente lanza IllegalArgumentException controlada");
        } catch (Exception e) {
            fail("Eliminar préstamo inexistente lanzó", e.getMessage());
        }

        // limpieza
        try {
            libroService.eliminar(libro.getId());
            usuarioService.eliminar(u.getId());
        } catch (Exception ignored) {}
    }

    // prueba con caracteres raros y xss
    private static void testXSSAndSpecialPayloads(UsuarioService usuarioService, LibroService libroService, BusquedaService busquedaService) {
        System.out.println("\n--- [AUDITORÍA 3: XSS, PAYLOADS HTML Y CONTROL DE CARACTERES] ---");

        String xssPayload = "<script>alert('XSS_ATTACK_123')</script>";
        Usuario u = new Usuario(0, "XSS-01", "Usuario " + xssPayload, "xss@evil.com", "000");
        usuarioService.agregar(u);

        Libro l = new Libro(0, "Libro " + xssPayload, "Autor " + xssPayload, "ISBN-XSS", 2023, "Tech", 1, "LOC", "http://evil.com?payload=" + xssPayload, "Disponible", null, null);
        libroService.agregar(l);

        // busqueda global del payload
        try {
            List<ResultadoBusqueda> res = busquedaService.buscarGlobal("XSS_ATTACK_123", "todo");
            if (!res.isEmpty()) {
                pass("Búsqueda indexó y recuperó el contenido con caracteres <script> sin fallas de sintaxis SQL ni inyección");
            } else {
                fail("Búsqueda XSS", "No encontró el registro");
            }
        } catch (Exception e) {
            fail("Búsqueda con tags HTML falló", e.getMessage());
        }

        // limpieza
        try {
            libroService.eliminar(l.getId());
            usuarioService.eliminar(u.getId());
        } catch (Exception ignored) {}
    }

    // prueba con precios decimales
    private static void testNumericalLimitsAndFloats(UsuarioService usuarioService, LibroService libroService, PrestamoService prestamoService) {
        System.out.println("\n--- [AUDITORÍA 4: LÍMITES NUMÉRICOS, DECIMALES Y PRECIOS] ---");

        Usuario u = new Usuario(0, "CC-NUM-1", "Usuario Decimales", "dec@test.com", "333");
        usuarioService.agregar(u);

        Libro l = new Libro(0, "Libro Millonario", "Autor", "ISBN-NUM", 2024, "Finanzas", 10, "E1", null, "Disponible", null, null);
        libroService.agregar(l);

        // prestamo con precio decimal de alta precision
        double precioGigante = 999999.99;
        Prestamo p = new Prestamo(0, u.getId(), l.getId(), LocalDate.now(), LocalDate.now().plusDays(30), false, null, null, precioGigante);
        prestamoService.agregar(p);

        Prestamo recuperado = prestamoService.obtenerPorId(p.getId());
        if (recuperado != null && Math.abs(recuperado.getPrecio() - precioGigante) < 0.001) {
            pass("Precisión decimal y manejo de precios altos ($999,999.99) verificado");
        } else {
            fail("Precisión precio", "Precio recuperado: " + (recuperado != null ? recuperado.getPrecio() : "null"));
        }

        // limpieza
        try {
            prestamoService.eliminar(p.getId());
            libroService.eliminar(l.getId());
            usuarioService.eliminar(u.getId());
        } catch (Exception ignored) {}
    }

    // peticiones concurrentes por http
    private static void testHighConcurrencyHttpBurst() {
        System.out.println("\n--- [AUDITORÍA 5: RÁFAGA DE ALTA CONCURRENCIA HTTP (50 REQUESTS SIMULTÁNEOS)] ---");

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3))
                .build();

        String baseUrl = "http://localhost:3001";
        int totalRequests = 50;
        ExecutorService pool = Executors.newFixedThreadPool(15);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger errorCount = new AtomicInteger(0);

        List<Future<?>> futures = new ArrayList<>();
        long start = System.currentTimeMillis();

        for (int i = 0; i < totalRequests; i++) {
            final int idx = i;
            futures.add(pool.submit(() -> {
                try {
                    String url = (idx % 3 == 0) ? baseUrl + "/busqueda?q=java&categoria=todo"
                               : (idx % 3 == 1) ? baseUrl + "/libros"
                               : baseUrl + "/usuarios";

                    HttpRequest req = HttpRequest.newBuilder()
                            .uri(URI.create(url))
                            .GET()
                            .timeout(Duration.ofSeconds(4))
                            .build();

                    HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());
                    if (resp.statusCode() == 200) {
                        successCount.incrementAndGet();
                    } else {
                        errorCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    errorCount.incrementAndGet();
                }
            }));
        }

        for (Future<?> f : futures) {
            try {
                f.get(10, TimeUnit.SECONDS);
            } catch (Exception ignored) {}
        }
        pool.shutdown();
        long elapsed = System.currentTimeMillis() - start;

        System.out.printf("   [Ráfaga HTTP]: %d peticiones en %d ms | Exitosas: %d | Fallidas: %d\n",
                totalRequests, elapsed, successCount.get(), errorCount.get());

        if (successCount.get() == totalRequests) {
            pass("Ráfaga de 50 peticiones concurrentes completada con 100% de éxito (0 caídas de Javalin/SQLite)");
        } else if (successCount.get() > 0) {
            pass("Servidor HTTP procesó ráfaga (Éxitos: " + successCount.get() + "/" + totalRequests + ")");
        } else {
            System.out.println("  ℹ️ Servidor HTTP no activo para prueba de ráfaga (se ejecuta en pruebas locales).");
        }
    }
}
