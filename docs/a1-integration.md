# Entrega A1 — mapa y personajes originales con el motor compartido

Base: main 74f9fd4 (PR #9 de A). Esta entrega conserva sus archivos originales y conecta arte y datos a la práctica local existente. A revisa y aplica el paquete en feat/visual-integration desde su cuenta.

## Incluido

Mapa base y coordenadas originales, importador repetible, PNG originales de los cuatro drones, física compartida alineada al metal, nodos y recogidas canónicas, metadatos/fixture v5, pruebas y documentación. Los controles PC/móvil y reglas de B se conservan. Las apariencias siguen sin atributos ni habilidades diferentes.

## Validación manual

1. Node 24: npm ci si faltan dependencias; npm run verify.
2. npm run dev; abrir http://127.0.0.1:5173. Se identifica como simulación local.
3. Revisar mapa completo y seguimiento 2×; comparar con el prototipo original de A.
4. Salir de las cuatro bahías. Activar Colisiones: las líneas deben seguir caras de pared, no sombras. Cambiar entre P1–P4, comprobar colores y ocho orientaciones.
5. Práctica de combate: P1 y P4 recogen un escudo al comenzar; seleccionar P2 y disparar hacia P1. Primer impacto bloqueado, siguientes hacen daño; muerte y respawn sin escudo.
6. Revisar el nodo activo y el aviso de próximo al final del intervalo. Los otros solo tienen el marcador decorativo de A.
7. Revisar dos pads en un móvil real cuando esté disponible. La simulación y las pruebas de escritorio no acreditan interacción simultánea con dos dedos.

## Siguiente trabajo

A2: adaptar HUD y efectos de A con datos reales. A3: pantallas funcionales de autenticación/salas/lobby/resultados. B conecta el Canvas a la red autoritativa y C termina sus correcciones de persistencia. El prototipo de A no sustituye el motor compartido ni incorpora sus bots, atributos o reglas de prueba. Esta entrega local no acredita todavía multijugador de navegador ni despliegue.
