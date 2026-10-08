package com.biblioteca.config;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.text.Normalizer;
import java.util.Locale;

public class DatabaseConnection {
    public static String normalizar(String text) {
        if (text == null)
            return "";
        String normalized = Normalizer.normalize(text, Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{M}", "") // separa caracteres y elimina espacios
                .toLowerCase(Locale.ROOT)
                .trim();
    }

    private static String resolvedDbUrl = null;

    public static synchronized void setDbPath(String path) {
        if (path == null) {
            resolvedDbUrl = null;
        } else {
            java.io.File file = new java.io.File(path);
            if (file.getParentFile() != null && !file.getParentFile().exists()) {
                file.getParentFile().mkdirs();
            }
            resolvedDbUrl = "jdbc:sqlite:" + file.getAbsolutePath();
        }
    }

    // conexion con sqlite
    private static synchronized String getDbUrl() {
        if (resolvedDbUrl != null) {
            return resolvedDbUrl;
        }

        // 1. revisar propiedad del sistema o variable de entorno
        String customPath = System.getProperty("biblioteca.db.path");
        if (customPath == null || customPath.trim().isEmpty()) {
            customPath = System.getenv("BIBLIOTECA_DB_PATH");
        }
        if (customPath != null && !customPath.trim().isEmpty()) {
            java.io.File customFile = new java.io.File(customPath.trim());
            if (customFile.getParentFile() != null && !customFile.getParentFile().exists()) {
                customFile.getParentFile().mkdirs();
            }
            resolvedDbUrl = "jdbc:sqlite:" + customFile.getAbsolutePath();
            return resolvedDbUrl;
        }

        String[] relativePaths = {
                "../database/biblioteca.db",
                "database/biblioteca.db",
                "sistema-biblioteca/database/biblioteca.db"
        };

        for (String path : relativePaths) {
            java.io.File file = new java.io.File(path);
            if (file.exists()) {
                resolvedDbUrl = "jdbc:sqlite:" + file.getAbsolutePath();
                return resolvedDbUrl;
            }
        }

        // por defecto, crea o usa la base de datos en la carpeta database relativa al directorio
        java.io.File fallback = new java.io.File("../database/biblioteca.db");
        if (fallback.getParentFile() != null && !fallback.getParentFile().exists()) {
            fallback.getParentFile().mkdirs();
        }
        resolvedDbUrl = "jdbc:sqlite:" + fallback.getAbsolutePath();
        return resolvedDbUrl;
    }

    public static Connection getConnection() throws SQLException {
        Connection connection = DriverManager.getConnection(getDbUrl());
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys = ON");
            statement.execute("PRAGMA busy_timeout = 10000");
            statement.execute("PRAGMA journal_mode = WAL");
            statement.execute("PRAGMA synchronous = NORMAL");
        }

        // funciones para buscar sin tildes
        try {
            org.sqlite.Function.create(connection, "NORMALIZAR", new org.sqlite.Function() {
                @Override
                protected void xFunc() throws SQLException {
                    if (args() == 0 || value_text(0) == null) {
                        result((String) null);
                        return;
                    }
                    result(normalizar(value_text(0)));
                }
            });
            org.sqlite.Function.create(connection, "UNACCENT", new org.sqlite.Function() {
                @Override
                protected void xFunc() throws SQLException {
                    if (args() == 0 || value_text(0) == null) {
                        result((String) null);
                        return;
                    }
                    result(normalizar(value_text(0)));
                }
            });
        } catch (Exception ignored) {
        }

        return connection;
    }

