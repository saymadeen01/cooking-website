const http = require("http");
const fs = require("fs");
const path = require("path");

const server = http.createServer((req, res) => {
    let filePath = path.join(__dirname, req.url === "/" ? "index.html" : req.url);
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, {"Content-Type":"text/html"});
            res.end("<h1>404 Not Found</h1><a href='/'>Back to Products</a>");
        } else {
            res.writeHead(200, {"Content-Type":"text/html"});
            res.end(content);
        }
    });
});

server.listen(80, () => console.log("Server running at http://ecommerce.local"));
