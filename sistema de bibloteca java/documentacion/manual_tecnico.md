# MANUAL TÉCNICO DE ARQUITECTURA Y DESARROLLO
## SISTEMA DE GESTIÓN DE BIBLIOTECA (BIBLIOTECA CORE // SISYPHUS PROTOCOL)

---

### TABLA DE CONTENIDO
1. [Información General del Proyecto](#1-información-general-del-proyecto)
2. [Arquitectura General del Sistema](#2-arquitectura-general-del-sistema)
3. [Modelo de Datos y Persistencia (SQLite)](#3-modelo-de-datos-y-persistencia-sqlite)
4. [Diseño y Componentes del Backend (Java Core)](#4-diseño-y-componentes-del-backend-java-core)
5. [Especificación de la API REST (Endpoints)](#5-especificación-de-la-api-rest-endpoints)
6. [Diseño y Módulos del Frontend (SPA)](#6-diseño-y-módulos-del-frontend-spa)
7. [Seguridad, Hardening y Control de Vulnerabilidades (OWASP)](#7-seguridad-hardening-y-control-de-vulnerabilidades-owasp)
8. [Scripts de Automatización y Despliegue](#8-scripts-de-automatización-y-despliegue)
9. [Guía de Compilación, Mantenimiento y Despliegue](#9-guía-de-compilación-mantenimiento-y-despliegue)

---

### 1. INFORMACIÓN GENERAL DEL PROYECTO

- **Nombre del Sistema:** Sistema de Gestión de Biblioteca (*Biblioteca Core*)
- **Versión:** 1.3.0 (Hardening de Seguridad, Validación de Invariantes, Sanitización XSS y CORS Restringido)
- **Lenguaje Backend:** Java 17 LTS
- **Framework Web / API Backend:** Javalin 6.1.3 (Servidor embebido Jetty 11)
- **Base de Datos:** SQLite 3 (vía `sqlite-jdbc` 3.45.2.0) con PRAGMAs WAL y Foreign Keys activas
- **Frontend:** Single Page Application (HTML5, Vanilla JavaScript ES6+, CSS3 Moderno con variables y diseño responsivo Cyber HUD, Alpine.js, Vite 8)
- **Empaquetado:** Fat JAR autocontenido (Maven Shade Plugin) compilado directamente en `sistema-biblioteca/app/biblioteca.jar`
- **Documentación de API:** OpenAPI 3.0 + Swagger UI interactivo integrado en tiempo de ejecución

#### Propósito y Alcance
El sistema automatiza la administración integral de una biblioteca moderna. Permite el control de inventario de libros (físicos y digitales con URLs de descarga seguras), registro y seguimiento de usuarios (socios), gestión transaccional de préstamos con cálculo dinámico de estados (Activo, Vencido, Devuelto), tarifas económicas, motor de búsqueda global multicriterio con normalización fonética y de caracteres acentuados, identificación óptica mediante códigos de barra (1D / Code 128) y códigos QR (2D) con validación matemática de ISBN, paginación dinámica, trazabilidad mediante logs de auditoría inmutables, documentación interactiva vía Swagger UI y hardening riguroso de seguridad contra inyecciones y accesos no autorizados.

---

### 2. ARQUITECTURA GENERAL DEL SISTEMA

El sistema sigue una arquitectura desacoplada basada en el patrón cliente-servidor mediante una **API RESTful**:

```
+-------------------------------------------------------------------------+
|                              CAPA CLIENTE                               |
|                  Frontend Web SPA (Navegador Web)                       |
|        [HTML5 / Alpine.js / Vanilla JS / CSS3 Moderno / Vite :5173]     |
+-------------------------------------------------------------------------+
                                    │
                                    │ HTTP / JSON (REST API - Puerto 3001)
                                    ▼
+-------------------------------------------------------------------------+
|                              CAPA SERVIDOR                              |
|                          Servidor Web Javalin                           |
|  [CORS Restringido (:5173), Jackson JSON, Swagger UI, OpenAPI 3.0]      |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                        CAPA DE LÓGICA DE NEGOCIO                        |
|                                Servicios                                |
|  - LibroService (Obligaciones<Libro> + Paginación + Auditoría + URL)    |
|  - UsuarioService (Obligaciones<Usuario> + Paginación + Invariantes)    |
|  - PrestamoService (Transaccional + Invariantes de Precios y Fechas)    |
|  - AuditoriaService (Trazabilidad y Logs Inmutables)                    |
|  - BusquedaService (Búsqueda Federada Global Multicriterio)             |
|  - BarcodeService (Resolución Óptica 1D/2D, Checksum ISBN y Etiquetas)  |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                        CAPA DE ACCESO A DATOS                           |
|                         DatabaseConnection                              |
|          [JDBC Connection, PRAGMAs, UDFs: NORMALIZAR / UNACCENT]        |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                         CAPA DE PERSISTENCIA                            |
|                     Motor SQLite (biblioteca.db)                        |
|             Tablas: libros, usuarios, prestamos, auditoria              |
+-------------------------------------------------------------------------+
```

---

### 3. MODELO DE DATOS Y PERSISTENCIA (SQLite)

La base de datos SQLite se almacena en el archivo `database/biblioteca.db` con soporte para transacciones ACID, integridad referencial y funciones personalizadas en tiempo de ejecución.

#### 3.1 Esquema de Tablas

##### Tabla: `libros`
| Campo | Tipo SQL | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Identificador único secuencial del libro |
| `titulo` | `TEXT` | `NOT NULL` | Título de la obra (máx. 250 caracteres) |
| `autor` | `TEXT` | `NOT NULL` | Nombre completo del autor (máx. 200 caracteres) |
| `isbn` | `TEXT` | `NULL` | Código internacional normalizado del libro (máx. 30 caracteres) |
| `anio_publicacion` | `INTEGER` | `NULL` | Año de publicación del libro |
| `edicion` | `TEXT` | `NULL` | Número o descripción de la edición (máx. 100 caracteres) |
| `anio_edicion` | `INTEGER` | `NULL` | Año correspondiente a la edición específica |
| `genero` | `TEXT` | `NULL` | Género literario o categoría (máx. 100 caracteres) |
| `cantidad_disponible` | `INTEGER` | `DEFAULT 1` | Stock de ejemplares disponibles para préstamo (invariante: `>= 0`) |
| `estado` | `TEXT` | `DEFAULT 'Disponible'` | Condición/estado del libro (Disponible, Prestado, etc.) |
| `ubicacion` | `TEXT` | `NULL` | Ubicación física (máx. 150 caracteres) |
| `url_descarga` | `TEXT` | `NULL` | Enlace URL digital (máx. 500 caracteres, protocolo forzado `http://` o `https://`) |

##### Tabla: `usuarios`
| Campo | Tipo SQL | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Identificador único del usuario |
| `identificacion` | `TEXT` | `NULL` | Cédula o documento de identidad (máx. 50 caracteres) |
| `nombre` | `TEXT` | `NOT NULL` | Nombre completo del socio (máx. 150 caracteres) |
| `email` | `TEXT` | `NULL` | Correo electrónico de contacto (máx. 150 caracteres) |
| `telefono` | `TEXT` | `NULL` | Número telefónico o móvil (máx. 30 caracteres) |

##### Tabla: `prestamos`
| Campo | Tipo SQL | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Identificador único del préstamo |
| `usuario_id` | `INTEGER` | `NOT NULL, FK -> usuarios(id)` | ID del usuario que solicita el préstamo (debe ser `> 0`) |
| `libro_id` | `INTEGER` | `NOT NULL, FK -> libros(id)` | ID del libro prestado (debe ser `> 0`) |
| `fecha_prestamo` | `TEXT` | `NULL` | Fecha de expedición del préstamo (`YYYY-MM-DD`) |
| `fecha_devolucion` | `TEXT` | `NULL` | Fecha límite de entrega (`YYYY-MM-DD`, invariante: `>= fecha_prestamo`) |
| `devuelto` | `INTEGER` | `DEFAULT 0` | Bandera booleana: `0` (No devuelto), `1` (Devuelto) |
| `precio` | `REAL` | `DEFAULT 0.0` | Tarifa asociada al préstamo (invariante: `0.0 <= precio <= 10,000,000.0`) |

##### Tabla: `auditoria`
| Campo | Tipo SQL | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Identificador único del registro de auditoría |
| `entidad` | `TEXT` | `NOT NULL` | Entidad afectada (`LIBRO`, `USUARIO`, `PRESTAMO`) |
| `entidad_id` | `INTEGER` | `NULL` | ID del registro afectado |
| `accion` | `TEXT` | `NOT NULL` | Operación ejecutada (`CREAR`, `MODIFICAR`, `ELIMINAR`, `PRESTAR`, `DEVOLVER`) |
| `usuario_responsable` | `TEXT` | `DEFAULT 'Sistema / Administrador'` | Autor de la acción |
| `detalles` | `TEXT` | `NULL` | Descripción detallada del cambio o estado previo/posterior |
| `fecha_registro` | `TEXT` | `NOT NULL` | Marca temporal ISO-8601 del evento |

#### 3.2 Índices de Rendimiento y Unicidad Condicional
```sql
CREATE INDEX IF NOT EXISTS idx_libros_titulo ON libros(titulo);
CREATE INDEX IF NOT EXISTS idx_libros_autor ON libros(autor);
CREATE INDEX IF NOT EXISTS idx_libros_estado ON libros(estado);
CREATE INDEX IF NOT EXISTS idx_usuarios_nombre ON usuarios(nombre);
CREATE INDEX IF NOT EXISTS idx_usuarios_identificacion ON usuarios(identificacion);
CREATE INDEX IF NOT EXISTS idx_prestamos_estado ON prestamos(devuelto, fecha_devolucion);
CREATE INDEX IF NOT EXISTS idx_prestamos_usuario ON prestamos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_libro ON prestamos(libro_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON auditoria(entidad);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(fecha_registro);

-- Índices únicos condicionales para prevenir colisiones de datos
CREATE UNIQUE INDEX IF NOT EXISTS idx_libros_isbn_unique ON libros(isbn) WHERE isbn IS NOT NULL AND trim(isbn) != '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_identificacion_unique ON usuarios(identificacion) WHERE identificacion IS NOT NULL AND trim(identificacion) != '';
```

#### 3.3 Funciones Personalizadas en SQLite (UDFs)
Java registra dinámicamente dos funciones SQL en la conexión SQLite vía JDBC:
- **`NORMALIZAR(texto)`** / **`UNACCENT(texto)`**: Transforma cadenas mediante `java.text.Normalizer` a forma `NFD`, eliminando marcas diacríticas (tildes, diéresis) y convirtiendo todo a minúsculas (`toLowerCase(Locale.ROOT)`). Permite que búsquedas como `"fantasía"` coincidan con `"fantasia"`, `"FANTASÍA"` o `"Fantasia"`.

---

### 4. DISEÑO Y COMPONENTES DEL BACKEND (JAVA CORE)

El backend está organizado bajo el paquete principal `com.biblioteca`:

```
com.biblioteca
│
├── config
│   ├── DatabaseConnection.java     # Conexiones SQLite, UDFs, tablas, índices y migraciones
│   └── OpenApiDocGenerator.java    # Especificación OpenAPI 3.0 y UI interactiva Swagger
│
├── interfaces
│   └── Obligaciones.java           # Contrato CRUD genérico
│
├── models
│   ├── Libro.java                  # Modelo base de libro
│   ├── LibroFisico.java            # Especialización para libros físicos
│   ├── LibroDigital.java           # Especialización para libros digitales
│   ├── Usuario.java                # Modelo de usuario/socio
│   ├── Prestamo.java               # Modelo de préstamo con lógica de estado
│   ├── Auditoria.java              # Modelo para trazabilidad y logs de actividad
│   ├── PaginatedResponse.java      # DTO genérico de paginación y metadatos
│   └── ResultadoBusqueda.java      # DTO unificado para búsqueda global federada
│
├── services
│   ├── LibroService.java           # Lógica de libros, validación de URLs, límites y auditoría
│   ├── UsuarioService.java         # Lógica de socios, límites de longitud y auditoría
│   ├── PrestamoService.java        # Control transaccional, invariantes de negocio y auditoría
│   ├── AuditoriaService.java       # Gestión de logs de auditoría y trazabilidad
│   ├── BusquedaService.java        # Motor de búsqueda global multicriterio
│   └── BarcodeService.java         # Resolución de códigos, validación de ISBN y etiquetas
│
└── Main.java                       # Configuración Javalin, CORS restringido, API Key y Rutas
```

#### 4.1 Detalle de Servicios y Validaciones de Seguridad

##### `DatabaseConnection.java`
- Resuelve dinámicamente la ruta del archivo `.db` buscando en rutas relativas locales (`../database/biblioteca.db`, `database/biblioteca.db`, `sistema-biblioteca/database/biblioteca.db`) o mediante la variable de entorno `BIBLIOTECA_DB_PATH`.
- Activa `PRAGMA foreign_keys = ON`, `PRAGMA journal_mode = WAL`, `PRAGMA synchronous = NORMAL` y `PRAGMA busy_timeout = 10000` en cada conexión.
- Inicializa automáticamente las 4 tablas e índices en el arranque del sistema.

##### `AuditoriaService.java`
- Registra de forma automática e inmutable eventos operacionales (`CREAR`, `MODIFICAR`, `ELIMINAR`, `PRESTAR`, `DEVOLVER`) con marca temporal ISO-8601, usuario responsable y descripción detallada.
- Soporta consultas paginadas con límites cerrados (`1 <= limit <= 200`) y ordenamiento validado contra lista blanca de columnas permitidas (`ALLOWED_SORT_COLUMNS`).

##### `LibroService.java`
- Implementa `Obligaciones<Libro>`.
- **Validación de Invariantes y Límites:**
  - `titulo` (obligatorio, máx. 250 caracteres).
  - `autor` (obligatorio, máx. 200 caracteres).
  - `isbn` (máx. 30 caracteres, unicidad garantizada).
  - `genero` (máx. 100 caracteres).
  - `edicion` (máx. 100 caracteres).
  - `ubicacion` (máx. 150 caracteres).
  - `urlDescarga` (máx. 500 caracteres, protocolo obligatorio `http://` o `https://` para erradicar vectores XSS como `javascript:`).
  - `cantidadDisponible >= 0`, `anioPublicacion >= 0`, `anioEdicion >= 0`.
- Soporta paginación dinámica mediante `obtenerPaginado(...)` con protección SQL Injection mediante `ALLOWED_SORT_COLUMNS`.

##### `UsuarioService.java`
- Implementa `Obligaciones<Usuario>`.
- **Validación de Invariantes y Límites:**
  - `nombre` (obligatorio, no vacío, máx. 150 caracteres).
  - `identificacion` (máx. 50 caracteres, unicidad validada).
  - `email` (máx. 150 caracteres, rechazo de espacios en blanco).
  - `telefono` (máx. 30 caracteres).
- Dispara eventos de auditoría y bloquea eliminación si el socio posee préstamos en su historial.

##### `PrestamoService.java`
- **Gestión Transaccional Atómica:** Al registrar un préstamo (`agregar`), ejecuta bajo `conn.setAutoCommit(false)`:
  1. Ejecuta `validar(prestamo)` comprobando:
     - `usuarioId > 0` y `libroId > 0`.
     - `precio >= 0.0` y `precio <= 10,000,000.0`.
     - `fechaDevolucion >= fechaPrestamo`.
  2. Verifica existencia del libro y disponibilidad de stock (`cantidad_disponible > 0`).
  3. Verifica existencia del socio en la base de datos.
  4. Inserta el registro en `prestamos`.
  5. Descuenta stock atómicamente: `UPDATE libros SET cantidad_disponible = cantidad_disponible - 1 WHERE id = ? AND cantidad_disponible > 0`.
  6. Registra evento de auditoría (`PRESTAR`).
  7. Ejecuta `conn.commit()`. Ante cualquier error, ejecuta `conn.rollback()`.
- **Devolución de Libros (`devolverLibro`):** Marca `devuelto = 1`, repone automáticamente el stock del libro (`cantidad_disponible + 1`) y registra auditoría (`DEVOLVER`).
- **Actualización de Préstamos (`actualizar`):** Valida invariantes y reconcilia dinámicamente el stock si se modifica el estado de devolución o el libro asignado.

##### `BusquedaService.java`
- Construye consultas SQL federadas mediante `UNION ALL` combinando las tablas `libros`, `usuarios` y `prestamos`.
- Tokeniza las cadenas de búsqueda aplicando `NORMALIZAR(...) LIKE ?` mediante parámetros de sustitución (`PreparedStatement`), evitando inyecciones SQL por comodines o comillas.

##### `BarcodeService.java`
- Procesa códigos ópticos de identificación:
  - **`limpiarCodigo(String)`**: Elimina guiones y espacios en blanco.
  - **`validarChecksumIsbn(String)`**: Verificación matemática del dígito de control (módulo 11 para ISBN-10 y módulo 10 para ISBN-13).
  - **`resolverCodigo(String)`**: Resolución unificada que identifica si el código corresponde a un libro o a un socio en una única llamada a la base de datos.

---

### 5. ESPECIFICACIÓN DE LA API REST (ENDPOINTS)

El servidor escucha por defecto en el puerto `http://localhost:3001`.
- **Documentación Interactiva Swagger UI:** `http://localhost:3001/swagger-ui`
- **Especificación OpenAPI 3.0 (JSON):** `http://localhost:3001/openapi.json`

#### 5.1 Módulo: Usuarios
| Método | Ruta | Query Params / Body | Descripción | Respuestas |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/usuarios` | `page`, `limit`, `sortBy`, `sortOrder`, `busqueda` | Obtiene lista de socios paginada o completa con headers `X-Total-Count`, `X-Page`, `X-Total-Pages`. | `200 OK` (Array o `PaginatedResponse`) |
| `GET` | `/usuarios/{id}` | - | Detalle de un socio por su ID. | `200 OK`, `404 Not Found`, `400 Bad Request` |
| `POST` | `/usuarios` | Body: `{ identificacion, nombre, email, telefono }` | Registra un nuevo socio (con validación de longitud) y genera auditoría. | `201 Created`, `400 Bad Request` |
| `PUT` | `/usuarios/{id}` | Body: `{ identificacion, nombre, email, telefono }` | Actualiza un socio y genera log de auditoría. | `200 OK`, `400 Bad Request`, `500 Error` |
| `DELETE`| `/usuarios/{id}` | - | Elimina un socio (bloqueado si tiene préstamos). | `200 OK`, `400 Bad Request` |

#### 5.2 Módulo: Libros
| Método | Ruta | Query Params / Body | Descripción | Respuestas |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/libros` | `page`, `limit`, `sortBy`, `sortOrder`, `q`, `genero`, `disponible`, `anio` | Catálogo de libros con paginación, filtros multicriterio y ordenamiento dinámico seguro. | `200 OK` (Array o `PaginatedResponse`) |
| `GET` | `/libros/{id}` | - | Obtiene el detalle de un libro específico. | `200 OK`, `404 Not Found` |
| `POST` | `/libros` | Body: `{ titulo, autor, isbn, anioPublicacion, edicion, anioEdicion, genero, cantidadDisponible, estado, ubicacion, urlDescarga }` | Registra un nuevo libro (validando URL `http/https` y longitudes) y genera auditoría. | `201 Created`, `400 Bad Request` |
| `PUT` | `/libros/{id}` | Body: `{ ... }` | Modifica datos de un libro y registra auditoría. | `200 OK`, `400 Bad Request` |
| `DELETE`| `/libros/{id}` | - | Elimina un libro (bloqueado si tiene préstamos activos). | `200 OK`, `400 Bad Request` |

#### 5.3 Módulo: Préstamos
| Método | Ruta | Query Params / Body | Descripción | Respuestas |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/prestamos` | `page`, `limit`, `sortBy`, `sortOrder`, `estado` | Listado general con paginación, ordenamiento y filtro (`activos`, `vencidos`, `devueltos`). | `200 OK` (Array o `PaginatedResponse`) |
| `GET` | `/prestamos/vencidos` | - | Lista préstamos con fecha de devolución expirada. | `200 OK` (Array JSON) |
| `GET` | `/prestamos/{id}` | - | Información detallada de un préstamo por ID. | `200 OK`, `404 Not Found` |
| `POST` | `/prestamos` | Body: `{ usuarioId, libroId, fechaDevolucion, precio }` | Crea préstamo con validación de invariantes (`precio >= 0`, `fechaDevolucion >= hoy`), descuenta stock y audita. | `201 Created`, `400 Bad Request` |
| `PUT` | `/prestamos/{id}/devolver` | - | Marca devuelto, restituye stock (+1) y genera auditoría. | `200 OK`, `400 Bad Request` |
| `PUT` | `/prestamos/{id}` | Body: `{ usuarioId, libroId, fechaPrestamo, fechaDevolucion, devuelto, precio }` | Edición completa de préstamo con reconciliación de inventario. | `200 OK`, `400 Bad Request` |
| `DELETE`| `/prestamos/{id}` | - | Elimina el préstamo y devuelve el stock si estaba activo. | `200 OK`, `404 Not Found` |

#### 5.4 Módulo: Auditoría y Trazabilidad
| Método | Ruta | Query Params | Descripción | Respuestas |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/auditoria` | `page`, `limit`, `entidad`, `accion`, `sortBy`, `sortOrder` | Consulta histórica de eventos de la biblioteca. | `200 OK` (Array o `PaginatedResponse`) |
| `GET` | `/auditoria/{id}` | - | Detalle individual de un registro de auditoría. | `200 OK`, `404 Not Found` |

#### 5.5 Módulo: Búsqueda y Documentación
| Método | Ruta | Query Params | Descripción | Respuestas |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/busqueda` | `q` *(texto)*, `categoria` *(categoría)* | Búsqueda multicriterio federada en libros, usuarios y préstamos. | `200 OK` (Array `ResultadoBusqueda`) |
| `GET` | `/openapi.json` | - | Especificación OpenAPI 3.0 completa en JSON. | `200 OK` (JSON) |
| `GET` | `/swagger-ui` | - | Interfaz gráfica interactiva de documentación Swagger. | `200 OK` (HTML) |
| `GET` | `/swagger` | - | Redirección automática a `/swagger-ui`. | `302 Found` |

#### 5.6 Módulo: Códigos de Barra y QR (`/barcode`)
| Método | Ruta | Query Params / Body | Descripción | Respuestas |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/barcode/resolver/{codigo}` | - | Resuelve de forma unificada si un código escaneado corresponde a un libro o socio. | `200 OK` (`{ encontrado, tipo, datos }`), `500 Error` |
| `GET` | `/barcode/validar-isbn/{isbn}` | - | Validación algorítmica matemática de ISBN-10 o ISBN-13. | `200 OK` (`{ isbn, valido }`), `500 Error` |
| `GET` | `/barcode/etiqueta-libro/{id}` | - | Genera datos completos para la etiqueta física del libro (1D y 2D QR). | `200 OK` (JSON), `404 Not Found`, `400 Bad Request` |
| `GET` | `/barcode/carnet-socio/{id}` | - | Genera datos completos para el carnet de socio (1D y 2D QR). | `200 OK` (JSON), `404 Not Found`, `400 Bad Request` |

---

### 6. DISEÑO Y MÓDULOS DEL FRONTEND (SPA)

El frontend está estructurado como una aplicación web de una sola página (Single Page Application) sin recarga de navegador, ubicada en `sistema-biblioteca/frontend/`:

```
frontend
│
├── index.html                      # Estructura principal y plantillas de modales
├── package.json                    # Dependencias de desarrollo (Vite)
├── vite.config.ts                  # Configuración de compilación Vite
│
└── src
    ├── css
    │   ├── styles.css              # Hoja de estilos principal (Diseño Cyber HUD / Glassmorphism)
    │   └── responsive.css          # Reglas y adaptabilidad para móviles y tablets
    │
    └── js
        ├── init-sync.js            # Inicialización temprana en <head> (tema + cookies traducción)
        ├── tema.js                 # Gestión de tema claro/oscuro y paletas reactivas
        ├── main.js                 # Cliente API, escape HTML, safeUrl y listeners globales
        ├── gestion.js              # Controladores CRUD, modales y autocompletado en tiempo real
        ├── excel-filter.js         # Motor interactivo de filtrado/ordenamiento por columnas
        ├── generos.js              # Taxonomía y selector de más de 120 géneros literarios
        ├── estadisticas.js         # Dashboard de inteligencia con ApexCharts y exportación Excel
        ├── barcode-qr.js           # Generación de Códigos de Barra, QR, Carnets y Escáner Óptico
        └── translate.js            # Selector multilingüe integrado
```

#### 6.1 Módulos JavaScript Principales

1. **`main.js`**:
   - **Cliente HTTP (`api`):** Wrapper sobre `fetch` que serializa peticiones JSON y maneja excepciones uniformemente.
   - **Sanitización XSS (`esc`):** Función de escape HTML optimizada mediante mapa de caracteres para caracteres especiales (`&`, `<`, `>`, `"`, `'`).
   - **Sanitización de URLs (`safeUrl`):** Validador estricto que exige que las URLs inicien exclusivamente con `http://` o `https://`. Bloquea la inyección de pseudo-protocolos ejecutables (`javascript:`, `data:`, `vbscript:`).
   - **Validación en Formulario de Libros:** Impide el envío de URLs digitales que no cumplan los estándares de seguridad web.

2. **`gestion.js`**:
   - **Renderizado Seguro de Enlaces:** Utiliza `safeUrl` y aplica `target="_blank" rel="noopener noreferrer"` en la tabla de libros y en el modal de detalle ("Ver más").
   - **Manejo de Vistas:** Alternancia entre tarjetas dinámicas (*Cards*) y tabla estructurada.
   - **Búsqueda en Tiempo Real y Dropdowns Accesibles:** Selección predictiva para usuarios y libros en préstamos con navegación por teclado (`ArrowDown`, `ArrowUp`, `Enter`, `Escape`).

3. **`tema.js`**:
   - Control de alternancia entre Tema Oscuro y Claro (`data-theme="light"`), persistencia en `localStorage` y actualización reactiva de iconos Lucide.

4. **`barcode-qr.js`**:
   - Generación SVG de códigos de barras (1D / Code 128) vía `JsBarcode` y códigos QR (2D) vía `QRCode.js`.
   - Escáner óptico mediante cámara web o archivo con `Html5Qrcode`.

5. **`estadisticas.js`**:
   - Dashboard de inteligencia gerencial con ApexCharts y exportación estructurada en 6 pestañas Excel vía SheetJS (`xlsx`).

---

### 7. SEGURIDAD, HARDENING Y CONTROL DE VULNERABILIDADES (OWASP)

Tras la ejecución de auditorías de Penetration Testing (Pentest), el sistema implementa defensas en profundidad:

1. **Prevención de Inyección SQL (OWASP A03):**
   - 100% de las consultas a SQLite se realizan mediante `PreparedStatement` con asignación tipada de parámetros (`setString`, `setInt`, `setDouble`).
   - Los parámetros de ordenamiento dinámico (`sortBy`) se validan contra un conjunto cerrado en memoria (`ALLOWED_SORT_COLUMNS`), previniendo inyecciones en cláusulas `ORDER BY`.

2. **Prevención de Cross-Site Scripting Stored / DOM XSS (OWASP A03):**
   - Escape sistemático de texto plano con la función `esc()`.
   - Verificación de esquemas seguros mediante `safeUrl()` para enlaces externos, desarmando cualquier payload del tipo `javascript:alert(1)`.
   - Inclusión de directivas `rel="noopener noreferrer"` para evitar ataques de tabnabbing inverso.

3. **Política Restringida de CORS (OWASP A05):**
   - Se eliminó el comodín `anyHost()`. La API de Javalin restringe el intercambio de recursos de origen cruzado exclusivamente al frontend legítimo:
     `http://localhost:5173` y `http://127.0.0.1:5173`.
   - Permite configuración personalizada mediante la variable de entorno `BIBLIOTECA_FRONTEND_URL`.

4. **Validación de Invariantes de Negocio y Tipado Estricto (OWASP A04):**
   - **Préstamos:** Validación estricta que impide precios negativos (`precio >= 0.0`), topes máximos racionales (`precio <= 10,000,000.0`), y fechas coherentes (`fechaDevolucion >= fechaPrestamo`).
   - **Control de Inventario Concurrente:** Descuento de stock mediante cláusulas atómicas con transacciones manuales (`conn.setAutoCommit(false)`, `commit()`, `rollback()`), mitigando condiciones de carrera (Race Conditions).
   - **Límites de Longitud:** Cuotas máximas de caracteres en todas las cadenas entrantes para evitar desbordamientos de memoria o almacenamiento en base de datos.

---

### 8. SCRIPTS DE AUTOMATIZACIÓN Y DESPLIEGUE

Para garantizar una experiencia en un solo clic ("cero configuración"), se incluyen scripts batch en la raíz del proyecto:

#### 8.1 `INICIAR_SISTEMA.bat`
1. **Limpieza de Puertos:** Verifica y libera automáticamente los puertos `3001` (Backend) y `5173` (Frontend).
2. **Detección de Java:** Evalúa `sistema-biblioteca/runtime/bin/java.exe` o el runtime del sistema (`PATH`).
3. **Arranque del Backend:** Inicia `sistema-biblioteca/app/biblioteca.jar` en segundo plano.
4. **Arranque del Frontend:** Inicia el servidor Vite con `npm run dev`.
5. **Sondeo Activo de Salud:** Verifica `http://localhost:5173` hasta confirmar código `200 OK`.
6. **Lanzamiento:** Abre la aplicación en el navegador predeterminado.

#### 8.2 `DETENER_SISTEMA.bat`
- Termina ordenadamente los procesos que escuchan en los puertos `3001` y `5173` mediante PowerShell.

#### 8.3 `COMPILAR.bat`
- Script de compilación integral que compila el Fat JAR del backend mediante Maven (`mvn clean package`) actualizando `app/biblioteca.jar`, y empaqueta el frontend con Vite (`npm run build`).

---

### 9. GUÍA DE COMPILACIÓN, MANTENIMIENTO Y DESPLIEGUE

#### Requisitos Previos
- **Java Development Kit (JDK):** Versión 17 o superior.
- **Node.js:** Versión 18 o superior con `npm`.
- **Apache Maven:** Versión 3.8 o superior.

#### 9.1 Compilación Completa (1 Clic)
Ejecute en la raíz del proyecto:
```bat
COMPILAR.bat
```

#### 9.2 Compilación Manual del Backend
Desde `sistema-biblioteca/java-core/`:
```bash
mvn clean package
```
*Nota:* El plugin `maven-shade-plugin` en `pom.xml` está configurado para escribir el JAR directamente en `../app/biblioteca.jar`, asegurando que los scripts de arranque ejecuten inmediatamente la última versión compilada.

#### 9.3 Compilación del Frontend
Desde `sistema-biblioteca/frontend/`:
```bash
# Instalación de dependencias
npm install

# Servidor de desarrollo con Hot Module Reloading (HMR)
npm run dev

# Empaquetado optimizado para producción
npm run build
```

#### 9.4 Mantenimiento y Respaldo de la Base de Datos
- La base de datos reside en el archivo SQLite único `sistema-biblioteca/database/biblioteca.db`.
- Para realizar copias de seguridad (backups), copie dicho archivo con el sistema detenido.
- Para reiniciar la base de datos a un estado de fábrica, elimine el archivo `biblioteca.db`; el backend generará automáticamente las tablas e índices limpios en el próximo arranque.
