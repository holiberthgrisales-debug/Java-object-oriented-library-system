package com.biblioteca.models;

import java.time.LocalDateTime;

public class Auditoria {
    private int id;
    private String entidad; // "libro", "usuario", "prestamo"
    private Integer entidadId;
    private String accion;  // "crear", "modificar", "eliminar", "prestar", "devolver"
    private String usuarioResponsable;
    private String detalles;
    private String fechaRegistro;

    public Auditoria() {
    }

    public Auditoria(int id, String entidad, Integer entidadId, String accion, String usuarioResponsable, String detalles, String fechaRegistro) {
        this.id = id;
        this.entidad = entidad;
        this.entidadId = entidadId;
        this.accion = accion;
        this.usuarioResponsable = usuarioResponsable != null ? usuarioResponsable : "Sistema / Administrador";
        this.detalles = detalles;
        this.fechaRegistro = fechaRegistro != null ? fechaRegistro : LocalDateTime.now().toString();
    }

    public Auditoria(String entidad, Integer entidadId, String accion, String usuarioResponsable, String detalles) {
        this(0, entidad, entidadId, accion, usuarioResponsable, detalles, LocalDateTime.now().toString());
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getEntidad() {
        return entidad;
    }

    public void setEntidad(String entidad) {
        this.entidad = entidad;
    }

    public Integer getEntidadId() {
        return entidadId;
    }

    public void setEntidadId(Integer entidadId) {
        this.entidadId = entidadId;
    }

    public String getAccion() {
        return accion;
    }

    public void setAccion(String accion) {
        this.accion = accion;
    }

    public String getUsuarioResponsable() {
        return usuarioResponsable;
    }

    public void setUsuarioResponsable(String usuarioResponsable) {
        this.usuarioResponsable = usuarioResponsable;
    }

    public String getDetalles() {
        return detalles;
    }

    public void setDetalles(String detalles) {
        this.detalles = detalles;
    }

    public String getFechaRegistro() {
        return fechaRegistro;
    }

    public void setFechaRegistro(String fechaRegistro) {
        this.fechaRegistro = fechaRegistro;
    }
}
