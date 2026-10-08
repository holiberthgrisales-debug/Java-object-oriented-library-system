package com.biblioteca.services;

import com.biblioteca.config.DatabaseConnection;
import com.biblioteca.interfaces.Obligaciones;
import com.biblioteca.models.Libro;
import com.biblioteca.models.LibroDigital;
import com.biblioteca.models.LibroFisico;
import com.biblioteca.models.PaginatedResponse;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Types;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class LibroService implements Obligaciones<Libro> {

    private final AuditoriaService auditoriaService;

    private static final Set<String> ALLOWED_SORT_COLUMNS = new HashSet<>(
            Arrays.asList("id", "titulo", "autor", "isbn", "anio_publicacion", "genero", "cantidad_disponible", "estado", "anio_edicion", "edicion")
    );

    public LibroService() {
        this.auditoriaService = new AuditoriaService();
    }

    public LibroService(AuditoriaService auditoriaService) {
        this.auditoriaService = auditoriaService != null ? auditoriaService : new AuditoriaService();
    }

    private Libro mapLibro(ResultSet rs) throws Exception {
        Integer anioEdicion = rs.getObject("anio_edicion") != null ? rs.getInt("anio_edicion") : null;
        String urlDescarga = rs.getString("url_descarga");
        if (urlDescarga != null && !urlDescarga.trim().isEmpty()) {
            return new LibroDigital(
                    rs.getInt("id"),
                    rs.getString("titulo"),
                    rs.getString("autor"),
                    rs.getString("isbn"),
                    rs.getInt("anio_publicacion"),
                    rs.getString("genero"),
                    rs.getInt("cantidad_disponible"),
                    "Digital",
                    urlDescarga,
                    rs.getString("estado"),
                    anioEdicion,
                    rs.getString("edicion")
            );
        } else {
            return new LibroFisico(
                    rs.getInt("id"),
                    rs.getString("titulo"),
                    rs.getString("autor"),
                    rs.getString("isbn"),
                    rs.getInt("anio_publicacion"),
                    rs.getString("genero"),
                    rs.getInt("cantidad_disponible"),
                    rs.getString("ubicacion"),
                    rs.getString("estado"),
                    anioEdicion,
                    rs.getString("edicion")
            );
        }
    }

    @Override
    public void agregar(Libro libro) {
        validar(libro);

        if (libro.getIsbn() != null && !libro.getIsbn().trim().isEmpty()) {
            String checkIsbn = "SELECT id FROM libros WHERE UPPER(replace(replace(isbn, '-', ''), ' ', '')) = UPPER(replace(replace(?, '-', ''), ' ', '')) LIMIT 1";
            try (Connection conn = DatabaseConnection.getConnection();
                 PreparedStatement st = conn.prepareStatement(checkIsbn)) {
                st.setString(1, libro.getIsbn().trim());
                try (ResultSet rs = st.executeQuery()) {
                    if (rs.next()) {
                        throw new IllegalArgumentException("Ya existe un libro registrado con el ISBN especificado.");
                    }
                }
            } catch (SQLException e) {
                throw new RuntimeException("Error al validar ISBN: " + e.getMessage(), e);
            }
        }

        String consulta = "INSERT INTO libros(titulo, autor, isbn, anio_publicacion, genero, cantidad_disponible, ubicacion, url_descarga, estado, anio_edicion, edicion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement sentencia = conn.prepareStatement(consulta, Statement.RETURN_GENERATED_KEYS)) {
            sentencia.setString(1, libro.getTitulo());
            sentencia.setString(2, libro.getAutor());
            sentencia.setString(3, libro.getIsbn());
            sentencia.setInt(4, libro.getAnioPublicacion());
            sentencia.setString(5, libro.getGenero());
            sentencia.setInt(6, libro.getCantidadDisponible());
            sentencia.setString(7, libro.getUbicacion());
            sentencia.setString(8, libro.getUrlDescarga());
            sentencia.setString(9, libro.getEstado() != null && !libro.getEstado().trim().isEmpty() ? libro.getEstado().trim() : "Disponible");
            if (libro.getAnioEdicion() != null) {
                sentencia.setInt(10, libro.getAnioEdicion());
            } else {
                sentencia.setNull(10, Types.INTEGER);
            }
            sentencia.setString(11, libro.getEdicion() != null ? libro.getEdicion().trim() : null);
            sentencia.executeUpdate();

            try (ResultSet generatedKeys = sentencia.getGeneratedKeys()) {
                if (generatedKeys.next()) {
                    libro.setId(generatedKeys.getInt(1));
                }
            }

            auditoriaService.registrar("LIBRO", libro.getId(), "CREAR", "Sistema / Administrador",
                    "Creado libro '" + libro.getTitulo() + "' por " + libro.getAutor() + " (Stock: " + libro.getCantidadDisponible() + ")");
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("error al agregar libro: " + e.getMessage(), e);
        }
    }

    @Override
    public Libro obtenerPorId(int id) {
        String consulta = "SELECT * FROM libros WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement sentencia = conn.prepareStatement(consulta)) {
            sentencia.setInt(1, id);
            try (ResultSet rs = sentencia.executeQuery()) {
                if (rs.next()) {
                    return mapLibro(rs);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("error al obtener libro: " + e.getMessage(), e);
        }
        return null;
    }

    @Override
    public List<Libro> obtenerTodos() {
        String consulta = "SELECT * FROM libros ORDER BY id ASC";
        List<Libro> libros = new ArrayList<>();
        try (Connection conn = DatabaseConnection.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(consulta)) {
            while (rs.next()) {
                libros.add(mapLibro(rs));
            }
        } catch (Exception e) {
            throw new RuntimeException("error al obtener libros: " + e.getMessage(), e);
        }
        return libros;
    }

    @Override
    public void actualizar(Libro libro) {
        validar(libro);

        if (libro.getIsbn() != null && !libro.getIsbn().trim().isEmpty()) {
            String checkIsbn = "SELECT id FROM libros WHERE UPPER(replace(replace(isbn, '-', ''), ' ', '')) = UPPER(replace(replace(?, '-', ''), ' ', '')) AND id != ? LIMIT 1";
            try (Connection conn = DatabaseConnection.getConnection();
                 PreparedStatement st = conn.prepareStatement(checkIsbn)) {
                st.setString(1, libro.getIsbn().trim());
                st.setInt(2, libro.getId());
                try (ResultSet rs = st.executeQuery()) {
                    if (rs.next()) {
                        throw new IllegalArgumentException("Ya existe un libro registrado con el ISBN especificado.");
                    }
                }
            } catch (SQLException e) {
                throw new RuntimeException("Error al validar ISBN: " + e.getMessage(), e);
            }
        }

        String consulta = "UPDATE libros SET titulo = ?, autor = ?, isbn = ?, anio_publicacion = ?, genero = ?, cantidad_disponible = ?, ubicacion = ?, url_descarga = ?, estado = ?, anio_edicion = ?, edicion = ? WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement sentencia = conn.prepareStatement(consulta)) {
            sentencia.setString(1, libro.getTitulo());
            sentencia.setString(2, libro.getAutor());
            sentencia.setString(3, libro.getIsbn());
            sentencia.setInt(4, libro.getAnioPublicacion());
            sentencia.setString(5, libro.getGenero());
            sentencia.setInt(6, libro.getCantidadDisponible());
            sentencia.setString(7, libro.getUbicacion());
            sentencia.setString(8, libro.getUrlDescarga());
            sentencia.setString(9, libro.getEstado() != null && !libro.getEstado().trim().isEmpty() ? libro.getEstado().trim() : "Disponible");
            if (libro.getAnioEdicion() != null) {
                sentencia.setInt(10, libro.getAnioEdicion());
            } else {
                sentencia.setNull(10, Types.INTEGER);
            }
            sentencia.setString(11, libro.getEdicion() != null ? libro.getEdicion().trim() : null);
            sentencia.setInt(12, libro.getId());
            int filasAfectadas = sentencia.executeUpdate();
            if (filasAfectadas == 0) {
                throw new IllegalArgumentException("Libro con ID " + libro.getId() + " no encontrado.");
            }

            auditoriaService.registrar("LIBRO", libro.getId(), "MODIFICAR", "Sistema / Administrador",
                    "Actualizado libro '" + libro.getTitulo() + "' (Estado: " + libro.getEstado() + ", Stock: " + libro.getCantidadDisponible() + ")");
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("error al actualizar libro: " + e.getMessage(), e);
        }
    }

    public PaginatedResponse<Libro> obtenerPaginado(int page, int limit, String sortBy, String sortOrder,
                                                    String busqueda, String genero, Boolean soloDisponibles, Integer anio) {
        int pagina = Math.max(1, page);
        int limite = Math.max(1, Math.min(limit > 0 ? limit : 25, 200));
        int offset = (pagina - 1) * limite;

        String safeSortBy = (sortBy != null && ALLOWED_SORT_COLUMNS.contains(sortBy.toLowerCase().trim()))
                ? sortBy.toLowerCase().trim()
                : "id";
        String safeSortOrder = (sortOrder != null && sortOrder.equalsIgnoreCase("desc")) ? "DESC" : "ASC";

        StringBuilder whereClause = new StringBuilder(" WHERE 1=1");
        List<Object> params = new ArrayList<>();

        if (busqueda != null && !busqueda.trim().isEmpty()) {
            String critNorm = DatabaseConnection.normalizar(busqueda);
            String[] tokens = Arrays.stream(critNorm.split("\\s+"))
                    .filter(t -> !t.isEmpty())
                    .toArray(String[]::new);

            for (String t : tokens) {
                whereClause.append(" AND (NORMALIZAR(titulo) LIKE ? OR NORMALIZAR(autor) LIKE ? OR NORMALIZAR(isbn) LIKE ? OR NORMALIZAR(genero) LIKE ? OR NORMALIZAR(COALESCE(estado, '')) LIKE ? OR NORMALIZAR(COALESCE(edicion, '')) LIKE ? OR CAST(COALESCE(anio_edicion, '') AS TEXT) = ? OR CAST(id AS TEXT) = ?)");
                String p = "%" + t + "%";
                params.add(p);
                params.add(p);
                params.add(p);
                params.add(p);
                params.add(p);
                params.add(p);
                params.add(t);
                params.add(t);
            }
        }

        if (genero != null && !genero.trim().isEmpty()) {
            whereClause.append(" AND LOWER(genero) = ?");
            params.add(genero.toLowerCase().trim());
        }

        if (soloDisponibles != null) {
            if (soloDisponibles) {
                whereClause.append(" AND cantidad_disponible > 0");
            } else {
                whereClause.append(" AND cantidad_disponible = 0");
            }
        }

        if (anio != null) {
            whereClause.append(" AND anio_publicacion = ?");
            params.add(anio);
        }

        String countSql = "SELECT COUNT(*) FROM libros" + whereClause;
        String dataSql = "SELECT * FROM libros" + whereClause + " ORDER BY " + safeSortBy + " " + safeSortOrder + " LIMIT ? OFFSET ?";

        long total = 0;
        List<Libro> items = new ArrayList<>();

        try (Connection conn = DatabaseConnection.getConnection()) {
            try (PreparedStatement countStmt = conn.prepareStatement(countSql)) {
                for (int i = 0; i < params.size(); i++) {
                    countStmt.setObject(i + 1, params.get(i));
                }
                try (ResultSet rs = countStmt.executeQuery()) {
                    if (rs.next()) {
                        total = rs.getLong(1);
                    }
                }
            }

            try (PreparedStatement dataStmt = conn.prepareStatement(dataSql)) {
                int paramIdx = 1;
                for (Object param : params) {
                    dataStmt.setObject(paramIdx++, param);
                }
                dataStmt.setInt(paramIdx++, limite);
                dataStmt.setInt(paramIdx, offset);

                try (ResultSet rs = dataStmt.executeQuery()) {
                    while (rs.next()) {
                        items.add(mapLibro(rs));
                    }
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("error al obtener libros paginados: " + e.getMessage(), e);
        }

        return new PaginatedResponse<>(items, total, pagina, limite);
    }

    public List<Libro> buscar(String criterio) {
        if (criterio == null || criterio.trim().isEmpty()) {
            return obtenerTodos();
        }
        String critNorm = DatabaseConnection.normalizar(criterio);
        String[] tokens = Arrays.stream(critNorm.split("\\s+"))
                .filter(t -> !t.isEmpty())
                .toArray(String[]::new);

        if (tokens.length == 0) {
            return obtenerTodos();
        }

        StringBuilder consulta = new StringBuilder("SELECT * FROM libros WHERE ");
        List<String> tokenConds = new ArrayList<>();
        List<String> params = new ArrayList<>();

        for (String t : tokens) {
            tokenConds.add("(NORMALIZAR(titulo) LIKE ? OR NORMALIZAR(autor) LIKE ? OR NORMALIZAR(isbn) LIKE ? OR NORMALIZAR(genero) LIKE ? OR NORMALIZAR(COALESCE(estado, '')) LIKE ? OR NORMALIZAR(COALESCE(edicion, '')) LIKE ? OR CAST(COALESCE(anio_edicion, '') AS TEXT) = ? OR CAST(id AS TEXT) = ?)");
            String p = "%" + t + "%";
            params.add(p);
            params.add(p);
            params.add(p);
            params.add(p);
            params.add(p);
            params.add(p);
            params.add(t);
            params.add(t);
        }
        consulta.append(String.join(" AND ", tokenConds)).append(" ORDER BY id ASC");

        List<Libro> libros = new ArrayList<>();
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement sentencia = conn.prepareStatement(consulta.toString())) {

            for (int i = 0; i < params.size(); i++) {
                sentencia.setString(i + 1, params.get(i));
            }

            try (ResultSet rs = sentencia.executeQuery()) {
                while (rs.next()) {
                    libros.add(mapLibro(rs));
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("error al buscar libros: " + e.getMessage(), e);
        }
        return libros;
    }

    public List<Libro> filtrar(String genero, Boolean soloDisponibles, Integer anio) {
        StringBuilder consulta = new StringBuilder("SELECT * FROM libros WHERE 1=1");
        List<Object> parametros = new ArrayList<>();

        if (genero != null && !genero.trim().isEmpty()) {
            consulta.append(" AND LOWER(genero) = ?");
            parametros.add(genero.toLowerCase().trim());
        }

        if (soloDisponibles != null) {
            if (soloDisponibles) {
                consulta.append(" AND cantidad_disponible > 0");
            } else {
                consulta.append(" AND cantidad_disponible = 0");
            }
        }

        if (anio != null) {
            consulta.append(" AND anio_publicacion = ?");
            parametros.add(anio);
        }

        consulta.append(" ORDER BY id ASC");

        List<Libro> libros = new ArrayList<>();
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement sentencia = conn.prepareStatement(consulta.toString())) {

            for (int i = 0; i < parametros.size(); i++) {
                sentencia.setObject(i + 1, parametros.get(i));
            }

            try (ResultSet rs = sentencia.executeQuery()) {
                while (rs.next()) {
                    libros.add(mapLibro(rs));
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("error al filtrar libros: " + e.getMessage(), e);
        }
        return libros;
    }

    @Override
    public void eliminar(int id) {
        try (Connection conn = DatabaseConnection.getConnection()) {
            conn.setAutoCommit(false);
            try {
                // guarda el titulo para la auditoria
                String tituloLibro = "ID " + id;
                try (PreparedStatement sentenciaNom = conn.prepareStatement("SELECT titulo FROM libros WHERE id = ?")) {
                    sentenciaNom.setInt(1, id);
                    try (ResultSet rs = sentenciaNom.executeQuery()) {
                        if (rs.next()) {
                            tituloLibro = rs.getString("titulo");
                        }
                    }
                }

                // verifica si tiene prestamos asociados (activos o historicos) para no perder trazabilidad
                try (PreparedStatement checkPrestamos = conn.prepareStatement("SELECT COUNT(*) FROM prestamos WHERE libro_id = ?")) {
                    checkPrestamos.setInt(1, id);
                    try (ResultSet rs = checkPrestamos.executeQuery()) {
                        if (rs.next() && rs.getInt(1) > 0) {
                            throw new IllegalStateException("no se puede eliminar: el libro tiene préstamos asociados en su historial.");
                        }
                    }
                }

                // borra el libro
                try (PreparedStatement sentencia = conn.prepareStatement("DELETE FROM libros WHERE id = ?")) {
                    sentencia.setInt(1, id);
                    int filas = sentencia.executeUpdate();
                    if (filas == 0) {
                        throw new IllegalArgumentException("libro no encontrado.");
                    }
                }

                conn.commit();

                auditoriaService.registrar("LIBRO", id, "ELIMINAR", "Sistema / Administrador",
                        "Eliminado permanentemente libro '" + tituloLibro + "' (ID: " + id + ")");
            } catch (Exception e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }
        } catch (IllegalStateException | IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("error al eliminar libro: " + e.getMessage(), e);
        }
    }

    public static final int MAX_TITULO = 250;
    public static final int MAX_AUTOR = 200;
    public static final int MAX_ISBN = 30;
    public static final int MAX_GENERO = 100;
    public static final int MAX_EDICION = 100;
    public static final int MAX_UBICACION = 150;
    public static final int MAX_URL_DESCARGA = 500;

    private void validar(Libro libro) {
        if (libro == null || libro.getTitulo() == null || libro.getTitulo().trim().isEmpty()
                || libro.getAutor() == null || libro.getAutor().trim().isEmpty()) {
            throw new IllegalArgumentException("el título y el autor son obligatorios.");
        }
        if (libro.getTitulo().trim().length() > MAX_TITULO) {
            throw new IllegalArgumentException("el título no puede superar los " + MAX_TITULO + " caracteres.");
        }
        if (libro.getAutor().trim().length() > MAX_AUTOR) {
            throw new IllegalArgumentException("el autor no puede superar los " + MAX_AUTOR + " caracteres.");
        }
        if (libro.getIsbn() != null && libro.getIsbn().trim().length() > MAX_ISBN) {
            throw new IllegalArgumentException("el ISBN no puede superar los " + MAX_ISBN + " caracteres.");
        }
        if (libro.getGenero() != null && libro.getGenero().trim().length() > MAX_GENERO) {
            throw new IllegalArgumentException("el género no puede superar los " + MAX_GENERO + " caracteres.");
        }
        if (libro.getEdicion() != null && libro.getEdicion().trim().length() > MAX_EDICION) {
            throw new IllegalArgumentException("la edición no puede superar los " + MAX_EDICION + " caracteres.");
        }
        if (libro.getUbicacion() != null && libro.getUbicacion().trim().length() > MAX_UBICACION) {
            throw new IllegalArgumentException("la ubicación no puede superar los " + MAX_UBICACION + " caracteres.");
        }
        if (libro.getUrlDescarga() != null && !libro.getUrlDescarga().trim().isEmpty()) {
            String url = libro.getUrlDescarga().trim().toLowerCase();
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                throw new IllegalArgumentException("la url de descarga debe comenzar con http:// o https://");
            }
            if (libro.getUrlDescarga().trim().length() > MAX_URL_DESCARGA) {
                throw new IllegalArgumentException("la url de descarga no puede superar los " + MAX_URL_DESCARGA + " caracteres.");
            }
        }
        if (libro.getCantidadDisponible() < 0) {
            throw new IllegalArgumentException("la cantidad disponible no puede ser negativa.");
        }
        if (libro.getAnioPublicacion() < 0) {
            throw new IllegalArgumentException("el año de publicación no es válido.");
        }
        if (libro.getAnioEdicion() != null && libro.getAnioEdicion() < 0) {
            throw new IllegalArgumentException("el año de edición no es válido.");
        }
    }
}
