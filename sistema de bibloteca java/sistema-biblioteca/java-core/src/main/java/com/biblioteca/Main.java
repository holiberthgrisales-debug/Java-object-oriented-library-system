package com.biblioteca;

import io.javalin.Javalin;
import io.javalin.json.JavalinJackson;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.javalin.http.staticfiles.Location;
import java.io.File;
import com.biblioteca.config.DatabaseConnection;
import com.biblioteca.config.OpenApiDocGenerator;
import com.biblioteca.models.Libro;
import com.biblioteca.models.PaginatedResponse;
import com.biblioteca.models.Prestamo;
import com.biblioteca.models.Usuario;
import com.biblioteca.services.AuditoriaService;
import com.biblioteca.services.BarcodeService;
import com.biblioteca.services.BusquedaService;
import com.biblioteca.services.LibroService;
import com.biblioteca.services.PrestamoService;
import com.biblioteca.services.UsuarioService;

public class Main {
    public static void main(String[] args) {
        // inicia la base de datos
        try {
            DatabaseConnection.inicializarBaseDeDatos();
        } catch (Exception e) {
            System.err.println("FATAL: Error al inicializar la base de datos: " + e.getMessage());
            System.exit(1);
        }

        // servicios del sistema
        AuditoriaService auditoriaService = new AuditoriaService();
        UsuarioService usuarioService = new UsuarioService(auditoriaService);
        LibroService libroService = new LibroService(auditoriaService);
        PrestamoService prestamoService = new PrestamoService(auditoriaService);
        BusquedaService busquedaService = new BusquedaService();
        BarcodeService barcodeService = new BarcodeService();

        // resolucion de la ruta del frontend compilado (vite dist)
        String rutaFrontend = resolverRutaFrontend();

        // configuracion del servidor javalin
        Javalin app = Javalin.create(configuracion -> {
            configuracion.jsonMapper(new JavalinJackson().updateMapper(mapper -> {
                mapper.registerModule(new JavaTimeModule());
                mapper.disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
                mapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES,
                        false);
            }));
            configuracion.bundledPlugins.enableCors(cors -> {
                cors.addRule(rule -> {
                    rule.anyHost();
                });
            });

            // servir archivos estaticos del frontend si la carpeta dist existe (fallback
            // estatico general)
            if (rutaFrontend != null) {
                configuracion.staticFiles.add(staticFiles -> {
                    staticFiles.hostedPath = "/";
                    staticFiles.directory = rutaFrontend;
                    staticFiles.location = Location.EXTERNAL;
                    staticFiles.precompress = false;
                });
                configuracion.spaRoot.addFile("/", rutaFrontend + File.separator + "index.html", Location.EXTERNAL);
            }
        });

        // manejadores globales de excepciones para resiliencia y evitar 500s
        // innecesarios
        app.exception(IllegalArgumentException.class, (e, ctx) -> {
            ctx.status(400).result(e.getMessage() != null ? e.getMessage() : "Parámetro inválido");
        });
        app.exception(IllegalStateException.class, (e, ctx) -> {
            ctx.status(409).result(e.getMessage() != null ? e.getMessage() : "Conflicto de estado");
        });
        app.exception(com.fasterxml.jackson.core.JacksonException.class, (e, ctx) -> {
            ctx.status(400).result("JSON inválido o estructura incorrecta: " + e.getOriginalMessage());
        });
        app.exception(io.javalin.http.BadRequestResponse.class, (e, ctx) -> {
            ctx.status(400).result(e.getMessage());
        });

        // control estricto de cache para html y logging de advertencias
        app.after(ctx -> {
            String path = ctx.path();
            if (path.equals("/") || path.endsWith(".html")) {
                ctx.header("Cache-Control", "no-cache, no-store, must-revalidate");
                ctx.header("Pragma", "no-cache");
                ctx.header("Expires", "0");
            }
            if (ctx.status().getCode() >= 400) {
                System.err.println("⚠️ [HTTP " + ctx.status().getCode() + "] " + ctx.method() + " " + ctx.path() + " - "
                        + ctx.result());
            }
        });

