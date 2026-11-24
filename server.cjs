const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());


function formatear({ _id, ...resto }) {
  return { id: _id.toString(), ...resto };
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
  const {nombre, ciudad, vehiculos = []} = req.body;
  const concesionario = { nombre, ciudad, vehiculos };

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
        return res.status(400).json({ message: 'ID no válido' });
    }

    const { nombre, ciudad, vehiculos = [] } = req.body;
    const concesionario = { nombre, ciudad, vehiculos };

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

app.delete('/concesionarios/:id', async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'ID no válido' });
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

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor disponible en http://localhost:${PORT}`);
  });
}

module.exports = app;