    public static void inicializarBaseDeDatos() {
        try (Connection conn = getConnection();
                Statement stmt = conn.createStatement()) {

            // crea las tablas si no existen
            stmt.executeUpdate(
                    "CREATE TABLE IF NOT EXISTS libros (" +
                            "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
                            "  titulo TEXT NOT NULL," +
                            "  autor TEXT NOT NULL," +
                            "  isbn TEXT," +
                            "  anio_publicacion INTEGER," +
                            "  genero TEXT," +
                            "  cantidad_disponible INTEGER DEFAULT 1," +
                            "  ubicacion TEXT," +
                            "  url_descarga TEXT," +
                            "  estado TEXT DEFAULT 'Disponible'," +
                            "  anio_edicion INTEGER," +
                            "  edicion TEXT" +
                            ")");

            stmt.executeUpdate(
                    "CREATE TABLE IF NOT EXISTS usuarios (" +
                            "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
                            "  identificacion TEXT," +
                            "  nombre TEXT NOT NULL," +
                            "  email TEXT," +
                            "  telefono TEXT" +
                            ")");

            stmt.executeUpdate(
                    "CREATE TABLE IF NOT EXISTS prestamos (" +
                            "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
                            "  usuario_id INTEGER NOT NULL," +
                            "  libro_id INTEGER NOT NULL," +
                            "  fecha_prestamo TEXT," +
                            "  fecha_devolucion TEXT," +
                            "  devuelto INTEGER DEFAULT 0," +
                            "  precio REAL DEFAULT 0.0," +
                            "  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)," +
                            "  FOREIGN KEY (libro_id) REFERENCES libros(id)" +
                            ")");

            stmt.executeUpdate(
                    "CREATE TABLE IF NOT EXISTS auditoria (" +
                            "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
                            "  entidad TEXT NOT NULL," +
                            "  entidad_id INTEGER," +
                            "  accion TEXT NOT NULL," +
                            "  usuario_responsable TEXT DEFAULT 'Sistema / Administrador'," +
                            "  detalles TEXT," +
                            "  fecha_registro TEXT NOT NULL" +
                            ")");

            // agrega columnas si no estaban creadas
            try {
                stmt.executeUpdate("ALTER TABLE prestamos ADD COLUMN precio REAL DEFAULT 0.0");
            } catch (SQLException ignored) {
            }

            try {
                stmt.executeUpdate("ALTER TABLE libros ADD COLUMN estado TEXT DEFAULT 'Disponible'");
            } catch (SQLException ignored) {
            }

            try {
                stmt.executeUpdate("ALTER TABLE libros ADD COLUMN anio_edicion INTEGER");
            } catch (SQLException ignored) {
            }

            try {
                stmt.executeUpdate("ALTER TABLE libros ADD COLUMN edicion TEXT");
            } catch (SQLException ignored) {
            }

            // indices para que las consultas sean rapidas
            stmt.executeUpdate("CREATE INDEX IF NOT EXISTS idx_libros_titulo ON libros(titulo)");
            stmt.executeUpdate("CREATE INDEX IF NOT EXISTS idx_libros_autor ON libros(autor)");
            stmt.executeUpdate("CREATE INDEX IF NOT EXISTS idx_libros_estado ON libros(estado)");
            stmt.executeUpdate("CREATE INDEX IF NOT EXISTS idx_usuarios_nombre ON usuarios(nombre)");
            stmt.executeUpdate("CREATE INDEX IF NOT EXISTS idx_usuarios_identificacion ON usuarios(identificacion)");
            stmt.executeUpdate(
                    "CREATE INDEX IF NOT EXISTS idx_prestamos_estado ON prestamos(devuelto, fecha_devolucion)");
            stmt.executeUpdate("CREATE INDEX IF NOT EXISTS idx_prestamos_usuario ON prestamos(usuario_id)");
            stmt.executeUpdate("CREATE INDEX IF NOT EXISTS idx_prestamos_libro ON prestamos(libro_id)");
            stmt.executeUpdate("CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON auditoria(entidad)");
            stmt.executeUpdate("CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(fecha_registro)");

            // indices unicos condicionales para evitar duplicados
            try {
                stmt.executeUpdate("CREATE UNIQUE INDEX IF NOT EXISTS idx_libros_isbn_unique ON libros(isbn) WHERE isbn IS NOT NULL AND trim(isbn) != ''");
            } catch (SQLException e) {
                System.out.println("Aviso: No se pudo crear índice único para ISBN: " + e.getMessage());
            }

            try {
                stmt.executeUpdate("CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_identificacion_unique ON usuarios(identificacion) WHERE identificacion IS NOT NULL AND trim(identificacion) != ''");
            } catch (SQLException e) {
                System.out.println("Aviso: No se pudo crear índice único para Identificación: " + e.getMessage());
            }

            System.out.println("conexión a la base de datos establecida con éxito.");
        } catch (SQLException e) {
            System.err.println("error al conectar a la bd: " + e.getMessage());
            throw new RuntimeException("Error crítico al inicializar la base de datos: " + e.getMessage(), e);
        }
    }
}