        // filtro opcional de seguridad con api key
        final String apiKeyConfig = System.getenv("BIBLIOTECA_API_KEY");
        if (apiKeyConfig != null && !apiKeyConfig.trim().isEmpty()) {
            app.before(ctx -> {
                String path = ctx.path();
                if (path.startsWith("/swagger") || path.equals("/openapi.json")
                        || ctx.method().name().equalsIgnoreCase("OPTIONS")) {
                    return;
                }
                String authHeader = ctx.header("Authorization");
                String customKeyHeader = ctx.header("X-API-Key");
                boolean validBearer = authHeader != null
                        && authHeader.equalsIgnoreCase("Bearer " + apiKeyConfig.trim());
                boolean validCustom = customKeyHeader != null && customKeyHeader.equals(apiKeyConfig.trim());
                if (!validBearer && !validCustom) {
                    ctx.status(401).result("No autorizado: API Key inválida o no provista");
                }
            });
        }

        // rutas para la documentacion de swagger
        app.get("/openapi.json", solicitud -> {
            solicitud.contentType("application/json; charset=utf-8")
                    .result(OpenApiDocGenerator.getOpenApiJson());
        });

        app.get("/swagger-ui", solicitud -> {
            solicitud.contentType("text/html; charset=utf-8")
                    .result(OpenApiDocGenerator.getSwaggerUiHtml());
        });

        app.get("/swagger", solicitud -> {
            solicitud.redirect("/swagger-ui");
        });

        // rutas de usuarios
        app.get("/usuarios", solicitud -> {
            try {
                String pageParam = solicitud.queryParam("page");
                String limitParam = solicitud.queryParam("limit");
                String sortBy = solicitud.queryParam("sortBy");
                String sortOrder = solicitud.queryParam("sortOrder");
                String busqueda = solicitud.queryParam("busqueda");

                if (pageParam != null) {
                    int page = Integer.parseInt(pageParam);
                    int limit = limitParam != null ? Integer.parseInt(limitParam) : 25;
                    PaginatedResponse<Usuario> paginated = usuarioService.obtenerPaginado(page, limit, sortBy,
                            sortOrder, busqueda);
                    solicitud.header("X-Total-Count", String.valueOf(paginated.getTotal()));
                    solicitud.header("X-Page", String.valueOf(paginated.getPage()));
                    solicitud.header("X-Total-Pages", String.valueOf(paginated.getTotalPages()));
                    solicitud.json(paginated);
                } else if (busqueda != null && !busqueda.trim().isEmpty()) {
                    solicitud.json(usuarioService.buscar(busqueda));
                } else {
                    solicitud.json(usuarioService.obtenerTodos());
                }
            } catch (NumberFormatException e) {
                solicitud.status(400).result("los parámetros 'page' y 'limit' deben ser numéricos.");
            } catch (Exception e) {
                solicitud.status(500).result(e.getMessage());
            }
        });

        app.get("/usuarios/{id}", solicitud -> {
            try {
                int id = Integer.parseInt(solicitud.pathParam("id"));
                Usuario usuario = usuarioService.obtenerPorId(id);
                if (usuario != null) {
                    solicitud.json(usuario);
                } else {
                    solicitud.status(404).result("usuario no encontrado");
                }
            } catch (NumberFormatException e) {
                solicitud.status(400).result("el id debe ser numérico");
            } catch (Exception e) {
                solicitud.status(500).result(e.getMessage());
            }
        });

        app.post("/usuarios", solicitud -> {
            try {
                Usuario nuevo = solicitud.bodyAsClass(Usuario.class);
                usuarioService.agregar(nuevo);
                solicitud.status(201).json(nuevo);
            } catch (IllegalArgumentException e) {
                solicitud.status(400).result(e.getMessage());
            } catch (Exception e) {
                if (e.getCause() instanceof IllegalArgumentException) {
                    solicitud.status(400).result(e.getCause().getMessage());
                } else {
                    solicitud.status(400).result("Error en datos de usuario: "
                            + (e.getMessage() != null ? e.getMessage() : "formato inválido"));
                }
            }
        });

        app.put("/usuarios/{id}", solicitud -> {
            try {
                int id = Integer.parseInt(solicitud.pathParam("id"));
                Usuario usuario = solicitud.bodyAsClass(Usuario.class);
                usuario.setId(id);
                usuarioService.actualizar(usuario);
                solicitud.status(200).json(usuario);
            } catch (NumberFormatException e) {
                solicitud.status(400).result("el id debe ser numérico");
            } catch (IllegalArgumentException e) {
                if (e.getMessage() != null && e.getMessage().toLowerCase().contains("no encontrado")) {
                    solicitud.status(404).result(e.getMessage());
                } else {
                    solicitud.status(400).result(e.getMessage());
                }
            } catch (Exception e) {
                e.printStackTrace();
                solicitud.status(500).result(e.getMessage());
            }
        });

