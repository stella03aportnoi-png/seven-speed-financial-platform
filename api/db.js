import pg from 'pg';
const { Pool } = pg;

// Conecta automaticamente com as chaves que a Vercel injetou
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  // Ler os dados (quando a plataforma abre)
  if (req.method === 'GET') {
    const { key } = req.query;
    try {
      const { rows } = await pool.query('SELECT data FROM workspace_data WHERE id = $1', [key]);
      return res.status(200).json({ value: rows.length > 0 ? rows[0].data : null });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Gravar os dados (quando alguém adiciona ou edita algo)
  if (req.method === 'POST') {
    const { key, value } = req.body;
    try {
      await pool.query(
        `INSERT INTO workspace_data (id, data) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
        [key, JSON.stringify(value)]
      );
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}