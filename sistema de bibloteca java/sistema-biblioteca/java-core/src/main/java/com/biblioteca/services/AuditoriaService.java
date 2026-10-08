package com.biblioteca.services;

import com.biblioteca.config.DatabaseConnection;
import com.biblioteca.models.Auditoria;
import com.biblioteca.models.PaginatedResponse;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class AuditoriaService {

    private static final Set<String> ALLOWED_SORT_COLUMNS = new HashSet<>(
            Arrays.asList("id", "entidad", "entidad_id", "accion", "usuario_responsable", "fecha_registro")
    );

    private Auditoria mapAuditoria(ResultSet rs) throws Exception {
        return new Auditoria(
                rs.getInt("id"),
                rs.getString("entidad"),
                rs.getObject("entidad_id") != null ? rs.getInt("entidad_id") : null,
                rs.getString("accion"),
                rs.getString("usuario_responsable"),
                rs.getString("detalles"),
                rs.getString("fecha_registro")
        );
    }

    public void registrar(String entidad, Integer entidadId, String accion, String usuarioResponsable, String detalles) {
        String consulta = "INSERT INTO auditoria(entidad, entidad_id, accion, usuario_responsable, detalles, fecha_registro) VALUES (?, ?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(consulta)) {
            stmt.setString(1, entidad != null ? entidad.toUpperCase().trim() : "GENERAL");
            if (entidadId != null) {
                stmt.setInt(2, entidadId);
            } else {
                stmt.setNull(2, java.sql.Types.INTEGER);
            }
            stmt.setString(3, accion != null ? accion.toUpperCase().trim() : "ACCION");
            stmt.setString(4, usuarioResponsable != null && !usuarioResponsable.trim().isEmpty() ? usuarioResponsable.trim() : "Sistema / Administrador");
            stmt.setString(5, detalles);
            stmt.setString(6, LocalDateTime.now().toString());
            stmt.executeUpdate();
        } catch (Exception e) {
            System.err.println("Advertencia: No se pudo registrar evento de auditoría: " + e.getMessage());
        }
    }

    public List<Auditoria> obtenerTodos() {
        String consulta = "SELECT * FROM auditoria ORDER BY id DESC";
        List<Auditoria> lista = new ArrayList<>();
        try (Connection conn = DatabaseConnection.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(consulta)) {
            while (rs.next()) {
                lista.add(mapAuditoria(rs));
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al obtener registros de auditoría: " + e.getMessage(), e);
        }
        return lista;
    }

    public Auditoria obtenerPorId(int id) {
        String consulta = "SELECT * FROM auditoria WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(consulta)) {
            stmt.setInt(1, id);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return mapAuditoria(rs);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al obtener auditoría por ID: " + e.getMessage(), e);
        }
        return null;
    }

    public List<Auditoria> obtenerPorEntidad(String entidad, int entidadId) {
        String consulta = "SELECT * FROM auditoria WHERE UPPER(entidad) = ? AND entidad_id = ? ORDER BY id DESC";
        List<Auditoria> lista = new ArrayList<>();
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(consulta)) {
            stmt.setString(1, entidad.toUpperCase().trim());
            stmt.setInt(2, entidadId);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    lista.add(mapAuditoria(rs));
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al obtener auditoría de entidad: " + e.getMessage(), e);
        }
        return lista;
    }

    public PaginatedResponse<Auditoria> obtenerPaginado(int page, int limit, String entidad, String accion, String sortBy, String sortOrder) {
        int pagina = Math.max(1, page);
        int limite = Math.max(1, Math.min(limit > 0 ? limit : 25, 200));
        int offset = (pagina - 1) * limite;

        String safeSortBy = (sortBy != null && ALLOWED_SORT_COLUMNS.contains(sortBy.toLowerCase().trim()))
                ? sortBy.toLowerCase().trim()
                : "id";
        String safeSortOrder = (sortOrder != null && sortOrder.equalsIgnoreCase("asc")) ? "ASC" : "DESC";

        StringBuilder whereClause = new StringBuilder(" WHERE 1=1");
        List<Object> params = new ArrayList<>();

        if (entidad != null && !entidad.trim().isEmpty()) {
            whereClause.append(" AND UPPER(entidad) = ?");
            params.add(entidad.toUpperCase().trim());
        }
        if (accion != null && !accion.trim().isEmpty()) {
            whereClause.append(" AND UPPER(accion) = ?");
            params.add(accion.toUpperCase().trim());
        }

        String countSql = "SELECT COUNT(*) FROM auditoria" + whereClause;
        String dataSql = "SELECT * FROM auditoria" + whereClause + " ORDER BY " + safeSortBy + " " + safeSortOrder + " LIMIT ? OFFSET ?";

        long total = 0;
        List<Auditoria> items = new ArrayList<>();

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
                        items.add(mapAuditoria(rs));
                    }
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al paginar auditoría: " + e.getMessage(), e);
        }

        return new PaginatedResponse<>(items, total, pagina, limite);
    }
}