        app.delete("/usuarios/{id}", solicitud -> {
            try {
                int id = Integer.parseInt(solicitud.pathParam("id"));
                if (prestamoService.usuarioPrestamosActivos(id)) {
                    solicitud.status(400)
                            .result("no se puede eliminar: el usuario tiene préstamos activos sin devolver.");
                    return;
                }
                usuarioService.eliminar(id);
                solicitud.status(200).result("usuario eliminado exitosamente");
            } catch (NumberFormatException e) {
                solicitud.status(400).result("el id debe ser numérico");
            } catch (IllegalStateException e) {
                solicitud.status(400).result(e.getMessage());
            } catch (IllegalArgumentException e) {
                solicitud.status(404).result(e.getMessage());
            } catch (Exception e) {
                e.printStackTrace();
                solicitud.status(500).result(e.getMessage());
            }
        });

        // rutas de libros
        app.get("/libros", solicitud -> {
            try {
                String pageParam = solicitud.queryParam("page");
                String limitParam = solicitud.queryParam("limit");
                String sortBy = solicitud.queryParam("sortBy");
                String sortOrder = solicitud.queryParam("sortOrder");

                String busqueda = solicitud.queryParam("q");
                String genero = solicitud.queryParam("genero");
                String disponibleParam = solicitud.queryParam("disponible");
                String anioParam = solicitud.queryParam("anio");

                Boolean soloDisponibles = null;
                if (disponibleParam != null) {
                    soloDisponibles = Boolean.parseBoolean(disponibleParam);
                }

                Integer anio = null;
                if (anioParam != null && !anioParam.trim().isEmpty()) {
                    try {
                        anio = Integer.parseInt(anioParam);
                    } catch (NumberFormatException ignored) {
                    }
                }

                if (pageParam != null) {
                    int page = Integer.parseInt(pageParam);
                    int limit = limitParam != null ? Integer.parseInt(limitParam) : 25;
                    PaginatedResponse<Libro> paginated = libroService.obtenerPaginado(
                            page, limit, sortBy, sortOrder, busqueda, genero, soloDisponibles, anio);
                    solicitud.header("X-Total-Count", String.valueOf(paginated.getTotal()));
                    solicitud.header("X-Page", String.valueOf(paginated.getPage()));
                    solicitud.header("X-Total-Pages", String.valueOf(paginated.getTotalPages()));
                    solicitud.json(paginated);
                    return;
                }

                if (busqueda != null && !busqueda.trim().isEmpty()) {
                    solicitud.json(libroService.buscar(busqueda));
                    return;
                }

                if (genero != null || soloDisponibles != null || anio != null) {
                    solicitud.json(libroService.filtrar(genero, soloDisponibles, anio));
                } else {
                    solicitud.json(libroService.obtenerTodos());
                }
            } catch (NumberFormatException e) {
                solicitud.status(400).result("los parámetros de paginación deben ser numéricos.");
            } catch (Exception e) {
                e.printStackTrace();
                solicitud.status(500).result(e.getMessage());
            }
        });

        app.get("/libros/{id}", solicitud -> {
            try {
                int id = Integer.parseInt(solicitud.pathParam("id"));
                Libro libro = libroService.obtenerPorId(id);
                if (libro != null) {
                    solicitud.json(libro);
                } else {
                    solicitud.status(404).result("libro no encontrado");
                }
            } catch (NumberFormatException e) {
                solicitud.status(400).result("el id debe ser numérico");
            } catch (Exception e) {
                e.printStackTrace();
                solicitud.status(500).result(e.getMessage());
            }
        });

        app.post("/libros", solicitud -> {
            try {
                Libro nuevo = solicitud.bodyAsClass(Libro.class);
                libroService.agregar(nuevo);
                solicitud.status(201).json(nuevo);
            } catch (IllegalArgumentException e) {
                solicitud.status(400).result(e.getMessage());
            } catch (Exception e) {
                if (e.getCause() instanceof IllegalArgumentException) {
                    solicitud.status(400).result(e.getCause().getMessage());
                } else {
                    solicitud.status(400).result("Error en datos de libro: "
                            + (e.getMessage() != null ? e.getMessage() : "formato inválido"));
                }
            }
        });

