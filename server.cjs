const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());


function formatear({ _id, ...resto }) {
  return { id: _id.toString(), ...resto };
}

const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü ]+$/;

const FORMATO_PLACA = /^[A-Z]{3}\d{3}$/;

function limpiar(valor) {
  return typeof valor === 'string' ? valor.trim() : valor;
}


function validarVehiculo(datos) {
  const d = datos || {};
  const errores = [];

  const marca = limpiar(d.marca);
  const modelo = limpiar(d.modelo);
  const placa = typeof d.placa === 'string' ? d.placa.trim().toUpperCase() : d.placa;
  const anio = d.anio;
  const anioMaximo = new Date().getFullYear() + 1;

  if (typeof marca !== 'string' || !SOLO_LETRAS.test(marca)) {
    errores.push('La marca es obligatoria y solo puede tener letras y espacios');
  }
  if (typeof modelo !== 'string' || modelo.length === 0) {
    errores.push('El modelo es obligatorio');
  }
  if (!Number.isInteger(anio) || anio < 1950 || anio > anioMaximo) {
    errores.push(`El año debe ser un número entero entre 1950 y ${anioMaximo}`);
  }
  if (typeof placa !== 'string' || !FORMATO_PLACA.test(placa)) {
    errores.push('La placa debe tener el formato ABC123');
  }

  const vehiculo = {
    id: new ObjectId().toString(),
    marca,
    modelo,
    anio,
    placa,
  };

  return { errores, vehiculo };
}


function validarConcesionario(datos) {
  const errores = [];

  const nombre = limpiar(datos.nombre);
  const ciudad = limpiar(datos.ciudad);
  const vehiculos = datos.vehiculos ?? [];

  if (typeof nombre !== 'string' || nombre.length < 3 || nombre.length > 60) {
    errores.push('El nombre es obligatorio y debe tener entre 3 y 60 caracteres');
  }
  if (typeof ciudad !== 'string' || !SOLO_LETRAS.test(ciudad)) {
    errores.push('La ciudad es obligatoria y solo puede tener letras y espacios');
  }
  if (!Array.isArray(vehiculos)) {
    errores.push('vehiculos debe ser un arreglo');
    return { errores };
  }

  const vehiculosLimpios = [];
  vehiculos.forEach((v, i) => {
    const resultado = validarVehiculo(v);
    resultado.errores.forEach((e) => errores.push(`Vehículo ${i + 1}: ${e}`));
    vehiculosLimpios.push(resultado.vehiculo);
  });

  return { errores, concesionario: { nombre, ciudad, vehiculos: vehiculosLimpios } };
}


app.get('/', (req, res) => {
  res.status(200).json({ message: 'API healthy' });
});

//Listar concesionarios
app.get('/concesionarios', async (req, res) => {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);
    const collection = db.collection('concesionarios');

    const documentos = await collection.find({}).toArray();
    res.status(200).json(documentos.map(formatear));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'No se pudieron listar los concesionarios' });
  } finally {
    await client.close();
  }
});

// Consultar un concesionario por ID
app.get('/concesionarios/:id', async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'ID no válido' });
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);
    const collection = db.collection('concesionarios');

    const documento = await collection.findOne({ _id: new ObjectId(req.params.id) });
    if (!documento) {
      return res.status(404).json({ message: 'Concesionario no encontrado' });
    }
    res.status(200).json(formatear(documento));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'No se pudo consultar el concesionario' });
  } finally {
    await client.close();
  }
});

// Crear un concesionario
app.post('/concesionarios', async (req, res) => {
    const { errores, concesionario } = validarConcesionario(req.body || {});
    if (errores.length > 0) {
        return res.status(400).json({ message: 'Datos inválidos', errores });
    }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);
    const collection = db.collection('concesionarios');
  

    const result = await collection.insertOne(concesionario);
    res.status(201).json({
        id: result.insertedId.toString(),
        nombre: concesionario.nombre,
        ciudad: concesionario.ciudad,
        vehiculos: concesionario.vehiculos
  });
} catch (error) {
  console.error(error);
  res.status(500).json({ message: 'No se pudo crear el concesionario' });
} finally {
  await client.close();
}
});

//Actualizar un concesionario
app.put('/concesionarios/:id', async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'ID no valido' });
    }

    const { errores, concesionario } = validarConcesionario(req.body || {});
    if (errores.length > 0) {
        return res.status(400).json({ message: 'Datos invalidos', errores });
    }

    const client = new MongoClient(process.env.MONGODB_URI);

    try {
        await client.connect();
        const db = client.db(process.env.MONGODB_DB);
        const collection = db.collection('concesionarios');

        const result = await collection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: concesionario }
        );
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Concesionario no encontrado' });
        }
        res.status(200).json({ id: req.params.id, ...concesionario });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'No se pudo actualizar el concesionario' });
    } finally {
        await client.close();
    }
});

//Eliminar un concesionario
app.delete('/concesionarios/:id', async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'ID no valido' });
    }

    const client = new MongoClient(process.env.MONGODB_URI);

    try {
        await client.connect();
        const db = client.db(process.env.MONGODB_DB);
        const collection = db.collection('concesionarios');

        const result = await collection.deleteOne({ _id: new ObjectId(req.params.id) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Concesionario no encontrado' });
        }
        res.status(204).end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'No se pudo eliminar el concesionario' });
    } finally {
        await client.close();
    }
});

// Agregar UN vehículo embebido a un concesionario
app.post('/concesionarios/:id/vehiculos', async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'ID no valido' });
  }

  const { errores, vehiculo } = validarVehiculo(req.body);
  if (errores.length > 0) {
    return res.status(400).json({ message: 'Datos invalidos', errores });
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);
    const collection = db.collection('concesionarios');

    const result = await collection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $push: { vehiculos: vehiculo } }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Concesionario no encontrado' });
    }
    res.status(201).json(vehiculo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'No se pudo agregar el vehículo' });
  } finally {
    await client.close();
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor disponible en http://localhost:${PORT}`);
  });
}

module.exports = app;