import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { key } = req.query;
    try {
      // Define a tabela com base na origem do pedido
      const table = key === 'seven-speed-sponsorship-data' ? 'captacao_data' : 'workspace_data';
      
      const { rows } = await pool.query(`SELECT data FROM ${table} WHERE id = $1`, [key]);
      return res.status(200).json({ value: rows.length > 0 ? rows[0].data : null });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    const { key, value } = req.body;
    try {
      // Define a tabela com base na origem do pedido
      const table = key === 'seven-speed-sponsorship-data' ? 'captacao_data' : 'workspace_data';
      
      const updateQuery = table === 'captacao_data' 
        ? `INSERT INTO ${table} (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, last_updated = CURRENT_TIMESTAMP`
        : `INSERT INTO ${table} (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`;

      await pool.query(updateQuery, [key, JSON.stringify(value)]);
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}