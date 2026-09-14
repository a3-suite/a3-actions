import http from 'node:http';
import fs from 'node:fs';

const portFile = process.argv[2];
const server = http.createServer((request, response) => {
  if (request.url === '/repos/a3-suite/a3-actions/actions/artifacts/42') {
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ workflow_run: { id: 1234 }, name: 'hosted-artifact', id: 42, digest: `sha256:${'a'.repeat(64)}` }));
    return;
  }
  response.statusCode = 404;
  response.end('{}');
});
server.listen(0, '127.0.0.1', () => {
  fs.writeFileSync(portFile, String(server.address().port));
});
process.on('SIGTERM', () => server.close(() => process.exit(0)));