        app.put("/libros/{id}", solicitud -> {
            try {
                int id = Integer.parseInt(solicitud.pathParam("id"));
                Libro libro = solicitud.bodyAsClass(Libro.class);
                libro.setId(id);
                libroService.actualizar(libro);
                solicitud.status(200).json(libro);
            } catch (NumberFormatException e) {
                solicitud.status(400).result("el id debe ser numérico");
            } catch (IllegalArgumentException e) {
                if (e.getMessage() != null && e.getMessage().toLowerCase().contains("no encontrado")) {
                    solicitud.status(404).result(e.getMessage());
                } else {
                    solicitud.status(400).result(e.getMessage());
                }
            } catch (Exception e) {
                e.printStackTrace();
                solicitud.status(500).result(e.getMessage());
            }
        });

        app.delete("/libros/{id}", solicitud -> {
            try {
                int id = Integer.parseInt(solicitud.pathParam("id"));
                if (prestamoService.libroPrestamosActivos(id)) {
                    solicitud.status(400)
                            .result("no se puede eliminar: el libro tiene préstamos activos sin devolver.");
                    return;
                }
                libroService.eliminar(id);
                solicitud.status(200).result("libro eliminado exitosamente");
            } catch (NumberFormatException e) {
                solicitud.status(400).result("el id debe ser numérico");
            } catch (IllegalStateException e) {
                solicitud.status(400).result(e.getMessage());
            } catch (IllegalArgumentException e) {
                solicitud.status(404).result(e.getMessage());
            } catch (Exception e) {
                e.printStackTrace();
                solicitud.status(500).result(e.getMessage());
            }
        });

        // rutas de prestamos
        app.get("/prestamos", solicitud -> {
            try {
                String pageParam = solicitud.queryParam("page");
                String limitParam = solicitud.queryParam("limit");
                String sortBy = solicitud.queryParam("sortBy");
                String sortOrder = solicitud.queryParam("sortOrder");
                String estado = solicitud.queryParam("estado");

                if (pageParam != null) {
                    int page = Integer.parseInt(pageParam);
                    int limit = limitParam != null ? Integer.parseInt(limitParam) : 25;
                    PaginatedResponse<Prestamo> paginated = prestamoService.obtenerPaginado(page, limit, sortBy,
                            sortOrder, estado);
                    solicitud.header("X-Total-Count", String.valueOf(paginated.getTotal()));
                    solicitud.header("X-Page", String.valueOf(paginated.getPage()));
                    solicitud.header("X-Total-Pages", String.valueOf(paginated.getTotalPages()));
                    solicitud.json(paginated);
                } else {
                    solicitud.json(prestamoService.obtenerTodos());
                }
            } catch (NumberFormatException e) {
                solicitud.status(400).result("los parámetros 'page' y 'limit' deben ser numéricos.");
            } catch (Exception e) {
                solicitud.status(500).result(e.getMessage());
            }
        });

        app.get("/prestamos/vencidos", solicitud -> {
            solicitud.json(prestamoService.obtenerVencidos());
        });

        app.get("/prestamos/{id}", solicitud -> {
            try {
                int id = Integer.parseInt(solicitud.pathParam("id"));
                Prestamo prestamo = prestamoService.obtenerPorId(id);
                if (prestamo != null) {
                    solicitud.json(prestamo);
                } else {
                    solicitud.status(404).result("préstamo no encontrado");
                }
            } catch (NumberFormatException e) {
                solicitud.status(400).result("el id debe ser numérico");
            } catch (Exception e) {
                solicitud.status(500).result(e.getMessage());
            }
        });

        app.post("/prestamos", solicitud -> {
            try {
                Prestamo nuevo = solicitud.bodyAsClass(Prestamo.class);
                prestamoService.agregar(nuevo);
                solicitud.status(201).json(nuevo);
            } catch (IllegalStateException e) {
                solicitud.status(409).result(e.getMessage());
            } catch (IllegalArgumentException e) {
                solicitud.status(400).result(e.getMessage());
            } catch (Exception e) {
                if (e.getCause() instanceof IllegalArgumentException || e.getCause() instanceof IllegalStateException) {
                    solicitud.status(400).result(e.getCause().getMessage());
                } else {
                    solicitud.status(400).result("Error en datos de préstamo: "
                            + (e.getMessage() != null ? e.getMessage() : "formato inválido"));
                }
            }
        });

