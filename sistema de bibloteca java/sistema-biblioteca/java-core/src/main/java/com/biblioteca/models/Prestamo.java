package com.biblioteca.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDate;

@JsonIgnoreProperties(ignoreUnknown = true)
public class Prestamo {
    private int id;
    private int usuarioId;
    private int libroId;
    private LocalDate fechaPrestamo;
    private LocalDate fechaDevolucion;
    private boolean devuelto;
    private double precio;

    private String nombreUsuario;
    private String tituloLibro;

    public Prestamo() {
    }

    public Prestamo(int id, int usuarioId, int libroId, LocalDate fechaPrestamo, LocalDate fechaDevolucion) {
        this.id = id;
        this.usuarioId = usuarioId;
        this.libroId = libroId;
        this.fechaPrestamo = fechaPrestamo;
        this.fechaDevolucion = fechaDevolucion;
        this.precio = 0.0;
    }

    public Prestamo(int id, int usuarioId, int libroId, LocalDate fechaPrestamo, LocalDate fechaDevolucion, boolean devuelto, String nombreUsuario, String tituloLibro) {
        this(id, usuarioId, libroId, fechaPrestamo, fechaDevolucion, devuelto, nombreUsuario, tituloLibro, 0.0);
    }

    public Prestamo(int id, int usuarioId, int libroId, LocalDate fechaPrestamo, LocalDate fechaDevolucion, boolean devuelto, String nombreUsuario, String tituloLibro, double precio) {
        this.id = id;
        this.usuarioId = usuarioId;
        this.libroId = libroId;
        this.fechaPrestamo = fechaPrestamo;
        this.fechaDevolucion = fechaDevolucion;
        this.devuelto = devuelto;
        this.nombreUsuario = nombreUsuario;
        this.tituloLibro = tituloLibro;
        this.precio = precio;
    }

    // logica de negocio en java: calcula el estado automaticamente
    public String getEstado() {
        if (devuelto) {
            return "Devuelto";
        }
        if (fechaDevolucion != null && LocalDate.now().isAfter(fechaDevolucion)) {
            return "Vencido";
        }
        return "Activo";
    }

    public boolean isDevuelto() {
        return devuelto;
    }

    public void setDevuelto(boolean devuelto) {
        this.devuelto = devuelto;
    }

    public int getId() {
        return id;
    }

    public int getUsuarioId() {
        return usuarioId;
    }

    public int getLibroId() {
        return libroId;
    }

    public LocalDate getFechaPrestamo() {
        return fechaPrestamo;
    }

    public LocalDate getFechaDevolucion() {
        return fechaDevolucion;
    }

    public String getNombreUsuario() {
        return nombreUsuario;
    }

    public String getTituloLibro() {
        return tituloLibro;
    }

    public void setId(int id) {
        this.id = id;
    }

    public void setUsuarioId(int usuarioId) {
        this.usuarioId = usuarioId;
    }

    public void setLibroId(int libroId) {
        this.libroId = libroId;
    }

    public void setFechaPrestamo(LocalDate fechaPrestamo) {
        this.fechaPrestamo = fechaPrestamo;
    }

    public void setFechaDevolucion(LocalDate fechaDevolucion) {
        this.fechaDevolucion = fechaDevolucion;
    }

    public void setNombreUsuario(String nombreUsuario) {
        this.nombreUsuario = nombreUsuario;
    }

    public void setTituloLibro(String tituloLibro) {
        this.tituloLibro = tituloLibro;
    }

    public double getPrecio() {
        return precio;
    }

    public void setPrecio(double precio) {
        this.precio = precio;
    }
}
