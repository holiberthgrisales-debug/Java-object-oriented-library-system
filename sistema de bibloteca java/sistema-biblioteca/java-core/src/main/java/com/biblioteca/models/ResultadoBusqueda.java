package com.biblioteca.models;

public class ResultadoBusqueda {
    private String tipo;
    private String tipoBadge;
    private int id;
    private String principal;
    private String detalle;
    private String estadoUbicacion;
    private String accionTipo; // "libro", "usuario", "prestamo_activo", "prestamo_devuelto"
    private int accionId;

    public ResultadoBusqueda() {
    }

    public ResultadoBusqueda(String tipo, String tipoBadge, int id, String principal, String detalle, String estadoUbicacion, String accionTipo, int accionId) {
        this.tipo = tipo;
        this.tipoBadge = tipoBadge;
        this.id = id;
        this.principal = principal;
        this.detalle = detalle;
        this.estadoUbicacion = estadoUbicacion;
        this.accionTipo = accionTipo;
        this.accionId = accionId;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getTipoBadge() {
        return tipoBadge;
    }

    public void setTipoBadge(String tipoBadge) {
        this.tipoBadge = tipoBadge;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getPrincipal() {
        return principal;
    }

    public void setPrincipal(String principal) {
        this.principal = principal;
    }

    public String getDetalle() {
        return detalle;
    }

    public void setDetalle(String detalle) {
        this.detalle = detalle;
    }

    public String getEstadoUbicacion() {
        return estadoUbicacion;
    }

    public void setEstadoUbicacion(String estadoUbicacion) {
        this.estadoUbicacion = estadoUbicacion;
    }

    public String getAccionTipo() {
        return accionTipo;
    }

    public void setAccionTipo(String accionTipo) {
        this.accionTipo = accionTipo;
    }

    public int getAccionId() {
        return accionId;
    }

    public void setAccionId(int accionId) {
        this.accionId = accionId;
    }
}
