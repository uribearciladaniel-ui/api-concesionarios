# CRUD de concesionarios y vehículos

API REST JSON con Node.js, Express, pnpm y MongoDB (driver oficial `mongodb`, sin Mongoose). Gestiona concesionarios con sus vehículos embebidos e incluye validación de datos de entrada.

## Modelo de datos

<img width="841" height="363" alt="image" src="https://github.com/user-attachments/assets/83fbefd0-9f04-4905-9d3e-b2ab428421cc" />

La API tiene dos modelos con relación **1:N**: un concesionario tiene muchos vehículos, embebidos como un arreglo dentro del documento del concesionario. No existe una colección independiente de vehículos. Los concesionarios se guardan en la colección `concesionarios` de MongoDB.

```json
{
  "id": "507f1f77bcf86cd799439011",
  "nombre": "AutoEje Norte",
  "ciudad": "Bogotá",
  "vehiculos": [
    {
      "id": "6650a1f2c3d4e5f6a7b8c9d0",
      "marca": "Mazda",
      "modelo": "CX-30",
      "anio": 2024,
      "placa": "ABC123"
    }
  ]
}
```

### Concesionario

- `id`: string generado a partir del `_id` de MongoDB (`ObjectId`). La API expone `id`, no `_id`, y lo conserva al actualizar.
- `nombre`: obligatorio, entre 3 y 60 caracteres después de quitar espacios al inicio y al final.
- `ciudad`: obligatoria; solo letras (incluidas tildes, `ñ` y `ü`) y espacios.
- `vehiculos`: arreglo de vehículos. Si se omite en POST o PUT, se guarda como `[]`.

### Vehículo

- `id`: lo **genera el servidor** (un `ObjectId` convertido a string). Si el cliente envía un `id`, se ignora.
- `marca`: obligatoria; solo letras (incluidas tildes, `ñ` y `ü`) y espacios.
- `modelo`: obligatorio y no vacío (admite números y guiones, por ejemplo `CX-30`).
- `anio`: número entero entre 1950 y el año actual + 1.
- `placa`: formato colombiano de carro `ABC123` (tres letras y tres dígitos). Se convierte a mayúsculas antes de validar, así que `abc123` es válido.

Todos los campos de texto se limpian con `trim`: se guardan sin espacios al inicio ni al final.

## Contrato de la API

Envía `Content-Type: application/json` en POST y PUT. Todas las respuestas son JSON, excepto el DELETE exitoso, que no lleva cuerpo.

| Método | Ruta | Resultado esperado |
| --- | --- | --- |
| GET | `/` | `200`: `{ "message": "API healthy" }` |
| GET | `/concesionarios` | `200`: arreglo de concesionarios; inicialmente `[]` |
| GET | `/concesionarios/:id` | `200`: concesionario; `400` si el ID no es válido; `404` si no existe |
| POST | `/concesionarios` | `201`: concesionario creado; `400` si los datos no son válidos |
| PUT | `/concesionarios/:id` | `200`: concesionario actualizado; `400` si el ID o los datos no son válidos; `404` si no existe |
| DELETE | `/concesionarios/:id` | `204`: sin cuerpo; `400` si el ID no es válido; `404` si no existe |
| POST | `/concesionarios/:id/vehiculos` | `201`: vehículo agregado; `400` si el ID o los datos no son válidos; `404` si el concesionario no existe |

- **POST `/concesionarios`** recibe `nombre`, `ciudad` y opcionalmente `vehiculos`.
- **PUT `/concesionarios/:id`** recibe `nombre`, `ciudad` y `vehiculos`, y reemplaza esos tres campos manteniendo el ID. Para modificar o eliminar vehículos, envía el arreglo completo actualizado.
- **POST `/concesionarios/:id/vehiculos`** agrega **un solo vehículo embebido** sin reenviar el concesionario completo. Recibe `marca`, `modelo`, `anio` y `placa`, lo añade al final del arreglo con el operador `$push` de MongoDB y devuelve el vehículo creado con su `id`.

### Formato de errores

ID con formato inválido (`400`) o recurso inexistente (`404`):

```json
{ "message": "Concesionario no encontrado" }
```

Datos inválidos (`400`), con un mensaje por cada problema encontrado:

```json
{
  "message": "Datos inválidos",
  "errores": [
    "La ciudad es obligatoria y solo puede tener letras y espacios",
    "Vehículo 1: La placa debe tener el formato ABC123"
  ]
}
```

Los errores de vehículos dentro de un concesionario indican su posición en el arreglo (`Vehículo 1`, `Vehículo 2`, …).

## 1. Requisitos

- Node.js **22.21 o superior**.
- pnpm **10 o superior**.
- Docker Engine **24 o superior**, o Docker Desktop con el motor iniciado.
- Puerto **27017** libre para MongoDB y **3000** para la API.
- Git y curl.

