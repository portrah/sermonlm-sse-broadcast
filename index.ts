import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const sessions = new Map<string, Set<Response>>();

app.get('/health', (req, res) => {
    res.json({ status: 'ok', sessions: sessions.size });
});

app.post('/broadcast/:sessionCode', (req: Request, res: Response) => {
    const { sessionCode } = req.params;
    const clients = sessions.get(sessionCode);

           if (clients && clients.size > 0) {
                 const data = `data: ${JSON.stringify(req.body)}\n\n`;
                 clients.forEach(client => {
                         try { client.write(data); } catch (e) {}
                 });
                 console.log(`[${sessionCode}] Broadcast to ${clients.size} clients`);
           }
    res.sendStatus(200);
});

app.get('/stream/:sessionCode', (req: Request, res: Response) => {
    const { sessionCode } = req.params;

          res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

          res.write(`data: ${JSON.stringify({ type: 'connected', sessionCode })}\n\n`);

          if (!sessions.has(sessionCode)) sessions.set(sessionCode, new Set());
    sessions.get(sessionCode)!.add(res);

          const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 30000);

          req.on('close', () => {
                clearInterval(heartbeat);
                sessions.get(sessionCode)?.delete(res);
                if (sessions.get(sessionCode)?.size === 0) sessions.delete(sessionCode);
          });
});

app.listen(process.env.PORT || 3001, () => console.log('SSE server running'));
