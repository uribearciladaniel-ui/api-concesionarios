const express = require('express');
const { MongoClient } = require('mongodb');   // ← NUEVO: driver de MongoDB

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ← NUEVO: convierte un documento de MongoDB al formato de la API (_id → id)
function formatear({ _id, ...resto }) {
  return { id: _id.toString(), ...resto };
}

// Ruta de prueba
app.get('/', (req, res) => {
  res.status(200).json({ message: 'API de concesionarios funcionando' });
});

// ← NUEVO: Listar concesionarios
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

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor disponible en http://localhost:${PORT}`);
  });
}

module.exports = app;