package com.biblioteca.services;

import com.biblioteca.config.DatabaseConnection;
import com.biblioteca.interfaces.Obligaciones;
import com.biblioteca.models.PaginatedResponse;
import com.biblioteca.models.Usuario;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class UsuarioService implements Obligaciones<Usuario> {

    private final AuditoriaService auditoriaService;

    private static final Set<String> ALLOWED_SORT_COLUMNS = new HashSet<>(
            Arrays.asList("id", "identificacion", "nombre", "email", "telefono")
    );

    public UsuarioService() {
        this.auditoriaService = new AuditoriaService();
    }

    public UsuarioService(AuditoriaService auditoriaService) {
        this.auditoriaService = auditoriaService != null ? auditoriaService : new AuditoriaService();
    }

    @Override
    public void agregar(Usuario usuario) {
        validar(usuario);

        if (usuario.getIdentificacion() != null && !usuario.getIdentificacion().trim().isEmpty()) {
            String checkDoc = "SELECT id FROM usuarios WHERE trim(identificacion) = ? LIMIT 1";
            try (Connection conn = DatabaseConnection.getConnection();
                 PreparedStatement st = conn.prepareStatement(checkDoc)) {
                st.setString(1, usuario.getIdentificacion().trim());
                try (ResultSet rs = st.executeQuery()) {
                    if (rs.next()) {
                        throw new IllegalArgumentException("Ya existe un socio registrado con la identificación especificada.");
                    }
                }
            } catch (SQLException e) {
                throw new RuntimeException("Error al validar identificación: " + e.getMessage(), e);
            }
        }

        String consulta = "INSERT INTO usuarios(identificacion, nombre, email, telefono) VALUES (?, ?, ?, ?)";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement sentencia = conn.prepareStatement(consulta, Statement.RETURN_GENERATED_KEYS)) {
            sentencia.setString(1, usuario.getIdentificacion());
            sentencia.setString(2, usuario.getNombre());
            sentencia.setString(3, usuario.getEmail());
            sentencia.setString(4, usuario.getTelefono());
            sentencia.executeUpdate();

            try (ResultSet generatedKeys = sentencia.getGeneratedKeys()) {
                if (generatedKeys.next()) {
                    usuario.setId(generatedKeys.getInt(1));
                }
            }

            auditoriaService.registrar("USUARIO", usuario.getId(), "CREAR", "Sistema / Administrador",
                    "Registrado socio '" + usuario.getNombre() + "' (Doc: " + usuario.getIdentificacion() + ", Email: " + usuario.getEmail() + ")");
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("error al agregar usuario: " + e.getMessage(), e);
        }
    }

    @Override
    public Usuario obtenerPorId(int id) {
        String consulta = "SELECT id, identificacion, nombre, email, telefono FROM usuarios WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement sentencia = conn.prepareStatement(consulta)) {
            sentencia.setInt(1, id);
            try (ResultSet rs = sentencia.executeQuery()) {
                if (rs.next()) {
                    return new Usuario(
                            rs.getInt("id"),
                            rs.getString("identificacion"),
                            rs.getString("nombre"),
                            rs.getString("email"),
                            rs.getString("telefono"));
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("error al obtener usuario: " + e.getMessage(), e);
        }
        return null;
    }

    @Override
    public List<Usuario> obtenerTodos() {
        String consulta = "SELECT id, identificacion, nombre, email, telefono FROM usuarios ORDER BY id ASC";
        List<Usuario> usuarios = new ArrayList<>();
        try (Connection conn = DatabaseConnection.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(consulta)) {
            while (rs.next()) {
                usuarios.add(new Usuario(
                        rs.getInt("id"),
                        rs.getString("identificacion"),
                        rs.getString("nombre"),
                        rs.getString("email"),
                        rs.getString("telefono")));
            }
        } catch (Exception e) {
            throw new RuntimeException("error al obtener usuarios: " + e.getMessage(), e);
        }
        return usuarios;
    }

    @Override
    public void actualizar(Usuario usuario) {
        validar(usuario);

        if (usuario.getIdentificacion() != null && !usuario.getIdentificacion().trim().isEmpty()) {
            String checkDoc = "SELECT id FROM usuarios WHERE trim(identificacion) = ? AND id != ? LIMIT 1";
            try (Connection conn = DatabaseConnection.getConnection();
                 PreparedStatement st = conn.prepareStatement(checkDoc)) {
                st.setString(1, usuario.getIdentificacion().trim());
                st.setInt(2, usuario.getId());
                try (ResultSet rs = st.executeQuery()) {
                    if (rs.next()) {
                        throw new IllegalArgumentException("Ya existe un socio registrado con la identificación especificada.");
                    }
                }
            } catch (SQLException e) {
                throw new RuntimeException("Error al validar identificación: " + e.getMessage(), e);
            }
        }

        String consulta = "UPDATE usuarios SET identificacion = ?, nombre = ?, email = ?, telefono = ? WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement sentencia = conn.prepareStatement(consulta)) {
            sentencia.setString(1, usuario.getIdentificacion());
            sentencia.setString(2, usuario.getNombre());
            sentencia.setString(3, usuario.getEmail());
            sentencia.setString(4, usuario.getTelefono());
            sentencia.setInt(5, usuario.getId());
            int filasAfectadas = sentencia.executeUpdate();
            if (filasAfectadas == 0) {
                throw new IllegalArgumentException("Usuario con ID " + usuario.getId() + " no encontrado.");
            }

            auditoriaService.registrar("USUARIO", usuario.getId(), "MODIFICAR", "Sistema / Administrador",
                    "Actualizado socio '" + usuario.getNombre() + "' (Doc: " + usuario.getIdentificacion() + ", Tel: " + usuario.getTelefono() + ")");
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("error al actualizar usuario: " + e.getMessage(), e);
        }
    }

    public PaginatedResponse<Usuario> obtenerPaginado(int page, int limit, String sortBy, String sortOrder, String busqueda) {
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
                whereClause.append(" AND (NORMALIZAR(nombre) LIKE ? OR NORMALIZAR(COALESCE(identificacion, '')) LIKE ? OR NORMALIZAR(COALESCE(email, '')) LIKE ? OR NORMALIZAR(COALESCE(telefono, '')) LIKE ? OR CAST(id AS TEXT) = ?)");
                String p = "%" + t + "%";
                params.add(p);
                params.add(p);
                params.add(p);
                params.add(p);
                params.add(t);
            }
        }

        String countSql = "SELECT COUNT(*) FROM usuarios" + whereClause;
        String dataSql = "SELECT id, identificacion, nombre, email, telefono FROM usuarios" + whereClause + " ORDER BY " + safeSortBy + " " + safeSortOrder + " LIMIT ? OFFSET ?";

        long total = 0;
        List<Usuario> items = new ArrayList<>();

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
                        items.add(new Usuario(
                                rs.getInt("id"),
                                rs.getString("identificacion"),
                                rs.getString("nombre"),
                                rs.getString("email"),
                                rs.getString("telefono")));
                    }
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("error al obtener usuarios paginados: " + e.getMessage(), e);
        }

        return new PaginatedResponse<>(items, total, pagina, limite);
    }

    public List<Usuario> buscar(String criterio) {
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

        StringBuilder consulta = new StringBuilder("SELECT id, identificacion, nombre, email, telefono FROM usuarios WHERE ");
        List<String> tokenConds = new ArrayList<>();
        List<String> params = new ArrayList<>();

        for (String t : tokens) {
            tokenConds.add("(NORMALIZAR(nombre) LIKE ? OR NORMALIZAR(COALESCE(identificacion, '')) LIKE ? OR NORMALIZAR(COALESCE(email, '')) LIKE ? OR NORMALIZAR(COALESCE(telefono, '')) LIKE ? OR CAST(id AS TEXT) = ?)");
            String p = "%" + t + "%";
            params.add(p);
            params.add(p);
            params.add(p);
            params.add(p);
            params.add(t);
        }
        consulta.append(String.join(" AND ", tokenConds)).append(" ORDER BY id ASC");

        List<Usuario> usuarios = new ArrayList<>();
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement sentencia = conn.prepareStatement(consulta.toString())) {

            for (int i = 0; i < params.size(); i++) {
                sentencia.setString(i + 1, params.get(i));
            }

            try (ResultSet rs = sentencia.executeQuery()) {
                while (rs.next()) {
                    usuarios.add(new Usuario(
                            rs.getInt("id"),
                            rs.getString("identificacion"),
                            rs.getString("nombre"),
                            rs.getString("email"),
                            rs.getString("telefono")));
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("error al buscar usuarios: " + e.getMessage(), e);
        }
        return usuarios;
    }

    @Override
    public void eliminar(int id) {
        try (Connection conn = DatabaseConnection.getConnection()) {
            conn.setAutoCommit(false);
            try {
                // guarda el nombre para la auditoria
                String nombreUsuario = "ID " + id;
                try (PreparedStatement sentenciaNom = conn.prepareStatement("SELECT nombre FROM usuarios WHERE id = ?")) {
                    sentenciaNom.setInt(1, id);
                    try (ResultSet rs = sentenciaNom.executeQuery()) {
                        if (rs.next()) {
                            nombreUsuario = rs.getString("nombre");
                        }
                    }
                }

                // verifica si tiene prestamos asociados (activos o historicos) para no perder trazabilidad
                try (PreparedStatement checkPrestamos = conn.prepareStatement("SELECT COUNT(*) FROM prestamos WHERE usuario_id = ?")) {
                    checkPrestamos.setInt(1, id);
                    try (ResultSet rs = checkPrestamos.executeQuery()) {
                        if (rs.next() && rs.getInt(1) > 0) {
                            throw new IllegalStateException("no se puede eliminar: el socio tiene préstamos asociados en su historial.");
                        }
                    }
                }

                // borra el usuario
                try (PreparedStatement sentencia = conn.prepareStatement("DELETE FROM usuarios WHERE id = ?")) {
                    sentencia.setInt(1, id);
                    int filas = sentencia.executeUpdate();
                    if (filas == 0) {
                        throw new IllegalArgumentException("usuario no encontrado.");
                    }
                }

                conn.commit();

                auditoriaService.registrar("USUARIO", id, "ELIMINAR", "Sistema / Administrador",
                        "Eliminado socio '" + nombreUsuario + "' (ID: " + id + ")");
            } catch (Exception e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }
        } catch (IllegalStateException | IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("error al eliminar usuario: " + e.getMessage(), e);
        }
    }

    public static final int MAX_NOMBRE = 150;
    public static final int MAX_IDENTIFICACION = 50;
    public static final int MAX_EMAIL = 150;
    public static final int MAX_TELEFONO = 30;

    private void validar(Usuario usuario) {
        if (usuario == null || usuario.getNombre() == null || usuario.getNombre().trim().isEmpty()) {
            throw new IllegalArgumentException("el nombre de usuario es obligatorio.");
        }
        if (usuario.getNombre().trim().length() > MAX_NOMBRE) {
            throw new IllegalArgumentException("el nombre de usuario no puede superar los " + MAX_NOMBRE + " caracteres.");
        }
        if (usuario.getIdentificacion() != null && usuario.getIdentificacion().trim().length() > MAX_IDENTIFICACION) {
            throw new IllegalArgumentException("la identificación no puede superar los " + MAX_IDENTIFICACION + " caracteres.");
        }
        if (usuario.getEmail() != null && !usuario.getEmail().isEmpty()) {
            if (usuario.getEmail().trim().isEmpty()) {
                throw new IllegalArgumentException("el correo electrónico no puede ser solo espacios en blanco.");
            }
            if (usuario.getEmail().trim().length() > MAX_EMAIL) {
                throw new IllegalArgumentException("el correo electrónico no puede superar los " + MAX_EMAIL + " caracteres.");
            }
        }
        if (usuario.getTelefono() != null && usuario.getTelefono().trim().length() > MAX_TELEFONO) {
            throw new IllegalArgumentException("el teléfono no puede superar los " + MAX_TELEFONO + " caracteres.");
        }
    }
}
