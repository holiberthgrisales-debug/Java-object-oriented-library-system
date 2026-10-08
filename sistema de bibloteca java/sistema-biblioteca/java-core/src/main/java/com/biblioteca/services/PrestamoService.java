package com.biblioteca.services;

import com.biblioteca.config.DatabaseConnection;
import com.biblioteca.interfaces.Obligaciones;
import com.biblioteca.models.PaginatedResponse;
import com.biblioteca.models.Prestamo;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class PrestamoService implements Obligaciones<Prestamo> {

    private final AuditoriaService auditoriaService;

    private static final Set<String> ALLOWED_SORT_COLUMNS = new HashSet<>(
            Arrays.asList("id", "usuario_id", "libro_id", "fecha_prestamo", "fecha_devolucion", "devuelto", "precio")
    );

    public PrestamoService() {
        this.auditoriaService = new AuditoriaService();
    }

    public PrestamoService(AuditoriaService auditoriaService) {
        this.auditoriaService = auditoriaService != null ? auditoriaService : new AuditoriaService();
    }

    @Override
    public void agregar(Prestamo prestamo) {
        validar(prestamo);

        try (Connection conn = DatabaseConnection.getConnection()) {
            conn.setAutoCommit(false);
            try {
                // revisa si el libro tiene stock disponible
                String consultaCheckLibro = "SELECT cantidad_disponible, titulo FROM libros WHERE id = ?";
                String tituloLibro = "";
                try (PreparedStatement sentenciaCheck = conn.prepareStatement(consultaCheckLibro)) {
                    sentenciaCheck.setInt(1, prestamo.getLibroId());
                    try (ResultSet rs = sentenciaCheck.executeQuery()) {
                        if (rs.next()) {
                            int disponibles = rs.getInt("cantidad_disponible");
                            tituloLibro = rs.getString("titulo");
                            if (disponibles <= 0) {
                                throw new IllegalStateException("el libro no tiene copias disponibles para préstamo.");
                            }
                        } else {
                            throw new IllegalArgumentException("libro no encontrado.");
                        }
                    }
                }

                // revisa que el socio exista en la base de datos
                String consultaCheckUsuario = "SELECT id, nombre FROM usuarios WHERE id = ?";
                String nombreUsuario = "";
                try (PreparedStatement sentenciaCheckU = conn.prepareStatement(consultaCheckUsuario)) {
                    sentenciaCheckU.setInt(1, prestamo.getUsuarioId());
                    try (ResultSet rs = sentenciaCheckU.executeQuery()) {
                        if (!rs.next()) {
                            throw new IllegalArgumentException("usuario no encontrado.");
                        }
                        nombreUsuario = rs.getString("nombre");
                    }
                }

                // guarda el registro del prestamo
                LocalDate fPrestamo = prestamo.getFechaPrestamo() != null ? prestamo.getFechaPrestamo() : LocalDate.now();
                prestamo.setFechaPrestamo(fPrestamo);
                String consultaInsert = "INSERT INTO prestamos(usuario_id, libro_id, fecha_prestamo, fecha_devolucion, devuelto, precio) VALUES (?, ?, ?, ?, 0, ?)";
                try (PreparedStatement sentenciaInsert = conn.prepareStatement(consultaInsert, Statement.RETURN_GENERATED_KEYS)) {
                    sentenciaInsert.setInt(1, prestamo.getUsuarioId());
                    sentenciaInsert.setInt(2, prestamo.getLibroId());
                    sentenciaInsert.setString(3, fPrestamo.toString());
                    sentenciaInsert.setString(4, prestamo.getFechaDevolucion() != null ? prestamo.getFechaDevolucion().toString() : null);
                    sentenciaInsert.setDouble(5, prestamo.getPrecio());
                    sentenciaInsert.executeUpdate();
                    try (ResultSet generatedKeys = sentenciaInsert.getGeneratedKeys()) {
                        if (generatedKeys.next()) {
                            prestamo.setId(generatedKeys.getInt(1));
                        }
                    }
                }

                // descuenta 1 al stock del libro atomicamente evitando condiciones de carrera
                String consultaUpdate = "UPDATE libros SET cantidad_disponible = cantidad_disponible - 1 WHERE id = ? AND cantidad_disponible > 0";
                try (PreparedStatement sentenciaUpdate = conn.prepareStatement(consultaUpdate)) {
                    sentenciaUpdate.setInt(1, prestamo.getLibroId());
                    int filasAfectadas = sentenciaUpdate.executeUpdate();
                    if (filasAfectadas == 0) {
                        throw new IllegalStateException("el libro no tiene copias disponibles para préstamo.");
                    }
                }

                conn.commit();

                auditoriaService.registrar("PRESTAMO", prestamo.getId(), "PRESTAR", "Sistema / Administrador",
                        "Préstamo otorgado de '" + tituloLibro + "' a socio " + nombreUsuario + " (Devolución límite: " + prestamo.getFechaDevolucion() + ")");
            } catch (Exception e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }
        } catch (IllegalStateException | IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException(e.getMessage(), e);
        }
    }

    private LocalDate parsearFecha(ResultSet rs, String columna) {
        try {
            String str = rs.getString(columna);
            if (str != null && !str.trim().isEmpty() && str.length() >= 10) {
                return LocalDate.parse(str.substring(0, 10));
            }
        } catch (Exception e) {
            throw new RuntimeException("error al parsear fecha: " + e.getMessage(), e);
        }
        return null;
    }

    @Override
    public Prestamo obtenerPorId(int id) {
        String consulta = "SELECT p.*, u.nombre AS nombre_usuario, l.titulo AS titulo_libro " +
                "FROM prestamos p " +
                "LEFT JOIN usuarios u ON p.usuario_id = u.id " +
                "LEFT JOIN libros l ON p.libro_id = l.id " +
                "WHERE p.id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement sentencia = conn.prepareStatement(consulta)) {
            sentencia.setInt(1, id);
            try (ResultSet rs = sentencia.executeQuery()) {
                if (rs.next()) {
                    return new Prestamo(
                            rs.getInt("id"),
                            rs.getInt("usuario_id"),
                            rs.getInt("libro_id"),
                            parsearFecha(rs, "fecha_prestamo"),
                            parsearFecha(rs, "fecha_devolucion"),
                            rs.getInt("devuelto") == 1,
                            rs.getString("nombre_usuario"),
                            rs.getString("titulo_libro"),
                            rs.getDouble("precio")
                    );
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("error al obtener préstamo: " + e.getMessage(), e);
        }
        return null;
    }

    @Override
    public List<Prestamo> obtenerTodos() {
        String consulta = "SELECT p.*, u.nombre AS nombre_usuario, l.titulo AS titulo_libro " +
                "FROM prestamos p " +
                "LEFT JOIN usuarios u ON p.usuario_id = u.id " +
                "LEFT JOIN libros l ON p.libro_id = l.id ORDER BY p.id ASC";
        List<Prestamo> prestamos = new ArrayList<>();
        try (Connection conn = DatabaseConnection.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(consulta)) {
            while (rs.next()) {
                prestamos.add(new Prestamo(
                        rs.getInt("id"),
                        rs.getInt("usuario_id"),
                        rs.getInt("libro_id"),
                        parsearFecha(rs, "fecha_prestamo"),
                        parsearFecha(rs, "fecha_devolucion"),
                        rs.getInt("devuelto") == 1,
                        rs.getString("nombre_usuario"),
                        rs.getString("titulo_libro"),
                        rs.getDouble("precio")
                ));
            }
        } catch (Exception e) {
            throw new RuntimeException("error al obtener préstamos: " + e.getMessage(), e);
        }
        return prestamos;
    }

    public PaginatedResponse<Prestamo> obtenerPaginado(int page, int limit, String sortBy, String sortOrder, String estado) {
        int pagina = Math.max(1, page);
        int limite = Math.max(1, Math.min(limit > 0 ? limit : 25, 200));
        int offset = (pagina - 1) * limite;

        String safeSortBy = (sortBy != null && ALLOWED_SORT_COLUMNS.contains(sortBy.toLowerCase().trim()))
                ? "p." + sortBy.toLowerCase().trim()
                : "p.id";
        String safeSortOrder = (sortOrder != null && sortOrder.equalsIgnoreCase("asc")) ? "ASC" : "DESC";

        StringBuilder whereClause = new StringBuilder(" WHERE 1=1");
        List<Object> params = new ArrayList<>();

        if (estado != null && !estado.trim().isEmpty()) {
            if ("vencidos".equalsIgnoreCase(estado.trim()) || "vencido".equalsIgnoreCase(estado.trim())) {
                whereClause.append(" AND p.devuelto = 0 AND p.fecha_devolucion IS NOT NULL AND p.fecha_devolucion < CURRENT_DATE");
            } else if ("activos".equalsIgnoreCase(estado.trim()) || "activo".equalsIgnoreCase(estado.trim())) {
                whereClause.append(" AND p.devuelto = 0 AND (p.fecha_devolucion IS NULL OR p.fecha_devolucion >= CURRENT_DATE)");
            } else if ("devueltos".equalsIgnoreCase(estado.trim()) || "devuelto".equalsIgnoreCase(estado.trim())) {
                whereClause.append(" AND p.devuelto = 1");
            }
        }

        String countSql = "SELECT COUNT(*) FROM prestamos p" + whereClause;
        String dataSql = "SELECT p.*, u.nombre AS nombre_usuario, l.titulo AS titulo_libro " +
                "FROM prestamos p " +
                "LEFT JOIN usuarios u ON p.usuario_id = u.id " +
                "LEFT JOIN libros l ON p.libro_id = l.id " +
                whereClause +
                " ORDER BY " + safeSortBy + " " + safeSortOrder + " LIMIT ? OFFSET ?";

        long total = 0;
        List<Prestamo> items = new ArrayList<>();

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
                        items.add(new Prestamo(
                                rs.getInt("id"),
                                rs.getInt("usuario_id"),
                                rs.getInt("libro_id"),
                                parsearFecha(rs, "fecha_prestamo"),
                                parsearFecha(rs, "fecha_devolucion"),
                                rs.getInt("devuelto") == 1,
                                rs.getString("nombre_usuario"),
                                rs.getString("titulo_libro"),
                                rs.getDouble("precio")
                        ));
                    }
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("error al obtener préstamos paginados: " + e.getMessage(), e);
        }

        return new PaginatedResponse<>(items, total, pagina, limite);
    }

    @Override
    public void actualizar(Prestamo prestamo) {
        validar(prestamo);

        try (Connection conn = DatabaseConnection.getConnection()) {
            conn.setAutoCommit(false);
            try {
                // consulta como estaba el prestamo antes
                int libroIdPrevio = 0;
                boolean devueltoPrevio = false;
                String consultaPrev = "SELECT libro_id, devuelto FROM prestamos WHERE id = ?";
                try (PreparedStatement sentenciaPrev = conn.prepareStatement(consultaPrev)) {
                    sentenciaPrev.setInt(1, prestamo.getId());
                    try (ResultSet rs = sentenciaPrev.executeQuery()) {
                        if (rs.next()) {
                            libroIdPrevio = rs.getInt("libro_id");
                            devueltoPrevio = rs.getInt("devuelto") == 1;
                        } else {
                            throw new IllegalArgumentException("préstamo no encontrado.");
                        }
                    }
                }

                // revisa que el socio exista
                String consultaCheckUsuario = "SELECT id FROM usuarios WHERE id = ?";
                try (PreparedStatement sentenciaCheckU = conn.prepareStatement(consultaCheckUsuario)) {
                    sentenciaCheckU.setInt(1, prestamo.getUsuarioId());
                    try (ResultSet rs = sentenciaCheckU.executeQuery()) {
                        if (!rs.next()) {
                            throw new IllegalArgumentException("usuario no encontrado.");
                        }
                    }
                }

                boolean devueltoNuevo = prestamo.isDevuelto();
                int libroIdNuevo = prestamo.getLibroId();

                // si cambio de libro revisa que el nuevo tenga stock
                boolean requiereStock = (!devueltoNuevo && libroIdPrevio != libroIdNuevo)
                        || (devueltoPrevio && !devueltoNuevo && libroIdPrevio == libroIdNuevo);

                String consultaCheckLibro = "SELECT cantidad_disponible FROM libros WHERE id = ?";
                try (PreparedStatement sentenciaCheckL = conn.prepareStatement(consultaCheckLibro)) {
                    sentenciaCheckL.setInt(1, libroIdNuevo);
                    try (ResultSet rs = sentenciaCheckL.executeQuery()) {
                        if (rs.next()) {
                            int disponibles = rs.getInt("cantidad_disponible");
                            if (requiereStock && disponibles <= 0) {
                                throw new IllegalStateException("el libro no tiene copias disponibles para préstamo.");
                            }
                        } else {
                            throw new IllegalArgumentException("libro no encontrado.");
                        }
                    }
                }

                // guarda los cambios del prestamo
                String consulta = "UPDATE prestamos SET usuario_id = ?, libro_id = ?, fecha_prestamo = ?, fecha_devolucion = ?, devuelto = ?, precio = ? WHERE id = ?";
                try (PreparedStatement sentencia = conn.prepareStatement(consulta)) {
                    sentencia.setInt(1, prestamo.getUsuarioId());
                    sentencia.setInt(2, prestamo.getLibroId());
                    sentencia.setString(3, prestamo.getFechaPrestamo() != null ? prestamo.getFechaPrestamo().toString() : null);
                    sentencia.setString(4, prestamo.getFechaDevolucion() != null ? prestamo.getFechaDevolucion().toString() : null);
                    sentencia.setInt(5, prestamo.isDevuelto() ? 1 : 0);
                    sentencia.setDouble(6, prestamo.getPrecio());
                    sentencia.setInt(7, prestamo.getId());
                    sentencia.executeUpdate();
                }

                // ajusta el stock si lo devolvieron o si cambiaron de libro
                if (libroIdPrevio == libroIdNuevo) {
                    if (!devueltoPrevio && devueltoNuevo) {
                        try (PreparedStatement sentenciaInc = conn.prepareStatement(
                                "UPDATE libros SET cantidad_disponible = cantidad_disponible + 1 WHERE id = ?")) {
                            sentenciaInc.setInt(1, libroIdNuevo);
                            sentenciaInc.executeUpdate();
                        }
                    } else if (devueltoPrevio && !devueltoNuevo) {
                        try (PreparedStatement sentenciaDec = conn.prepareStatement(
                                "UPDATE libros SET cantidad_disponible = cantidad_disponible - 1 WHERE id = ? AND cantidad_disponible > 0")) {
                            sentenciaDec.setInt(1, libroIdNuevo);
                            int afectadas = sentenciaDec.executeUpdate();
                            if (afectadas == 0) {
                                throw new IllegalStateException("el libro no tiene copias disponibles para préstamo.");
                            }
                        }
                    }
                } else {
                    if (!devueltoPrevio) {
                        try (PreparedStatement sentenciaInc = conn.prepareStatement(
                                "UPDATE libros SET cantidad_disponible = cantidad_disponible + 1 WHERE id = ?")) {
                            sentenciaInc.setInt(1, libroIdPrevio);
                            sentenciaInc.executeUpdate();
                        }
                    }
                    if (!devueltoNuevo) {
                        try (PreparedStatement sentenciaDec = conn.prepareStatement(
                                "UPDATE libros SET cantidad_disponible = cantidad_disponible - 1 WHERE id = ? AND cantidad_disponible > 0")) {
                            sentenciaDec.setInt(1, libroIdNuevo);
                            int afectadas = sentenciaDec.executeUpdate();
                            if (afectadas == 0) {
                                throw new IllegalStateException("el libro no tiene copias disponibles para préstamo.");
                            }
                        }
                    }
                }

                conn.commit();

                auditoriaService.registrar("PRESTAMO", prestamo.getId(), "MODIFICAR", "Sistema / Administrador",
                        "Actualizado préstamo ID " + prestamo.getId() + " (Devuelto: " + prestamo.isDevuelto() + ", Precio: $" + prestamo.getPrecio() + ")");
            } catch (Exception e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }
        } catch (IllegalStateException | IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("error al actualizar préstamo: " + e.getMessage(), e);
        }
    }

    @Override
    public void eliminar(int id) {
        try (Connection conn = DatabaseConnection.getConnection()) {
            conn.setAutoCommit(false);
            try {
                int idLibro;
                boolean devuelto;
                try (PreparedStatement sentencia = conn.prepareStatement(
                        "SELECT libro_id, devuelto FROM prestamos WHERE id = ?")) {
                    sentencia.setInt(1, id);
                    try (ResultSet rs = sentencia.executeQuery()) {
                        if (!rs.next()) {
                            throw new IllegalArgumentException("préstamo no encontrado.");
                        }
                        idLibro = rs.getInt("libro_id");
                        devuelto = rs.getInt("devuelto") == 1;
                    }
                }

                try (PreparedStatement sentencia = conn.prepareStatement("DELETE FROM prestamos WHERE id = ?")) {
                    sentencia.setInt(1, id);
                    sentencia.executeUpdate();
                }

                if (!devuelto) {
                    try (PreparedStatement sentencia = conn.prepareStatement(
                            "UPDATE libros SET cantidad_disponible = cantidad_disponible + 1 WHERE id = ?")) {
                        sentencia.setInt(1, idLibro);
                        sentencia.executeUpdate();
                    }
                }
                conn.commit();

                auditoriaService.registrar("PRESTAMO", id, "ELIMINAR", "Sistema / Administrador",
                        "Eliminado préstamo ID " + id + " (Stock repuesto en libro ID " + idLibro + ")");
            } catch (Exception e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("error al eliminar préstamo: " + e.getMessage(), e);
        }
    }

    public void devolverLibro(int idPrestamo) {
        try (Connection conn = DatabaseConnection.getConnection()) {
            conn.setAutoCommit(false);
            try {
                int idLibro;
                boolean yaDevuelto;
                String consultaGetLibro = "SELECT libro_id, devuelto FROM prestamos WHERE id = ?";
                try (PreparedStatement sentenciaGet = conn.prepareStatement(consultaGetLibro)) {
                    sentenciaGet.setInt(1, idPrestamo);
                    try (ResultSet rs = sentenciaGet.executeQuery()) {
                        if (rs.next()) {
                            idLibro = rs.getInt("libro_id");
                            yaDevuelto = rs.getInt("devuelto") == 1;
                        } else {
                            throw new IllegalArgumentException("préstamo no encontrado.");
                        }
                    }
                }

                if (yaDevuelto) {
                    throw new IllegalStateException("el libro ya ha sido devuelto anteriormente.");
                }

                // marca el prestamo como devuelto
                String consultaUpdatePrestamo = "UPDATE prestamos SET devuelto = 1 WHERE id = ?";
                try (PreparedStatement sentenciaUpdate = conn.prepareStatement(consultaUpdatePrestamo)) {
                    sentenciaUpdate.setInt(1, idPrestamo);
                    sentenciaUpdate.executeUpdate();
                }

                // devuelve 1 copia al stock del libro
                String consultaUpdateStock = "UPDATE libros SET cantidad_disponible = cantidad_disponible + 1 WHERE id = ?";
                try (PreparedStatement sentenciaUpdateStock = conn.prepareStatement(consultaUpdateStock)) {
                    sentenciaUpdateStock.setInt(1, idLibro);
                    sentenciaUpdateStock.executeUpdate();
                }

                conn.commit();

                auditoriaService.registrar("PRESTAMO", idPrestamo, "DEVOLVER", "Sistema / Administrador",
                        "Libro devuelto satisfactoriamente. Préstamo ID " + idPrestamo + " marcado como devuelto y stock restituido (+1) en Libro ID " + idLibro);
            } catch (Exception e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }
        } catch (IllegalStateException | IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException(e.getMessage(), e);
        }
    }

    public List<Prestamo> obtenerVencidos() {
        String consulta = "SELECT p.*, u.nombre AS nombre_usuario, l.titulo AS titulo_libro " +
                "FROM prestamos p " +
                "LEFT JOIN usuarios u ON p.usuario_id = u.id " +
                "LEFT JOIN libros l ON p.libro_id = l.id " +
                "WHERE p.devuelto = 0 " +
                "AND p.fecha_devolucion IS NOT NULL AND p.fecha_devolucion < CURRENT_DATE ORDER BY p.id ASC";
        List<Prestamo> vencidos = new ArrayList<>();
        try (Connection conn = DatabaseConnection.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(consulta)) {
            while (rs.next()) {
                vencidos.add(new Prestamo(
                        rs.getInt("id"),
                        rs.getInt("usuario_id"),
                        rs.getInt("libro_id"),
                        parsearFecha(rs, "fecha_prestamo"),
                        parsearFecha(rs, "fecha_devolucion"),
                        false,
                        rs.getString("nombre_usuario"),
                        rs.getString("titulo_libro"),
                        rs.getDouble("precio")
                ));
            }
        } catch (Exception e) {
            throw new RuntimeException("error al obtener préstamos vencidos: " + e.getMessage(), e);
        }
        return vencidos;
    }

    public boolean libroPrestamosActivos(int libroId) {
        String consulta = "SELECT COUNT(*) FROM prestamos WHERE libro_id = ? AND devuelto = 0";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement sentencia = conn.prepareStatement(consulta)) {
            sentencia.setInt(1, libroId);
            try (ResultSet rs = sentencia.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt(1) > 0;
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("error al verificar préstamos del libro: " + e.getMessage(), e);
        }
        return false;
    }

    public boolean usuarioPrestamosActivos(int usuarioId) {
        String consulta = "SELECT COUNT(*) FROM prestamos WHERE usuario_id = ? AND devuelto = 0";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement sentencia = conn.prepareStatement(consulta)) {
            sentencia.setInt(1, usuarioId);
            try (ResultSet rs = sentencia.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt(1) > 0;
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("error al verificar préstamos del usuario: " + e.getMessage(), e);
        }
        return false;
    }

    private void validar(Prestamo prestamo) {
        if (prestamo == null) {
            throw new IllegalArgumentException("el préstamo no puede ser nulo.");
        }
        if (prestamo.getUsuarioId() <= 0) {
            throw new IllegalArgumentException("el id de usuario es obligatorio y debe ser un número positivo.");
        }
        if (prestamo.getLibroId() <= 0) {
            throw new IllegalArgumentException("el id de libro es obligatorio y debe ser un número positivo.");
        }
        if (prestamo.getPrecio() < 0) {
            throw new IllegalArgumentException("el precio del préstamo no puede ser negativo.");
        }
        if (prestamo.getPrecio() > 10_000_000.0) {
            throw new IllegalArgumentException("el precio del préstamo excede el valor máximo permitido (10,000,000).");
        }
        LocalDate fPrestamo = prestamo.getFechaPrestamo() != null ? prestamo.getFechaPrestamo() : LocalDate.now();
        if (prestamo.getFechaDevolucion() != null && prestamo.getFechaDevolucion().isBefore(fPrestamo)) {
            throw new IllegalArgumentException("la fecha de devolución no puede ser anterior a la fecha de préstamo.");
        }
    }
}