        app.put("/prestamos/{id}/devolver", solicitud -> {
            try {
                int id = Integer.parseInt(solicitud.pathParam("id"));
                prestamoService.devolverLibro(id);
                solicitud.status(200).result("préstamo devuelto exitosamente");
            } catch (IllegalArgumentException e) {
                solicitud.status(404).result(e.getMessage());
            } catch (IllegalStateException e) {
                solicitud.status(400).result(e.getMessage());
            } catch (Exception e) {
                solicitud.status(500).result(e.getMessage());
            }
        });

        app.put("/prestamos/{id}", solicitud -> {
            try {
                int id = Integer.parseInt(solicitud.pathParam("id"));
                Prestamo prestamo = solicitud.bodyAsClass(Prestamo.class);
                prestamo.setId(id);
                prestamoService.actualizar(prestamo);
                solicitud.status(200).json(prestamo);
            } catch (IllegalStateException | IllegalArgumentException e) {
                solicitud.status(400).result(e.getMessage());
            } catch (Exception e) {
                e.printStackTrace();
                solicitud.status(500).result(e.getMessage());
            }
        });

        app.delete("/prestamos/{id}", solicitud -> {
            try {
                int id = Integer.parseInt(solicitud.pathParam("id"));
                prestamoService.eliminar(id);
                solicitud.status(200).result("préstamo eliminado exitosamente");
            } catch (NumberFormatException e) {
                solicitud.status(400).result("el id debe ser numérico");
            } catch (IllegalArgumentException e) {
                solicitud.status(404).result(e.getMessage());
            } catch (Exception e) {
                e.printStackTrace();
                solicitud.status(500).result(e.getMessage());
            }
        });

        // rutas de auditoria
        app.get("/auditoria", solicitud -> {
            try {
                String pageParam = solicitud.queryParam("page");
                String limitParam = solicitud.queryParam("limit");
                String entidad = solicitud.queryParam("entidad");
                String accion = solicitud.queryParam("accion");
                String sortBy = solicitud.queryParam("sortBy");
                String sortOrder = solicitud.queryParam("sortOrder");

                if (pageParam != null) {
                    int page = Integer.parseInt(pageParam);
                    int limit = limitParam != null ? Integer.parseInt(limitParam) : 25;
                    PaginatedResponse<?> paginated = auditoriaService.obtenerPaginado(page, limit, entidad, accion,
                            sortBy, sortOrder);
                    solicitud.header("X-Total-Count", String.valueOf(paginated.getTotal()));
                    solicitud.header("X-Page", String.valueOf(paginated.getPage()));
                    solicitud.header("X-Total-Pages", String.valueOf(paginated.getTotalPages()));
                    solicitud.json(paginated);
                } else {
                    solicitud.json(auditoriaService.obtenerTodos());
                }
            } catch (NumberFormatException e) {
                solicitud.status(400).result("los parámetros 'page' y 'limit' deben ser numéricos.");
            } catch (Exception e) {
                e.printStackTrace();
                solicitud.status(500).result("error en auditoría: " + e.getMessage());
            }
        });

        app.get("/auditoria/{id}", solicitud -> {
            try {
                int id = Integer.parseInt(solicitud.pathParam("id"));
                var audit = auditoriaService.obtenerPorId(id);
                if (audit != null) {
                    solicitud.json(audit);
                } else {
                    solicitud.status(404).result("registro de auditoría no encontrado");
                }
            } catch (NumberFormatException e) {
                solicitud.status(400).result("el id debe ser numérico");
            } catch (Exception e) {
                solicitud.status(500).result(e.getMessage());
            }
        });

        // ruta de busqueda general
        app.get("/busqueda", solicitud -> {
            try {
                String query = solicitud.queryParam("q");
                String categoria = solicitud.queryParam("categoria");
                solicitud.json(busquedaService.buscarGlobal(query, categoria));
            } catch (IllegalArgumentException e) {
                solicitud.status(400).result(e.getMessage());
            } catch (Exception e) {
                e.printStackTrace();
                solicitud.status(500).result("error en la búsqueda: " + e.getMessage());
            }
        });

