import 'dotenv/config';
import app from '../app';

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`Mega Practicum running on http://localhost:${PORT}`);
  console.log(`UVU:  http://localhost:${PORT}/uvu/`);
  console.log(`UofU: http://localhost:${PORT}/uofu/`);
});
