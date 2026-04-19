# Mejoras opcionales

- [ ] Buscar canciones
  Objetivo: permitir encontrar una pista concreta sin salir del dashboard y lanzarla directamente en Spotify.
  Estado actual / dependencias: hoy el widget solo controla la reproduccion actual y la cola; haria falta una UI de busqueda y soporte backend para consultar resultados y reproducir la pista elegida.
  Complejidad: media.

- [ ] Explorar o ampliar la cola
  Objetivo: mejorar la experiencia de navegacion de la cola con mas contexto o acciones rapidas desde tamaños distintos.
  Estado actual / dependencias: la cola ya existe en la variante `3x3`; esta mejora deberia centrarse en llevar una vista resumida a tamaños menores o anadir acciones extra como refrescar, reordenar o saltar con mas contexto.
  Complejidad: media.

- [ ] Anadir canciones a playlists
  Objetivo: guardar rapidamente la cancion actual o una pista encontrada en una playlist del usuario.
  Estado actual / dependencias: requiere backend adicional para listar playlists y anadir pistas, una seleccion clara de destino en la UI y probablemente ampliar los scopes de Spotify concedidos a la integracion.
  Complejidad: alta.

- [ ] Anadir un modo compacto `1x1`
  Objetivo: ofrecer una version minima del widget para dashboards con poco espacio, mostrando solo el estado principal y una accion clave.
  Estado actual / dependencias: las guias del dashboard ya contemplan `1x1`; haria falta una entrada nueva y una UI muy reducida que priorice portada, estado de reproduccion y play/pause.
  Complejidad: facil.

- [ ] Anadir letras mediante un proveedor externo
  Objetivo: mostrar la letra sincronizada o una vista resumida de la cancion actual sin abandonar el widget.
  Estado actual / dependencias: depende de un proveedor externo como Genius o Musixmatch, del matching correcto entre pista y letra, y de resolver estados donde no haya letra disponible o falle la consulta.
  Complejidad: alta.

- [ ] Anadir soporte para mas servicios de musica
  Objetivo: reutilizar la experiencia del widget con proveedores adicionales como Apple Music o YouTube Music.
  Estado actual / dependencias: es una mejora de largo plazo que exige abstraer la integracion actual de Spotify tanto en frontend como en backend, redefinir capacidades comunes y adaptar autenticacion, estado y controles por proveedor.
  Complejidad: muy alta.