        // rutas para codigos de barra y qr
        app.get("/barcode/resolver/{codigo}", solicitud -> {
            // resuelve que libro o socio corresponde al codigo escaneado
            try {
                String codigo = solicitud.pathParam("codigo");
                var res = barcodeService.resolverCodigo(codigo);
                if (res != null && Boolean.TRUE.equals(res.get("encontrado"))) {
                    solicitud.json(res);
                } else {
                    solicitud.status(404).json(res != null ? res : java.util.Map.of("encontrado", false));
                }
            } catch (Exception e) {
                solicitud.status(400)
                        .result("error resolviendo codigo: " + (e.getMessage() != null ? e.getMessage() : "inválido"));
            }
        });

        app.get("/barcode/validar-isbn/{isbn}", solicitud -> {
            // verifica si un isbn es valido
            try {
                String isbn = solicitud.pathParam("isbn");
                boolean valido = barcodeService.validarChecksumIsbn(isbn);
                solicitud.json(java.util.Map.of("isbn", isbn, "valido", valido));
            } catch (Exception e) {
                solicitud.status(500).result("error validando isbn: " + e.getMessage());
            }
        });

        app.get("/barcode/etiqueta-libro/{id}", solicitud -> {
            // devuelve los datos formateados para imprimir la etiqueta del libro
            try {
                int id = Integer.parseInt(solicitud.pathParam("id"));
                var etiqueta = barcodeService.obtenerDatosEtiquetaLibro(id);
                if (etiqueta != null) {
                    solicitud.json(etiqueta);
                } else {
                    solicitud.status(404).result("libro no encontrado");
                }
            } catch (NumberFormatException e) {
                solicitud.status(400).result("el id debe ser numerico");
            } catch (Exception e) {
                solicitud.status(500).result(e.getMessage());
            }
        });

        app.get("/barcode/carnet-socio/{id}", solicitud -> {
            // devuelve los datos formateados para imprimir el carnet de socio
            try {
                int id = Integer.parseInt(solicitud.pathParam("id"));
                var carnet = barcodeService.obtenerDatosCarnetSocio(id);
                if (carnet != null) {
                    solicitud.json(carnet);
                } else {
                    solicitud.status(404).result("socio no encontrado");
                }
            } catch (NumberFormatException e) {
                solicitud.status(400).result("el id debe ser numerico");
            } catch (Exception e) {
                solicitud.status(500).result(e.getMessage());
            }
        });

        // servir frontend compilado de manera directa y confiable
        if (rutaFrontend != null) {
            final File frontendDir = new File(rutaFrontend);
            final File indexHtmlFile = new File(frontendDir, "index.html");

            // ruta raiz para servir index.html
            app.get("/", ctx -> {
                if (indexHtmlFile.exists()) {
                    ctx.contentType("text/html; charset=utf-8");
                    ctx.header("Cache-Control", "no-cache, no-store, must-revalidate");
                    ctx.header("Pragma", "no-cache");
                    ctx.header("Expires", "0");
                    try (var in = new java.io.FileInputStream(indexHtmlFile)) {
                        ctx.result(in.readAllBytes());
                    }
                } else {
                    ctx.status(404).result("index.html no encontrado en " + frontendDir.getAbsolutePath());
                }
            });

            // servir recursos estaticos /assets/* directamente
            app.get("/assets/{file}", ctx -> {
                String filename = ctx.pathParam("file");
                if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
                    ctx.status(400).result("Ruta no permitida");
                    return;
                }
                File assetFile = new File(frontendDir, "assets" + File.separator + filename);
                if (assetFile.exists() && assetFile.isFile()) {
                    if (filename.endsWith(".js") || filename.endsWith(".mjs")) {
                        ctx.contentType("text/javascript; charset=utf-8");
                    } else if (filename.endsWith(".css")) {
                        ctx.contentType("text/css; charset=utf-8");
                    } else if (filename.endsWith(".svg")) {
                        ctx.contentType("image/svg+xml");
                    } else if (filename.endsWith(".png")) {
                        ctx.contentType("image/png");
                    } else if (filename.endsWith(".ico")) {
                        ctx.contentType("image/x-icon");
                    } else if (filename.endsWith(".woff2")) {
                        ctx.contentType("font/woff2");
                    } else if (filename.endsWith(".woff")) {
                        ctx.contentType("font/woff");
                    } else if (filename.endsWith(".ttf")) {
                        ctx.contentType("font/ttf");
                    }
                    ctx.header("Access-Control-Allow-Origin", "*");
                    ctx.header("Cache-Control", "public, max-age=31536000, immutable");
                    try (var in = new java.io.FileInputStream(assetFile)) {
                        ctx.result(in.readAllBytes());
                    }
                } else {
                    ctx.status(404).result("Asset no encontrado: " + filename);
                }
            });

