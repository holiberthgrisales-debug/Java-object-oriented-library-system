package com.biblioteca;

import com.biblioteca.config.DatabaseConnection;
import com.biblioteca.models.Libro;
import com.biblioteca.models.LibroDigital;
import com.biblioteca.models.LibroFisico;
import com.biblioteca.models.Prestamo;
import com.biblioteca.models.Usuario;
import com.biblioteca.services.BarcodeService;
import com.biblioteca.services.BusquedaService;
import com.biblioteca.services.LibroService;
import com.biblioteca.services.PrestamoService;
import com.biblioteca.services.UsuarioService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class SuiteTests {

    @BeforeAll
    public static void setUp() {
        String testDb = "target/test-suite-" + System.currentTimeMillis() + ".db";
        DatabaseConnection.setDbPath(testDb);
        DatabaseConnection.inicializarBaseDeDatos();
    }

    @Test
    @DisplayName("Ejecutar ChaosTestSuite")
    public void testChaosSuite() {
        assertDoesNotThrow(() -> ChaosTestSuite.main(new String[0]));
    }

    @Test
    @DisplayName("Ejecutar DeepBreakStressTest")
    public void testDeepBreakStress() {
        assertDoesNotThrow(() -> DeepBreakStressTest.main(new String[0]));
    }

    @Test
    @DisplayName("Verificar que actualizar ID inexistente lance IllegalArgumentException")
    public void testActualizarInexistente() {
        LibroService libroService = new LibroService();
        Libro libroFantasma = new Libro();
        libroFantasma.setId(9999999);
        libroFantasma.setTitulo("Fantasma");
        libroFantasma.setAutor("Anonimo");
        libroFantasma.setCantidadDisponible(5);
        libroFantasma.setAnioPublicacion(2020);

        assertThrows(IllegalArgumentException.class, () -> libroService.actualizar(libroFantasma));

        UsuarioService usuarioService = new UsuarioService();
        Usuario usuarioFantasma = new Usuario();
        usuarioFantasma.setId(9999999);
        usuarioFantasma.setNombre("Fantasma");

        assertThrows(IllegalArgumentException.class, () -> usuarioService.actualizar(usuarioFantasma));
    }

    @Test
    @DisplayName("Verificar que no se permita eliminar un libro o usuario con historial de préstamos")
    public void testEliminarConHistorialPrestamos() {
        LibroService libroService = new LibroService();
        UsuarioService usuarioService = new UsuarioService();
        PrestamoService prestamoService = new PrestamoService();

        Libro l = new Libro(0, "Libro Audit Test", "Autor Audit", "ISBN-AUDIT-" + System.currentTimeMillis(), 2024, "Pruebas", 5);
        libroService.agregar(l);

        Usuario u = new Usuario(0, "DOC-AUDIT-" + System.currentTimeMillis(), "Usuario Audit", "audit@test.com", "123456");
        usuarioService.agregar(u);

        Prestamo p = new Prestamo(0, u.getId(), l.getId(), LocalDate.now(), LocalDate.now().plusDays(5), false, u.getNombre(), l.getTitulo(), 10.0);
        prestamoService.agregar(p);

        // intentar eliminar libro con historial debe lanzar illegalstateexception
        assertThrows(IllegalStateException.class, () -> libroService.eliminar(l.getId()));

        // intentar eliminar usuario con historial debe lanzar illegalstateexception
        assertThrows(IllegalStateException.class, () -> usuarioService.eliminar(u.getId()));
    }

    @Test
    @DisplayName("Verificar resolución de barcode insensible a mayúsculas/minúsculas y resolución ambigua")
    public void testBarcodeCaseInsensitiveYAmbiguedad() {
        BarcodeService barcodeService = new BarcodeService();
        LibroService libroService = new LibroService();

        String isbnConX = "978" + (System.nanoTime() % 1000000000L) + "X";
        Libro l = new Libro(0, "Libro ISBN X", "Autor X", isbnConX, 2024, "Ficción", 3);
        libroService.agregar(l);

        // buscar en minuscula
        Map<String, Object> encontrado = barcodeService.buscarLibroPorIsbn(isbnConX.toLowerCase());
        assertNotNull(encontrado, "Debe encontrar el libro independientemente de si la X es mayúscula o minúscula");
        assertEquals(l.getId(), encontrado.get("id"));

        // probar resolucion ambigua cuando coinciden libro y usuario con el mismo id numerico
        Map<String, Object> resAmbigua = barcodeService.resolverCodigo(String.valueOf(l.getId()));
        assertNotNull(resAmbigua);
        assertTrue((Boolean) resAmbigua.get("encontrado"));
        assertNotNull(resAmbigua.get("tipo"));
    }

    @Test
    @DisplayName("Verificar serialización y deserialización polimórfica de Libro con Jackson")
    public void testPolimorfismoLibro() throws Exception {
        ObjectMapper mapper = new ObjectMapper();

        LibroDigital digital = new LibroDigital(1, "Clean Code Digital", "Robert Martin", "978-0132350884", 2008, "Tecnología", 10, "PDF", "https://ejemplo.com/clean-code.pdf");
        String jsonDigital = mapper.writeValueAsString(digital);
        assertTrue(jsonDigital.contains("tipoLibro"));

        Libro deserializado = mapper.readValue(jsonDigital, Libro.class);
        assertInstanceOf(LibroDigital.class, deserializado);

        LibroFisico fisico = new LibroFisico(2, "Clean Architecture Fisico", "Robert Martin", "978-0134494166", 2017, "Tecnología", 5, "Estante B-3");
        String jsonFisico = mapper.writeValueAsString(fisico);
        Libro deserializadoFisico = mapper.readValue(jsonFisico, Libro.class);
        assertInstanceOf(LibroFisico.class, deserializadoFisico);
    }

    @Test
    @DisplayName("Verificar validación de categoría en BusquedaService")
    public void testCategoriaBusquedaInvalida() {
        BusquedaService busquedaService = new BusquedaService();
        assertThrows(IllegalArgumentException.class, () -> busquedaService.buscarGlobal("termino", "categoria_inexistente_xyz"));
    }
}
