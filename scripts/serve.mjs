import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, extname } from 'node:path';
const root = process.argv[2];
const types = { '.html':'text/html', '.css':'text/css', '.xml':'application/xml', '.txt':'text/plain' };
const srv = createServer((req, res) => {
  let p = resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = resolve(p, 'index.html');
  if (!existsSync(p)) {
    res.writeHead(404, { 'content-type': 'text/html' });
    return res.end(readFileSync(resolve(root, '404.html')));
  }
  res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' });
  res.end(readFileSync(p));
});
srv.listen(0, () => process.stdout.write(String(srv.address().port) + '\n'));
