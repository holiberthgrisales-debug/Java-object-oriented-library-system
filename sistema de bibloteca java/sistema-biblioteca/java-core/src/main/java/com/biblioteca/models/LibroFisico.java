package com.biblioteca.models;

public class LibroFisico extends Libro {

    public LibroFisico() {
        super();
    }

    public LibroFisico(int id, String titulo, String autor, String isbn, int anioPublicacion, String genero,
            int cantidadDisponible, String ubicacion) {
        super(id, titulo, autor, isbn, anioPublicacion, genero, cantidadDisponible, ubicacion, null);
    }

    public LibroFisico(int id, String titulo, String autor, String isbn, int anioPublicacion, String genero,
            int cantidadDisponible, String ubicacion, String estado, Integer anioEdicion, String edicion) {
        super(id, titulo, autor, isbn, anioPublicacion, genero, cantidadDisponible, ubicacion, null, estado, anioEdicion, edicion);
    }

    @Override
    public String getTipoLibro() {
        return "FISICO";
    }

    // ubicacion se hereda de libro — no se redeclara para evitar shadowing
}
