package com.biblioteca.models;

public class LibroDigital extends Libro {
    private String formato;

    public LibroDigital() {
        super();
    }

    public LibroDigital(int id, String titulo, String autor, String isbn, int anioPublicacion, String genero,
            int cantidadDisponible, String formato, String urlDescarga) {
        super(id, titulo, autor, isbn, anioPublicacion, genero, cantidadDisponible, null, urlDescarga);
        this.formato = formato;
    }

    public LibroDigital(int id, String titulo, String autor, String isbn, int anioPublicacion, String genero,
            int cantidadDisponible, String formato, String urlDescarga, String estado, Integer anioEdicion, String edicion) {
        super(id, titulo, autor, isbn, anioPublicacion, genero, cantidadDisponible, null, urlDescarga, estado, anioEdicion, edicion);
        this.formato = formato;
    }

    public String getFormato() {
        return formato;
    }

    public void setFormato(String formato) {
        this.formato = formato;
    }

    @Override
    public String getTipoLibro() {
        return "DIGITAL";
    }

    // urldescarga se hereda de libro — no se redeclara para evitar shadowing
}
