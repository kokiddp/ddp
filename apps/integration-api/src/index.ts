import express from 'express';

const app = express();
const port = Number(process.env.PORT) || 3100;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ddp-integration-api' });
});

// Voice token endpoint placeholder
app.post('/voice/token', (_req, res) => {
  // TODO: Implement LiveKit token issuance with proper auth verification
  res.status(501).json({ error: 'Not implemented' });
});

app.listen(port, () => {
  console.log(`[DDP] Integration API listening on port ${port}`);
});
