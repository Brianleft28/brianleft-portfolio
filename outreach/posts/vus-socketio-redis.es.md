# El llamado que se perdía entre pods

*Cómo escalar un sistema de tiempo real a varias réplicas de Kubernetes lo rompió de una forma que no dejaba nada en los logs — y qué me enseñó sobre el escalado horizontal.*

---

Construyo y opero VUS, un llamador de turnos para un municipio: tótems, pantallas de sala de espera, puestos de operador, impresión térmica. Funciona todo el día, de cara al público, y no se puede caer.

Con un solo pod andaba bien. Al escalar a varias réplicas en Kubernetes, los llamados empezaron a fallar **de forma intermitente**: un operador llamaba un turno y **algunas pantallas no se enteraban**. Sin error. Sin excepción. Nada en los logs. Qué pantalla se perdía qué llamado parecía puro azar.

## El diagnóstico

Socket.IO mantiene sus conexiones **en la memoria del proceso**. Con un pod alcanza — todos los clientes están conectados a la única instancia que los conoce a todos. Con varios pods, cada uno conoce solo a los clientes conectados a *él*.

Entonces, cuando un operador llamaba un turno y su request caía en el pod A, el evento se emitía solo a los clientes de A. Las pantallas conectadas al pod B seguían esperando algo que nunca iba a llegar. Y como el balanceador reparte, era pura suerte qué pantalla veía qué llamado.

El bug no estaba en la lógica del llamador. Era un supuesto: **el código guardaba estado en memoria que Kubernetes asume que los pods no tienen.** Kubernetes trata a las réplicas como intercambiables. Las mías no lo eran.

## La solución

- **Redis como canal pub/sub entre pods.** Cada instancia publica sus eventos y está suscrita a los del resto, así que emitir desde cualquier pod alcanza a todos los clientes, sin importar dónde estén conectados.
- El estado de las conexiones deja de vivir en la memoria de un solo proceso. Los pods pasan a ser **realmente intercambiables** — la premisa que Kubernetes ya asumía y que el código no estaba cumpliendo.

## La segunda forma de romperse — y es otra distinta

Con tres réplicas hay un **segundo** modo de falla que Redis no arregla. Antes de que exista el WebSocket, Socket.IO negocia la conexión con varias peticiones HTTP que tienen que caer **todas en la misma** réplica. Con el balanceador repartiendo, la segunda pega en un pod que no sabe nada de la primera, y la conexión falla de a ratos, sin patrón.

La salida de manual es pedirle al área de redes afinidad de sesión en el balanceador. La que tomé no depende de nadie: **el cliente se conecta directo por WebSocket y se le saca la negociación HTTP.** Antes de sacarla verifiqué que en la práctica ya elegía WebSocket igual — o sea que ese "fallback" no era una red de seguridad, era la única fuente del problema.

## Una decisión más de la que estoy convencido

Si Redis no responde o la URL está mal, **la API arranca igual** y lo avisa en el log. Antes no: un error de tipeo en una variable de entorno dejaba las tres réplicas sin levantar. Un tablero al que le falta un llamado se nota y se investiga; tres réplicas caídas es que no hay sistema. El precio es que degrada en silencio — así que el arranque dice explícitamente si el canal entre pods quedó activo. Esa línea es la única señal que hay.

## La lección

**Escalar horizontal no es solo levantar más réplicas.** Todo lo que estaba implícitamente en memoria —conexiones, sesiones, caché— hay que sacarlo afuera antes, o el sistema empieza a funcionar "a veces". Y "a veces" es el peor estado de falla que existe: sin error, sin log, solo usuarios que ya no le confían.

---

*Escribo estas cosas porque la parte interesante de la ingeniería rara vez es el camino feliz. Más en [brianleft.com](https://brianleft.com) — un portfolio que se navega como una terminal de Linux, con un asistente que responde desde estos mismos textos. Backend / sistemas, abierto a remoto.*
