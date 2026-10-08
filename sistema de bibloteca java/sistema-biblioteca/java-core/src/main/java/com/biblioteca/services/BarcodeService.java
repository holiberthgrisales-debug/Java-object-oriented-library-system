package com.biblioteca.services;

import com.biblioteca.config.DatabaseConnection;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

// servicio para resolver codigos de barra, validar isbn y armar etiquetas
public class BarcodeService {

    // limpia el texto del codigo quitando espacios y guiones
    public String limpiarCodigo(String codigo) {
        if (codigo == null) return "";
        return codigo.trim().replace("-", "").replace(" ", "").toUpperCase();
    }

    // valida matematicamente si el isbn-10 o isbn-13 tiene un digito de control correcto
    public boolean validarChecksumIsbn(String isbn) {
        String clean = limpiarCodigo(isbn);
        if (clean.length() == 10) {
            // calculo para isbn de 10 digitos (modulo 11)
            int suma = 0;
            for (int i = 0; i < 9; i++) {
                char c = clean.charAt(i);
                if (!Character.isDigit(c)) return false;
                suma += (c - '0') * (10 - i);
            }
            char ultimo = clean.charAt(9);
            if (ultimo == 'X') {
                suma += 10;
            } else if (Character.isDigit(ultimo)) {
                suma += (ultimo - '0');
            } else {
                return false;
            }
            return suma % 11 == 0;
        } else if (clean.length() == 13) {
            // calculo para isbn de 13 digitos (modulo 10)
            if (!clean.startsWith("978") && !clean.startsWith("979")) return false;
            int suma = 0;
            for (int i = 0; i < 12; i++) {
                char c = clean.charAt(i);
                if (!Character.isDigit(c)) return false;
                int digito = c - '0';
                suma += (i % 2 == 0) ? digito : digito * 3;
            }
            char ultimo = clean.charAt(12);
            if (!Character.isDigit(ultimo)) return false;
            int digitoControl = (10 - (suma % 10)) % 10;
            return digitoControl == (ultimo - '0');
        }
        return false;
    }

    // busca en la base de datos a que libro o socio corresponde el codigo escaneado
    public Map<String, Object> resolverCodigo(String rawCodigo) {
        Map<String, Object> respuesta = new HashMap<>();
        if (rawCodigo == null || rawCodigo.trim().isEmpty()) {
            respuesta.put("encontrado", false);
            respuesta.put("mensaje", "codigo vacio");
            return respuesta;
        }

        String codigo = rawCodigo.trim();

        // 1. si empieza por soc o usr buscamos al socio
        if (codigo.startsWith("SOC") || codigo.startsWith("USR-")) {
            String numStr = codigo.replaceAll("\\D", "");
            if (!numStr.isEmpty()) {
                try {
                    int id = Integer.parseInt(numStr);
                    Map<String, Object> socio = buscarUsuarioPorId(id);
                    if (socio != null) {
                        respuesta.put("encontrado", true);
                        respuesta.put("tipo", "USUARIO");
                        respuesta.put("datos", socio);
                        return respuesta;
                    }
                } catch (NumberFormatException ignored) {}
            }
        }

        // 2. si empieza por lib buscamos al libro
        if (codigo.startsWith("LIB") || codigo.startsWith("LIB-")) {
            String numStr = codigo.replaceAll("\\D", "");
            if (!numStr.isEmpty()) {
                try {
                    int id = Integer.parseInt(numStr);
                    Map<String, Object> libro = buscarLibroPorId(id);
                    if (libro != null) {
                        respuesta.put("encontrado", true);
                        respuesta.put("tipo", "LIBRO");
                        respuesta.put("datos", libro);
                        return respuesta;
                    }
                } catch (NumberFormatException ignored) {}
            }
        }

        // 3. busca coincidencia exacta por isbn
        Map<String, Object> libroPorIsbn = buscarLibroPorIsbn(codigo);
        if (libroPorIsbn != null) {
            respuesta.put("encontrado", true);
            respuesta.put("tipo", "LIBRO");
            respuesta.put("datos", libroPorIsbn);
            return respuesta;
        }

        // 4. busca coincidencia exacta por cedula o identificacion
        Map<String, Object> usuarioPorDoc = buscarUsuarioPorIdentificacion(codigo);
        if (usuarioPorDoc != null) {
            respuesta.put("encontrado", true);
            respuesta.put("tipo", "USUARIO");
            respuesta.put("datos", usuarioPorDoc);
            return respuesta;
        }

        // 5. si es un numero solo, intenta buscar por id de libro o socio
        if (codigo.matches("^\\d+$")) {
            try {
                int id = Integer.parseInt(codigo);
                Map<String, Object> libro = buscarLibroPorId(id);
                Map<String, Object> socio = buscarUsuarioPorId(id);

                if (libro != null && socio != null) {
                    respuesta.put("encontrado", true);
                    respuesta.put("tipo", "AMBIGUO");
                    respuesta.put("mensaje", "El código coincide tanto con un Libro como con un Socio.");
                    respuesta.put("libro", libro);
                    respuesta.put("usuario", socio);
                    return respuesta;
                }
                if (libro != null) {
                    respuesta.put("encontrado", true);
                    respuesta.put("tipo", "LIBRO");
                    respuesta.put("datos", libro);
                    return respuesta;
                }
                if (socio != null) {
                    respuesta.put("encontrado", true);
                    respuesta.put("tipo", "USUARIO");
                    respuesta.put("datos", socio);
                    return respuesta;
                }
            } catch (NumberFormatException ignored) {}
        }

        respuesta.put("encontrado", false);
        respuesta.put("codigoEscaneado", codigo);
        return respuesta;
    }