```bash
node --version
pnpm --version
docker version
```

Clona el repositorio e instala las dependencias:

```bash
git clone <URL-DEL-REPOSITORIO>
cd <CARPETA-DEL-PROYECTO>
pnpm install
```

Los comandos siguientes se ejecutan desde la raíz del proyecto.

## 2. Lanzar MongoDB en Docker

```bash
docker run --detach \
  --name ucp-mongo \
  --publish 127.0.0.1:27017:27017 \
  --volume ucp-mongo-data:/data/db \
  mongodb/mongodb-community-server:9.0.4-ubuntu2204
```

El volumen conserva los datos entre reinicios. Este entorno no usa autenticación y solo escucha en la interfaz local.

Comprueba que esté listo (debe mostrar `ok: 1`):

```bash
docker exec ucp-mongo mongosh --quiet --eval 'db.runCommand({ ping: 1 })'
```

En sesiones posteriores usa `docker stop ucp-mongo` y `docker start ucp-mongo`; no repitas `docker run` si el contenedor ya existe.

## 3. Configurar la conexión

```bash
cp .env.example .env
```

Contenido de `.env`:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=ucp_concesionarios
PORT=3000
```

`.env` está ignorado por Git. Los scripts cargan estas variables con la opción nativa de Node `--env-file-if-exists=.env`, sin `dotenv`.

## 4. Iniciar la API

```bash
pnpm dev
```

La API queda disponible en `http://localhost:3000`. Verifica con:

```bash
curl -i http://localhost:3000/
```

## 5. Probar todos los endpoints con curl

### Crear y listar

Crear un concesionario con un vehículo:

```bash
curl -i -X POST http://localhost:3000/concesionarios \
  -H 'Content-Type: application/json' \
  -d '{"nombre":"AutoEje Norte","ciudad":"Bogotá","vehiculos":[{"marca":"Mazda","modelo":"CX-30","anio":2024,"placa":"ABC123"}]}'
```

Crear otro sin vehículos y listar ambos:

```bash
curl -i -X POST http://localhost:3000/concesionarios \
  -H 'Content-Type: application/json' \
  -d '{"nombre":"Motores del Sur","ciudad":"Cali"}'

curl -i http://localhost:3000/concesionarios
```

### Consultar, agregar vehículo, actualizar y eliminar

Copia el `id` devuelto por POST y guárdalo en la variable `ID`:

```bash
ID='pega-aqui-el-id-devuelto'

# Consultar
curl -i "http://localhost:3000/concesionarios/$ID"

# Agregar un vehículo embebido
curl -i -X POST "http://localhost:3000/concesionarios/$ID/vehiculos" \
  -H 'Content-Type: application/json' \
  -d '{"marca":"Renault","modelo":"Duster","anio":2023,"placa":"xyz789"}'

# Consultar de nuevo: ahora aparecen los dos vehículos
curl -i "http://localhost:3000/concesionarios/$ID"

# Actualizar (reemplaza nombre, ciudad y vehículos)
curl -i -X PUT "http://localhost:3000/concesionarios/$ID" \
  -H 'Content-Type: application/json' \
  -d '{"nombre":"AutoEje Norte Premium","ciudad":"Bogotá","vehiculos":[]}'

# Eliminar
curl -i -X DELETE "http://localhost:3000/concesionarios/$ID"
```

La variable se define sin `$` (`ID='...'`) y se usa con `$` (`$ID`). Las URLs van entre comillas dobles para que la terminal reemplace `$ID` por su valor.

### Tildes, ñ y trim

Los espacios sobrantes se eliminan y la placa queda en mayúsculas (`JKL456`):

```bash
curl -i -X POST http://localhost:3000/concesionarios \
  -H 'Content-Type: application/json' \
  -d '{"nombre":"  Autos Peña  ","ciudad":" Cañasgordas ","vehiculos":[{"marca":"Citroën","modelo":"C3","anio":2022,"placa":" jkl456 "}]}'
```

### Errores

Datos inválidos (`400` con la lista de errores):

```bash
curl -i -X POST http://localhost:3000/concesionarios \
  -H 'Content-Type: application/json' \
  -d '{"nombre":"AB","ciudad":"Bogotá 2","vehiculos":[{"marca":"Kia","modelo":"","anio":1900,"placa":"123ABC"}]}'
```

ID con formato inválido (`400`):

```bash
curl -i http://localhost:3000/concesionarios/abc
```

Concesionario inexistente (`404`):

```bash
curl -i http://localhost:3000/concesionarios/507f1f77bcf86cd799439011
```

### Ver los datos en MongoDB

```bash
docker exec ucp-mongo mongosh ucp_concesionarios --quiet --eval 'db.concesionarios.find().toArray()'
```
