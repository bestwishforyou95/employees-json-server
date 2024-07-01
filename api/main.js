const jsonServer = require("json-server");
const express = require("express");
const multer = require("multer");
const qs = require("qs");
const fs = require("fs");
const path = require("path");
const server = jsonServer.create();
const db = JSON.parse(fs.readFileSync(path.join(__dirname, "../db.json")));
const router = jsonServer.router(db);

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

// Configure multer for parsing multipart/form-data
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join("/tmp", "uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage });

// // Use multer to handle multipart/form-data file uploads
server.post("/employees", upload.array("files"), (req, res) => {
  const db = JSON.parse(fs.readFileSync(path.join(__dirname, "../db.json")));
  router = jsonServer.router(db);
  const employees = router.db.get("employees");
  let newEmployee = null;
  if (req.body.data) {
    newEmployee = { ...JSON.parse(req.body.data) };
  } else {
    newEmployee = req.body;
  }
  newEmployee.id = employees.size().value() + 1;
  newEmployee.createdAt = Date.now();
  newEmployee.updatedAt = Date.now();
  employees.push(newEmployee).write();

  res.status(200).json(newEmployee);
});

// Use multer to handle multipart/form-data file uploads
server.post("/employees/uploads", upload.array("files"), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }
  const filePaths = req.files.map((file, index) => ({
    id: index + 1,
    cdnUrl: `/cdn/${file.filename}`,
    displayOrder: index,
  }));
  res.status(200).json({ files: filePaths });
});

// Serve static files from the 'cdn' directory
server.use("/cdn", express.static(path.join("/tmp", "uploads")));

// Use multer before jsonServer.bodyParser to handle multipart/form-data
server.use(upload.none());

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
  //check GET with pagination
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
  res.jsonp({
    data: res.locals.data,
  });
};

// Use default router
server.use(router);
const PORT = process.env.PORT || 9090;
server.listen(PORT, () => {
  console.log("JSON Server is running");
});

module.exports = server;