    // consulta un libro por su id en la base de datos
    public Map<String, Object> buscarLibroPorId(int id) {
        String sql = "SELECT id, titulo, autor, isbn, cantidad_disponible, ubicacion, genero, estado FROM libros WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, id);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return mapearLibro(rs);
                }
            }
        } catch (SQLException e) {
            System.err.println("error buscando libro por id: " + e.getMessage());
        }
        return null;
    }

    // consulta un libro por su codigo isbn
    public Map<String, Object> buscarLibroPorIsbn(String isbn) {
        String clean = limpiarCodigo(isbn);
        String sql = "SELECT id, titulo, autor, isbn, cantidad_disponible, ubicacion, genero, estado FROM libros WHERE UPPER(replace(replace(isbn, '-', ''), ' ', '')) = UPPER(?) LIMIT 1";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, clean);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return mapearLibro(rs);
                }
            }
        } catch (SQLException e) {
            System.err.println("error buscando libro por isbn: " + e.getMessage());
        }
        return null;
    }

    // consulta un usuario por su id
    public Map<String, Object> buscarUsuarioPorId(int id) {
        String sql = "SELECT id, identificacion, nombre, email, telefono FROM usuarios WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, id);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return mapearUsuario(rs);
                }
            }
        } catch (SQLException e) {
            System.err.println("error buscando usuario por id: " + e.getMessage());
        }
        return null;
    }

    // consulta un usuario por su numero de documento o identificacion
    public Map<String, Object> buscarUsuarioPorIdentificacion(String identificacion) {
        String clean = identificacion.trim();
        String sql = "SELECT id, identificacion, nombre, email, telefono FROM usuarios WHERE UPPER(replace(replace(identificacion, '-', ''), ' ', '')) = UPPER(?) LIMIT 1";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, clean);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return mapearUsuario(rs);
                }
            }
        } catch (SQLException e) {
            System.err.println("error buscando usuario por identificacion: " + e.getMessage());
        }
        return null;
    }

    // prepara los datos para la etiqueta del libro con codigo formateado
    public Map<String, Object> obtenerDatosEtiquetaLibro(int libroId) {
        Map<String, Object> libro = buscarLibroPorId(libroId);
        if (libro == null) return null;

        String isbn = (String) libro.get("isbn");
        String barcode = (isbn != null && isbn.trim().length() >= 3)
                ? limpiarCodigo(isbn)
                : String.format("LIB%06d", libroId);

        Map<String, Object> etiqueta = new HashMap<>(libro);
        etiqueta.put("barcodeValor", barcode);
        etiqueta.put("qrPayload", Map.of(
                "tipo", "LIBRO",
                "id", libroId,
                "titulo", libro.get("titulo"),
                "isbn", isbn != null ? isbn : ""
        ));
        return etiqueta;
    }

    // prepara los datos para el carnet de socio con codigo formateado
    public Map<String, Object> obtenerDatosCarnetSocio(int usuarioId) {
        Map<String, Object> usuario = buscarUsuarioPorId(usuarioId);
        if (usuario == null) return null;

        String doc = (String) usuario.get("identificacion");
        String barcode = (doc != null && doc.trim().length() >= 3)
                ? limpiarCodigo(doc)
                : String.format("SOC%06d", usuarioId);

        Map<String, Object> carnet = new HashMap<>(usuario);
        carnet.put("barcodeValor", barcode);
        carnet.put("carnetId", String.format("SOC-%05d", usuarioId));
        carnet.put("qrPayload", Map.of(
                "tipo", "USUARIO",
                "id", usuarioId,
                "doc", doc != null ? doc : "",
                "nombre", usuario.get("nombre")
        ));
        return carnet;
    }

    // pasa los datos del resultset a un mapa de libro
    private Map<String, Object> mapearLibro(ResultSet rs) throws SQLException {
        Map<String, Object> map = new HashMap<>();
        map.put("id", rs.getInt("id"));
        map.put("titulo", rs.getString("titulo"));
        map.put("autor", rs.getString("autor"));
        map.put("isbn", rs.getString("isbn"));
        map.put("cantidadDisponible", rs.getInt("cantidad_disponible"));
        map.put("ubicacion", rs.getString("ubicacion"));
        map.put("genero", rs.getString("genero"));
        map.put("estado", rs.getString("estado"));
        return map;
    }

    // pasa los datos del resultset a un mapa de usuario
    private Map<String, Object> mapearUsuario(ResultSet rs) throws SQLException {
        Map<String, Object> map = new HashMap<>();
        map.put("id", rs.getInt("id"));
        map.put("identificacion", rs.getString("identificacion"));
        map.put("nombre", rs.getString("nombre"));
        map.put("email", rs.getString("email"));
        map.put("telefono", rs.getString("telefono"));
        return map;
    }
}
