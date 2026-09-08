# Historias de Usuario — Sprint 1: Difusión y Memoria Histórica

## Módulo de Difusión

1. Como **encargado de organismo**, quiero crear una publicación (texto + imagen opcional) asociada a mi organismo, para informar a la comunidad estudiantil sobre actividades o novedades.
2. Como **encargado de organismo**, quiero editar o eliminar las publicaciones que yo mismo creé, para corregir errores o retirar información desactualizada.
3. Como **administrador**, quiero ver y moderar todas las publicaciones de todos los organismos, para asegurar que el contenido sea apropiado.
4. Como **administrador**, quiero gestionar el listado de organismos (crear/editar/desactivar), para mantener actualizada la estructura de la parroquia.
5. Como **estudiante/visitante**, quiero ver las publicaciones filtradas por organismo, para enterarme solo de lo que me interesa.
6. Como **estudiante/visitante**, quiero ver el detalle completo de una publicación, para leer toda la información.

## Módulo de Memoria Histórica

7. Como **administrador**, quiero agregar un hito a la línea de tiempo (fecha, título, descripción, fotos), para preservar los momentos importantes de la parroquia.
8. Como **administrador**, quiero editar o eliminar un hito histórico, para corregir o quitar contenido erróneo.
9. Como **administrador**, quiero asociar testimonios de texto a un hito, para enriquecer el registro con relatos de la comunidad.
10. Como **estudiante/visitante**, quiero navegar la línea de tiempo de la memoria histórica, para conocer la historia de la parroquia.

## Nota de diseño

El sistema de autenticación con roles es formalmente parte del Sprint 2. Para no rediseñar el modelo de datos más adelante, `Publicacion` y `HitoHistorico` ya quedan relacionados a un modelo `Usuario` mínimo (id, nombre, rol) desde el Sprint 1, aunque el login funcional recién se implemente en el Sprint 2.