            // servir /js/* directamente
            app.get("/js/{file}", ctx -> {
                String filename = ctx.pathParam("file");
                if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
                    ctx.status(400).result("Ruta no permitida");
                    return;
                }
                File jsFile = new File(frontendDir, "js" + File.separator + filename);
                if (jsFile.exists() && jsFile.isFile()) {
                    ctx.contentType("text/javascript; charset=utf-8");
                    ctx.header("Access-Control-Allow-Origin", "*");
                    try (var in = new java.io.FileInputStream(jsFile)) {
                        ctx.result(in.readAllBytes());
                    }
                } else {
                    ctx.status(404).result("Archivo no encontrado: " + filename);
                }
            });
        } else {
            // ruta informativa en / solo si no hay frontend compilado (evita 404 confuso en
            // modo solo api)
            app.get("/", solicitud -> {
                solicitud.contentType("text/html; charset=utf-8")
                        .result("<html><body style='font-family:system-ui,sans-serif;padding:3rem;text-align:center;background:#0f172a;color:#f8fafc;'>"
                                + "<h1 style='color:#38bdf8;'>📚 Servidor Backend Biblioteca Core</h1>"
                                + "<p>El servidor API está activo y respondiendo en el puerto 3001.</p>"
                                + "<p><a href='/swagger-ui' style='display:inline-block;padding:0.6rem 1.2rem;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;'>👉 Explorar Documentación Swagger UI</a></p>"
                                + "<p style='color:#94a3b8;font-size:0.85rem;margin-top:2rem;'>Aviso: Para servir la interfaz gráfica aquí, ejecute <code>npm run build</code> dentro de <code>frontend/</code>.</p>"
                                + "</body></html>");
            });
        }

        // arrancar en el puerto 3001
        app.start(3001);
        System.out.println("=================================================================");
        System.out.println("  Servidor Java Biblioteca activo en http://localhost:3001");
        if (rutaFrontend != null) {
            System.out.println("  Frontend Web activo: http://localhost:3001 (dist)");
            System.out.println("  Ruta estática: " + rutaFrontend);
        } else {
            System.out.println("   Frontend no encontrado en dist/. Ejecutando en modo solo API.");
        }
        System.out.println("  Swagger UI: http://localhost:3001/swagger-ui");
        System.out.println("  OpenAPI JSON: http://localhost:3001/openapi.json");
        System.out.println("=================================================================");
    }

    /* *
     * resuelve dinamicamente la ruta al frontend compilado con vite (carpeta dist).
     * funciona tanto si la aplicacion se ejecuta desde la raiz del proyecto,
     * desde sistema-biblioteca/, desde app/ o con ruta configurada en entorno.
     */
    public static String resolverRutaFrontend() {
        // 1. variable de entorno o propiedad del sistema
        String customPath = System.getProperty("biblioteca.frontend.path");
        if (customPath == null || customPath.trim().isEmpty()) {
            customPath = System.getenv("BIBLIOTECA_FRONTEND_PATH");
        }
        if (customPath != null && !customPath.trim().isEmpty()) {
            File f = new File(customPath.trim());
            if (f.exists() && f.isDirectory() && new File(f, "index.html").exists()) {
                return f.getAbsolutePath();
            }
        }

        // 2. posibles ubicaciones relativas segun el directorio de trabajo (cwd)
        String[] candidatos = {
                "../frontend/dist",
                "frontend/dist",
                "sistema-biblioteca/frontend/dist",
                "dist"
        };
        for (String c : candidatos) {
            File dir = new File(c);
            if (dir.exists() && dir.isDirectory() && new File(dir, "index.html").exists()) {
                return dir.getAbsolutePath();
            }
        }
        return null;
    }
}
