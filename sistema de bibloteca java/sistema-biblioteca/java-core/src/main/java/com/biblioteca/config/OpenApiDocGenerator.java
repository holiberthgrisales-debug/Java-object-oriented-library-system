package com.biblioteca.config;

public class OpenApiDocGenerator {

    public static String getOpenApiJson() {
        return """
{
  "openapi": "3.0.3",
  "info": {
    "title": "Sistema de Gestión de Biblioteca - API REST",
    "description": "API RESTful integral para la gestión de catálogo de libros, socios (usuarios), flujo transaccional de préstamos, trazabilidad/auditoría y motor de búsqueda federada.",
    "version": "1.1.0",
    "contact": {
      "name": "Equipo Biblioteca Core",
      "url": "http://localhost:5173"
    }
  },
  "servers": [
    {
      "url": "http://localhost:3001",
      "description": "Servidor Local de Desarrollo / API Backend"
    }
  ],
  "tags": [
    { "name": "Libros", "description": "Operaciones CRUD, filtrado, paginación y búsqueda de libros físicos y digitales" },
    { "name": "Usuarios", "description": "Gestión de socios, altas, modificaciones, bajas y listados paginados" },
    { "name": "Préstamos", "description": "Control de préstamos en curso, devoluciones, mora y estados" },
    { "name": "Búsqueda", "description": "Motor de búsqueda global fonética y federada en acervo, socios y préstamos" },
    { "name": "Auditoría", "description": "Trazabilidad, logs de actividad e historial de operaciones de la biblioteca" }
  ],
  "paths": {
    "/libros": {
      "get": {
        "tags": ["Libros"],
        "summary": "Obtener catálogo de libros (con soporte de paginación, filtros y ordenamiento)",
        "parameters": [
          { "name": "page", "in": "query", "description": "Número de página (1-indexado). Si se omite, retorna la lista completa.", "schema": { "type": "integer", "example": 1 } },
          { "name": "limit", "in": "query", "description": "Cantidad de registros por página (defecto 25, máx 200).", "schema": { "type": "integer", "example": 25 } },
          { "name": "sortBy", "in": "query", "description": "Campo de ordenamiento: id, titulo, autor, isbn, anio_publicacion, genero, cantidad_disponible, estado.", "schema": { "type": "string", "example": "titulo" } },
          { "name": "sortOrder", "in": "query", "description": "Dirección: asc o desc.", "schema": { "type": "string", "enum": ["asc", "desc"], "default": "asc" } },
          { "name": "q", "in": "query", "description": "Búsqueda por palabra clave en título, autor, isbn, género.", "schema": { "type": "string" } },
          { "name": "genero", "in": "query", "description": "Filtrar por género literario exacto.", "schema": { "type": "string" } },
          { "name": "disponible", "in": "query", "description": "Filtrar solo libros con stock > 0 (true/false).", "schema": { "type": "boolean" } },
          { "name": "anio", "in": "query", "description": "Filtrar por año de publicación.", "schema": { "type": "integer" } }
        ],
        "responses": {
          "200": { "description": "Listado de libros obtenido exitosamente." }
        }
      },
      "post": {
        "tags": ["Libros"],
        "summary": "Registrar un nuevo libro en el acervo",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/LibroInput" }
            }
          }
        },
        "responses": {
          "201": { "description": "Libro registrado exitosamente." },
          "400": { "description": "Datos de entrada inválidos." }
        }
      }
    },
    "/libros/{id}": {
      "get": {
        "tags": ["Libros"],
        "summary": "Consultar un libro por su ID único",
        "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }],
        "responses": {
          "200": { "description": "Libro encontrado." },
          "404": { "description": "Libro no encontrado." }
        }
      },
      "put": {
        "tags": ["Libros"],
        "summary": "Actualizar los datos de un libro",
        "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }],
        "requestBody": {
          "required": true,
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/LibroInput" } } }
        },
        "responses": {
          "200": { "description": "Libro actualizado." },
          "400": { "description": "Datos inválidos." }
        }
      },
      "delete": {
        "tags": ["Libros"],
        "summary": "Eliminar un libro del inventario",
        "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }],
        "responses": {
          "200": { "description": "Libro eliminado." },
          "400": { "description": "No se puede eliminar: tiene préstamos activos." }
        }
      }
    },
    "/usuarios": {
      "get": {
        "tags": ["Usuarios"],
        "summary": "Listar socios registrados (soporta paginación y ordenamiento)",
        "parameters": [
          { "name": "page", "in": "query", "description": "Número de página.", "schema": { "type": "integer" } },
          { "name": "limit", "in": "query", "description": "Límite por página.", "schema": { "type": "integer" } },
          { "name": "sortBy", "in": "query", "description": "Campo de orden: id, identificacion, nombre, email, telefono.", "schema": { "type": "string" } },
          { "name": "sortOrder", "in": "query", "description": "Dirección: asc o desc.", "schema": { "type": "string" } },
          { "name": "busqueda", "in": "query", "description": "Búsqueda rápida por nombre o identificación.", "schema": { "type": "string" } }
        ],
        "responses": { "200": { "description": "Listado de socios." } }
      },
      "post": {
        "tags": ["Usuarios"],
        "summary": "Registrar un nuevo socio",
        "requestBody": {
          "required": true,
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/UsuarioInput" } } }
        },
        "responses": {
          "201": { "description": "Socio registrado." },
          "400": { "description": "Validación fallida." }
        }
      }
    },
    "/usuarios/{id}": {
      "get": {
        "tags": ["Usuarios"],
        "summary": "Obtener información de un socio por ID",
        "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }],
        "responses": { "200": { "description": "Socio encontrado." }, "404": { "description": "No existe." } }
      },
      "put": {
        "tags": ["Usuarios"],
        "summary": "Modificar los datos de un socio",
        "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }],
        "requestBody": { "required": true, "content": { "application/json": { "schema": { "$ref": "#/components/schemas/UsuarioInput" } } } },
        "responses": { "200": { "description": "Socio actualizado." } }
      },
      "delete": {
        "tags": ["Usuarios"],
        "summary": "Dar de baja un socio",
        "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }],
        "responses": {
          "200": { "description": "Socio eliminado." },
          "400": { "description": "El socio posee préstamos pendientes." }
        }
      }
    },
    "/prestamos": {
      "get": {
        "tags": ["Préstamos"],
        "summary": "Listado general de préstamos (soporta paginación, ordenamiento y filtro por estado)",
        "parameters": [
          { "name": "page", "in": "query", "description": "Número de página.", "schema": { "type": "integer" } },
          { "name": "limit", "in": "query", "description": "Límite por página.", "schema": { "type": "integer" } },
          { "name": "sortBy", "in": "query", "description": "Campo de orden: id, fecha_prestamo, fecha_devolucion, precio.", "schema": { "type": "string" } },
          { "name": "sortOrder", "in": "query", "description": "Dirección: asc o desc.", "schema": { "type": "string" } },
          { "name": "estado", "in": "query", "description": "Filtro de estado: activos, vencidos, devueltos.", "schema": { "type": "string", "enum": ["activos", "vencidos", "devueltos"] } }
        ],
        "responses": { "200": { "description": "Listado de préstamos." } }
      },
      "post": {
        "tags": ["Préstamos"],
        "summary": "Registrar un nuevo préstamo de libro",
        "requestBody": {
          "required": true,
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/PrestamoInput" } } }
        },
        "responses": {
          "201": { "description": "Préstamo concedido." },
          "400": { "description": "Stock agotado o usuario inexistente." }
        }
      }
    },
    "/prestamos/{id}/devolver": {
      "put": {
        "tags": ["Préstamos"],
        "summary": "Registrar devolución de libro y restablecer stock (+1)",
        "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }],
        "responses": {
          "200": { "description": "Libro devuelto exitosamente." },
          "400": { "description": "El libro ya había sido devuelto." },
          "404": { "description": "Préstamo no encontrado." }
        }
      }
    },
    "/prestamos/vencidos": {
      "get": {
        "tags": ["Préstamos"],
        "summary": "Obtener todos los préstamos que se encuentran en mora",
        "responses": { "200": { "description": "Lista de préstamos en mora." } }
      }
    },
    "/busqueda": {
      "get": {
        "tags": ["Búsqueda"],
        "summary": "Búsqueda global federada multicriterio con normalización fonética",
        "parameters": [
          { "name": "q", "in": "query", "required": true, "description": "Término a buscar.", "schema": { "type": "string" } },
          { "name": "categoria", "in": "query", "description": "Filtro: todo, libros, usuarios, prestamos.", "schema": { "type": "string", "default": "todo" } }
        ],
        "responses": { "200": { "description": "Resultados consolidados de búsqueda." } }
      }
    },
    "/auditoria": {
      "get": {
        "tags": ["Auditoría"],
        "summary": "Consultar historial de auditoría y trazabilidad del sistema",
        "parameters": [
          { "name": "page", "in": "query", "description": "Página solicitada.", "schema": { "type": "integer" } },
          { "name": "limit", "in": "query", "description": "Registros por página.", "schema": { "type": "integer" } },
          { "name": "entidad", "in": "query", "description": "Filtrar por entidad: LIBRO, USUARIO, PRESTAMO.", "schema": { "type": "string" } },
          { "name": "accion", "in": "query", "description": "Filtrar por acción: CREAR, MODIFICAR, ELIMINAR, PRESTAR, DEVOLVER.", "schema": { "type": "string" } },
          { "name": "sortBy", "in": "query", "description": "Campo de orden.", "schema": { "type": "string" } },
          { "name": "sortOrder", "in": "query", "description": "Dirección: asc o desc.", "schema": { "type": "string" } }
        ],
        "responses": { "200": { "description": "Historial de logs de auditoría." } }
      }
    },
    "/auditoria/{id}": {
      "get": {
        "tags": ["Auditoría"],
        "summary": "Obtener el detalle de un registro específico de auditoría",
        "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }],
        "responses": {
          "200": { "description": "Detalle del evento." },
          "404": { "description": "No encontrado." }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "LibroInput": {
        "type": "object",
        "required": ["titulo", "autor"],
        "properties": {
          "titulo": { "type": "string", "example": "Cien Años de Soledad" },
          "autor": { "type": "string", "example": "Gabriel García Márquez" },
          "isbn": { "type": "string", "example": "978-0307474728" },
          "anioPublicacion": { "type": "integer", "example": 1967 },
          "genero": { "type": "string", "example": "Realismo Mágico" },
          "cantidadDisponible": { "type": "integer", "example": 5 },
          "ubicacion": { "type": "string", "example": "Estante A-12" },
          "urlDescarga": { "type": "string", "example": "" },
          "estado": { "type": "string", "example": "Disponible" },
          "anioEdicion": { "type": "integer", "example": 2020 },
          "edicion": { "type": "string", "example": "1ra Edición Conmemorativa" }
        }
      },
      "UsuarioInput": {
        "type": "object",
        "required": ["nombre"],
        "properties": {
          "identificacion": { "type": "string", "example": "1002345678" },
          "nombre": { "type": "string", "example": "Carlos Benítez" },
          "email": { "type": "string", "example": "carlos.benitez@email.com" },
          "telefono": { "type": "string", "example": "+57 312 4567890" }
        }
      },
      "PrestamoInput": {
        "type": "object",
        "required": ["usuarioId", "libroId", "fechaDevolucion"],
        "properties": {
          "usuarioId": { "type": "integer", "example": 1 },
          "libroId": { "type": "integer", "example": 2 },
          "fechaPrestamo": { "type": "string", "format": "date", "example": "2026-09-01" },
          "fechaDevolucion": { "type": "string", "format": "date", "example": "2026-09-15" },
          "precio": { "type": "number", "example": 2500.0 }
        }
      }
    }
  }
}
""";
    }

    public static String getSwaggerUiHtml() {
        return """
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Biblioteca API - Documentación Interactiva Swagger</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body {
      margin: 0;
      background: #0f172a;
      font-family: 'Inter', sans-serif;
      color: #f8fafc;
    }
    .top-header-banner {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #38bdf8;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-links a {
      color: #94a3b8;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      padding: 6px 14px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.2s;
    }
    .brand-links a:hover {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border-color: #38bdf8;
    }
    #swagger-ui {
      max-width: 1280px;
      margin: 0 auto;
      padding: 20px;
      background: #ffffff;
      border-radius: 12px;
      margin-top: 24px;
      margin-bottom: 40px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
    }
  </style>
</head>
<body>
  <div class="top-header-banner">
    <div class="brand-title">
      📚 Sistema de Biblioteca - Swagger UI (OpenAPI 3.0)
    </div>
    <div class="brand-links">
      <a href="/openapi.json" target="_blank">Ver JSON OpenAPI</a>
      <a href="http://localhost:5173" target="_blank">Ir a la Aplicación Web</a>
    </div>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>
""";
    }
}
