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

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor disponible en http://localhost:${PORT}`);
  });
}

module.exports = app;