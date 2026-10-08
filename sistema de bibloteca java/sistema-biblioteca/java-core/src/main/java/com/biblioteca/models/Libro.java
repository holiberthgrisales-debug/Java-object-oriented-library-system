package com.biblioteca.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonTypeInfo(
        use = JsonTypeInfo.Id.NAME,
        include = JsonTypeInfo.As.PROPERTY,
        property = "tipoLibro",
        defaultImpl = Libro.class,
        visible = true
)
@JsonSubTypes({
        @JsonSubTypes.Type(value = LibroDigital.class, name = "DIGITAL"),
        @JsonSubTypes.Type(value = LibroFisico.class, name = "FISICO"),
        @JsonSubTypes.Type(value = Libro.class, name = "GENERAL")
})
public class Libro {
    private int id;
    private String titulo;
    private String autor;
    private String isbn;
    private int anioPublicacion;
    private String genero;
    private int cantidadDisponible;
    private String ubicacion;
    private String urlDescarga;
    private String estado = "Disponible";
    private Integer anioEdicion;
    private String edicion;

    // constructor vacio necesario para javalin porque jackson deserializa json
    public Libro() {
    }

    public Libro(int id, String titulo, String autor, String isbn, int anioPublicacion, String genero,
            int cantidadDisponible) {
        this.id = id;
        this.titulo = titulo;
        this.autor = autor;
        this.isbn = isbn;
        this.anioPublicacion = anioPublicacion;
        this.genero = genero;
        this.cantidadDisponible = cantidadDisponible;
    }

    public Libro(int id, String titulo, String autor, String isbn, int anioPublicacion, String genero,
            int cantidadDisponible, String ubicacion, String urlDescarga) {
        this.id = id;
        this.titulo = titulo;
        this.autor = autor;
        this.isbn = isbn;
        this.anioPublicacion = anioPublicacion;
        this.genero = genero;
        this.cantidadDisponible = cantidadDisponible;
        this.ubicacion = ubicacion;
        this.urlDescarga = urlDescarga;
    }

    public Libro(int id, String titulo, String autor, String isbn, int anioPublicacion, String genero,
            int cantidadDisponible, String ubicacion, String urlDescarga, String estado, Integer anioEdicion,
            String edicion) {
        this.id = id;
        this.titulo = titulo;
        this.autor = autor;
        this.isbn = isbn;
        this.anioPublicacion = anioPublicacion;
        this.genero = genero;
        this.cantidadDisponible = cantidadDisponible;
        this.ubicacion = ubicacion;
        this.urlDescarga = urlDescarga;
        this.estado = (estado != null && !estado.trim().isEmpty()) ? estado : "Disponible";
        this.anioEdicion = anioEdicion;
        this.edicion = edicion;
    }

    // getters (necesarios para que javalin y jackson puedan serializar y leer los datos)
    public int getId() {
        return id;
    }

    public String getTitulo() {
        return titulo;
    }

    public String getAutor() {
        return autor;
    }

    public String getIsbn() {
        return isbn;
    }

    public int getAnioPublicacion() {
        return anioPublicacion;
    }

    public String getGenero() {
        return genero;
    }

    public int getCantidadDisponible() {
        return cantidadDisponible;
    }

    public String getUbicacion() {
        return ubicacion;
    }

    public String getUrlDescarga() {
        return urlDescarga;
    }

    public String getEstado() {
        return estado;
    }

    public Integer getAnioEdicion() {
        return anioEdicion;
    }

    public String getEdicion() {
        return edicion;
    }

    // setters
    public void setId(int id) {
        this.id = id;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public void setAutor(String autor) {
        this.autor = autor;
    }

    public void setIsbn(String isbn) {
        this.isbn = isbn;
    }

    public void setAnioPublicacion(int anioPublicacion) {
        this.anioPublicacion = anioPublicacion;
    }

    public void setGenero(String genero) {
        this.genero = genero;
    }

    public void setCantidadDisponible(int cantidadDisponible) {
        this.cantidadDisponible = cantidadDisponible;
    }

    public void setUbicacion(String ubicacion) {
        this.ubicacion = ubicacion;
    }

    public void setUrlDescarga(String urlDescarga) {
        this.urlDescarga = urlDescarga;
    }

    public void setEstado(String estado) {
        this.estado = (estado != null && !estado.trim().isEmpty()) ? estado : "Disponible";
    }

    public void setAnioEdicion(Integer anioEdicion) {
        this.anioEdicion = anioEdicion;
    }

    public void setEdicion(String edicion) {
        this.edicion = edicion;
    }

    public String getTipoLibro() {
        return "GENERAL";
    }

    public void setTipoLibro(String tipoLibro) {
        // no-op para deserializacion
    }
}
