const jsonServer = require("json-server");
const qs = require("qs");
const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

// Set default middlewares (logger, static, cors and no-cache)
server.use(middlewares);

// Add custom routes before JSON Server router
server.get("/echo", (req, res) => {
  res.jsonp(req.query);
});

server.use(
  jsonServer.rewriter({
    "/api/*": "/$1",
    "/blog/:resource/:id/show": "/:resource/:id",
  })
);

// To handle POST, PUT and PATCH you need to use a body-parser
// You can use the one used by JSON Server
server.use(jsonServer.bodyParser);
server.use((req, res, next) => {
  if (req.method === "POST") {
    req.body.createdAt = Date.now();
    req.body.updatedAt = Date.now();
  } else if (req.method === "PATCH" || req.method === "PUT") {
    req.body.updatedAt = Date.now();
  }
  if (req.method === "GET") {
    if (req.query?.pageNumber) req.query._page = req.query?.pageNumber;
    if (req.query?.pageSize) req.query._limit = req.query?.pageSize;
  }
  // Continue to JSON Server router
  next();
});

router.render = (req, res) => {
  //check GET  with pagination
  const headers = res.getHeaders();
  const totalCountHeader = headers["x-total-count"];
  if (req.method === "GET" && totalCountHeader) {
    const queryParams = qs.parse(req._parsedUrl?.query);
    const numberPages = totalCountHeader / (queryParams.pageSize || 100);
    const integerNmberPages = parseInt(numberPages);
    const result = {
      totalItems: totalCountHeader,
      totalPages:
        numberPages > integerNmberPages
          ? integerNmberPages + 1
          : integerNmberPages,
      pageItems: res.locals.data,
    };
    return res.jsonp(result);
  }
  res.jsonp(res.locals.data);
};

// Use default router
server.use(router);
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("JSON Server is running");
});

module.exports = server;
