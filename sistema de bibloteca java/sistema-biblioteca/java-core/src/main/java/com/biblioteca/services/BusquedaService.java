package com.biblioteca.services;

import com.biblioteca.config.DatabaseConnection;
import com.biblioteca.models.ResultadoBusqueda;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

// busca libros, usuarios y prestamos en la base de datos
public class BusquedaService {
    private static final int LIMITE_RESULTADOS = 300;
    private static final Set<String> CATEGORIAS_VALIDAS = Set.of(
            "todo",
            "libros", "autor", "titulo", "genero", "isbn", "ubicacion", "estado", "edicion", "anio_edicion",
            "libros_disponibles", "libros_agotados", "libros_digitales", "libros_fisicos",
            "usuarios", "cedula", "identificacion", "nombre_usuario", "email", "telefono",
            "prestamos", "prestamos_activos", "prestamos_vencidos", "prestamos_devueltos");

    public List<ResultadoBusqueda> buscarGlobal(String query, String categoria) {
        String cat = categoria == null ? "todo" : categoria.trim().toLowerCase();
        if (!CATEGORIAS_VALIDAS.contains(cat)) {
            throw new IllegalArgumentException("la categoría de búsqueda no es válida: " + cat);
        }

        String rawQuery = query == null ? "" : query.trim();
        String queryNorm = DatabaseConnection.normalizar(rawQuery);
        String[] tokens = queryNorm.isEmpty() ? new String[0]
                : Arrays.stream(queryNorm.split("\\s+"))
                        .filter(t -> !t.isEmpty())
                        .toArray(String[]::new);

        List<String> consultas = new ArrayList<>();
        List<String> parametros = new ArrayList<>();

        if (esCategoriaLibro(cat)) {
            agregarConsultaLibros(consultas, parametros, cat, tokens);
        }
        if (esCategoriaUsuario(cat)) {
            agregarConsultaUsuarios(consultas, parametros, cat, tokens);
        }
        if (esCategoriaPrestamo(cat)) {
            agregarConsultaPrestamos(consultas, parametros, cat, tokens);
        }

        if (consultas.isEmpty()) {
            return List.of();
        }

        String consulta = "SELECT sub.tipo, sub.tipo_badge, sub.id, sub.principal, sub.detalle, sub.estado_ubicacion, sub.accion_tipo, sub.accion_id "
                + "FROM (" + String.join(" UNION ALL ", consultas) + ") sub "
                + "ORDER BY sub.tipo ASC, sub.principal COLLATE NOCASE ASC, sub.id ASC LIMIT " + LIMITE_RESULTADOS;
        List<ResultadoBusqueda> resultados = new ArrayList<>();

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement statement = conn.prepareStatement(consulta)) {

            for (int i = 0; i < parametros.size(); i++) {
                statement.setString(i + 1, parametros.get(i));
            }

            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    resultados.add(new ResultadoBusqueda(
                            rs.getString("tipo"),
                            rs.getString("tipo_badge"),
                            rs.getInt("id"),
                            rs.getString("principal"),
                            rs.getString("detalle"),
                            rs.getString("estado_ubicacion"),
                            rs.getString("accion_tipo"),
                            rs.getInt("accion_id")
                    ));
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("error al buscar en la base de datos: " + e.getMessage(), e);
        }
        return resultados;
    }

    private void agregarConsultaLibros(List<String> consultas, List<String> parametros, String categoria, String[] tokens) {
        String baseWhere = "1=1";
        if ("libros_disponibles".equals(categoria)) {
            baseWhere = "l.cantidad_disponible > 0";
        } else if ("libros_agotados".equals(categoria)) {
            baseWhere = "l.cantidad_disponible <= 0";
        } else if ("libros_digitales".equals(categoria)) {
            baseWhere = "COALESCE(l.url_descarga, '') <> ''";
        } else if ("libros_fisicos".equals(categoria)) {
            baseWhere = "COALESCE(l.ubicacion, '') <> ''";
        }

        String condicionTokens = armarCondicionTokens(tokens, parametros, categoria,
                "autor", new String[]{"l.autor"},
                "titulo", new String[]{"l.titulo"},
                "genero", new String[]{"l.genero"},
                "isbn", new String[]{"l.isbn"},
                "ubicacion", new String[]{"l.ubicacion", "l.url_descarga"},
                "estado", new String[]{"l.estado"},
                "edicion", new String[]{"l.edicion"},
                "anio_edicion", new String[]{"CAST(l.anio_edicion AS TEXT)"},
                "default", new String[]{"CAST(l.id AS TEXT)", "l.titulo", "l.autor", "l.isbn", "l.genero", "l.ubicacion", "l.url_descarga", "l.estado", "l.edicion", "CAST(l.anio_edicion AS TEXT)"}
        );

        String whereTotal = baseWhere + (condicionTokens.isEmpty() ? "" : " AND " + condicionTokens);

        consultas.add("SELECT 'Libro' AS tipo, '#6366f1' AS tipo_badge, l.id, l.titulo AS principal, "
                + "'Autor: ' || l.autor || ' | Género: ' || COALESCE(NULLIF(l.genero, ''), 'General') "
                + "|| ' | Año Pub: ' || COALESCE(CAST(l.anio_publicacion AS TEXT), 'Sin año') "
                + "|| CASE WHEN COALESCE(l.edicion, '') <> '' THEN ' | Ed: ' || l.edicion ELSE '' END "
                + "|| CASE WHEN l.anio_edicion IS NOT NULL THEN ' (' || CAST(l.anio_edicion AS TEXT) || ')' ELSE '' END "
                + "|| ' | ISBN: ' || COALESCE(l.isbn, 'Sin ISBN') AS detalle, "
                + "'Estado: ' || COALESCE(l.estado, 'Disponible') || ' | ' "
                + "|| CASE WHEN l.cantidad_disponible > 0 THEN 'Stock: ' || l.cantidad_disponible || ' disp.' ELSE 'Agotado' END "
                + "|| CASE WHEN COALESCE(l.ubicacion, '') <> '' THEN ' | Ubic: ' || l.ubicacion ELSE '' END "
                + "|| CASE WHEN COALESCE(l.url_descarga, '') <> '' THEN ' | Digital' ELSE '' END AS estado_ubicacion, "
                + "'libro' AS accion_tipo, l.id AS accion_id FROM libros l WHERE " + whereTotal);
    }

    private void agregarConsultaUsuarios(List<String> consultas, List<String> parametros, String categoria, String[] tokens) {
        String baseWhere = "1=1";

        String condicionTokens = armarCondicionTokens(tokens, parametros, categoria,
                "cedula", new String[]{"u.identificacion"},
                "identificacion", new String[]{"u.identificacion"},
                "nombre_usuario", new String[]{"u.nombre"},
                "email", new String[]{"u.email"},
                "telefono", new String[]{"u.telefono"},
                "default", new String[]{"CAST(u.id AS TEXT)", "u.identificacion", "u.nombre", "u.email", "u.telefono"}
        );

        String whereTotal = baseWhere + (condicionTokens.isEmpty() ? "" : " AND " + condicionTokens);

        consultas.add("SELECT 'Usuario' AS tipo, '#06b6d4' AS tipo_badge, u.id, "
                + "u.nombre || CASE WHEN COALESCE(u.identificacion, '') <> '' THEN ' (CC: ' || u.identificacion || ')' ELSE '' END AS principal, "
                + "'Correo: ' || COALESCE(NULLIF(u.email, ''), 'Sin correo') || ' | Tel: ' || COALESCE(NULLIF(u.telefono, ''), 'Sin teléfono') AS detalle, "
                + "COALESCE(NULLIF(u.identificacion, ''), 'ID #' || u.id) AS estado_ubicacion, "
                + "'usuario' AS accion_tipo, u.id AS accion_id FROM usuarios u WHERE " + whereTotal);
    }

    private void agregarConsultaPrestamos(List<String> consultas, List<String> parametros, String categoria, String[] tokens) {
        String estadoExpr = "CASE WHEN p.devuelto = 1 THEN 'Devuelto' "
                + "WHEN p.fecha_devolucion IS NOT NULL AND date(p.fecha_devolucion) < date('now', 'localtime') THEN 'Vencido' "
                + "ELSE 'Activo' END";

        String baseWhere = "1=1";
        if ("prestamos_activos".equals(categoria)) {
            baseWhere = "p.devuelto = 0 AND (p.fecha_devolucion IS NULL OR date(p.fecha_devolucion) >= date('now', 'localtime'))";
        } else if ("prestamos_vencidos".equals(categoria)) {
            baseWhere = "p.devuelto = 0 AND p.fecha_devolucion IS NOT NULL AND date(p.fecha_devolucion) < date('now', 'localtime')";
        } else if ("prestamos_devueltos".equals(categoria)) {
            baseWhere = "p.devuelto = 1";
        }

        String condicionTokens = armarCondicionTokens(tokens, parametros, categoria,
                "default", new String[]{
                        "CAST(p.id AS TEXT)", "CAST(p.usuario_id AS TEXT)", "CAST(p.libro_id AS TEXT)",
                        "u.nombre", "u.identificacion", "l.titulo", "l.autor",
                        "p.fecha_prestamo", "p.fecha_devolucion", estadoExpr,
                        "CAST(COALESCE(p.precio, 0) AS TEXT)"
                }
        );

        String whereTotal = baseWhere + (condicionTokens.isEmpty() ? "" : " AND " + condicionTokens);

        consultas.add("SELECT 'Préstamo' AS tipo, '#8b5cf6' AS tipo_badge, p.id, "
                + "COALESCE(l.titulo, 'Libro #' || p.libro_id) AS principal, "
                + "'Usuario: ' || COALESCE(u.nombre, 'Usuario #' || p.usuario_id) || ' | Prestado: ' || COALESCE(p.fecha_prestamo, '-') "
                + "|| ' | Hasta: ' || COALESCE(p.fecha_devolucion, '-') "
                + "|| CASE WHEN COALESCE(p.precio, 0) > 0 THEN ' | Precio: $' || printf('%.2f', p.precio) ELSE '' END AS detalle, "
                + estadoExpr + " AS estado_ubicacion, "
                + "CASE WHEN p.devuelto = 1 THEN 'prestamo_devuelto' "
                + "WHEN p.fecha_devolucion IS NOT NULL AND date(p.fecha_devolucion) < date('now', 'localtime') THEN 'prestamo_vencido' "
                + "ELSE 'prestamo_activo' END AS accion_tipo, p.id AS accion_id "
                + "FROM prestamos p "
                + "LEFT JOIN usuarios u ON u.id = p.usuario_id "
                + "LEFT JOIN libros l ON l.id = p.libro_id "
                + "WHERE " + whereTotal);
    }

    private String armarCondicionTokens(String[] tokens, List<String> parametros, String categoria, Object... mapeoColumnas) {
        if (tokens == null || tokens.length == 0) {
            return "";
        }

        String[] columnas = null;
        for (int i = 0; i < mapeoColumnas.length; i += 2) {
            String catKey = (String) mapeoColumnas[i];
            if (catKey.equalsIgnoreCase(categoria)) {
                columnas = (String[]) mapeoColumnas[i + 1];
                break;
            }
        }
        if (columnas == null) {
            for (int i = 0; i < mapeoColumnas.length; i += 2) {
                if ("default".equalsIgnoreCase((String) mapeoColumnas[i])) {
                    columnas = (String[]) mapeoColumnas[i + 1];
                    break;
                }
            }
        }
        if (columnas == null || columnas.length == 0) {
            return "";
        }

        List<String> condicionesPorToken = new ArrayList<>();
        for (String token : tokens) {
            String patron = "%" + escaparPatronLike(token) + "%";
            List<String> condicionesPorColumna = new ArrayList<>();
            for (String col : columnas) {
                condicionesPorColumna.add("NORMALIZAR(COALESCE(CAST(" + col + " AS TEXT), '')) LIKE ? ESCAPE '\\'");
                parametros.add(patron);
            }
            condicionesPorToken.add("(" + String.join(" OR ", condicionesPorColumna) + ")");
        }

        return "(" + String.join(" AND ", condicionesPorToken) + ")";
    }

    private boolean esCategoriaLibro(String categoria) {
        return Set.of("todo", "libros", "autor", "titulo", "genero", "isbn", "ubicacion", "estado", "edicion", "anio_edicion",
                "libros_disponibles", "libros_agotados", "libros_digitales", "libros_fisicos").contains(categoria);
    }

    private boolean esCategoriaUsuario(String categoria) {
        return Set.of("todo", "usuarios", "cedula", "identificacion", "nombre_usuario", "email", "telefono").contains(categoria);
    }

    private boolean esCategoriaPrestamo(String categoria) {
        return Set.of("todo", "prestamos", "prestamos_activos", "prestamos_vencidos", "prestamos_devueltos").contains(categoria);
    }

    private String escaparPatronLike(String termino) {
        return termino.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
