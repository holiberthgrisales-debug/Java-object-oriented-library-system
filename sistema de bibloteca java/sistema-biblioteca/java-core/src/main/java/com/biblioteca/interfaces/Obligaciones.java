package com.biblioteca.interfaces;

import java.util.List;

// esto el polimorfismo no borrar

public interface Obligaciones<T> {
    void agregar(T elemento);

    T obtenerPorId(int id);

    List<T> obtenerTodos();

    void actualizar(T elemento);

    void eliminar(int id);
}
