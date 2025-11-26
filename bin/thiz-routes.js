import express from "express";
import { inspectRoutes } from "@thizjs/express";
import chalk from "chalk";
import open from "open";

const PORT = 3456;

async function main() {
  console.log(chalk.blue("🔍 THIZ Route Inspector"));
  console.log(chalk.gray("Analyzing your routes...\n"));

  try {
    // Inspect routes
    const routeData = await inspectRoutes("routes", { prefix: "" });

  // Create Express server to serve UI
  const app = express();

  // API endpoint
  app.get("/api/routes", (req, res) => {
    res.json(routeData);
  });

  // Serve UI
  app.get("/", (req, res) => {
    const html = generateUI();
    res.send(html);
  });

  // Start server
  const server = app.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(chalk.green(`✓ Route Inspector running at ${url}`));
    console.log(chalk.gray(`\nPress Ctrl+C to stop\n`));

    // Open browser
    open(url).catch(() => {
      console.log(chalk.yellow("Could not open browser automatically."));
      console.log(chalk.yellow(`Please visit: ${url}`));
    });
  });

  // Handle shutdown
  process.on("SIGINT", () => {
    console.log(chalk.yellow("\n\nShutting down..."));
    server.close(() => {
      process.exit(0);
    });
  });

  } catch (error) {
    console.error(chalk.red("Error:"), error.message);
    process.exit(1);
  }
}

main();

function generateUI() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>THIZ Route Inspector</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    header {
      text-align: center;
      color: white;
      margin-bottom: 40px;
    }

    header h1 {
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: 10px;
    }

    header p {
      font-size: 1.2rem;
      opacity: 0.9;
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .card h3 {
      font-size: 0.9rem;
      color: #666;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .card .value {
      font-size: 2.5rem;
      font-weight: 700;
      color: #667eea;
    }

    .section {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .section h2 {
      font-size: 1.8rem;
      margin-bottom: 20px;
      color: #333;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }

    th {
      background: #f8f9fa;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #555;
      border-bottom: 2px solid #e0e0e0;
    }

    td {
      padding: 12px;
      border-bottom: 1px solid #f0f0f0;
    }

    tr:hover {
      background: #f8f9fa;
    }

    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-right: 5px;
    }

    .badge.global {
      background: #667eea;
      color: white;
    }

    .badge.route {
      background: #fbbf24;
      color: #78350f;
    }

    .method {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 0.85rem;
      min-width: 70px;
      text-align: center;
    }

    .method.get { background: #10b981; color: white; }
    .method.post { background: #3b82f6; color: white; }
    .method.put { background: #f59e0b; color: white; }
    .method.patch { background: #8b5cf6; color: white; }
    .method.delete { background: #ef4444; color: white; }

    .path {
      font-family: 'Monaco', 'Courier New', monospace;
      color: #333;
      font-weight: 500;
    }

    .file {
      font-family: 'Monaco', 'Courier New', monospace;
      color: #666;
      font-size: 0.9rem;
    }

    .middleware-list {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: #999;
    }

    .loading {
      text-align: center;
      padding: 100px;
      color: white;
      font-size: 1.5rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🔍 THIZ Route Inspector</h1>
      <p>Visual overview of your routes and middlewares</p>
    </header>

    <div id="loading" class="loading">Loading routes...</div>
    <div id="content" style="display: none;"></div>
  </div>

  <script>
    fetch('/api/routes')
      .then(res => res.json())
      .then(data => {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'block';
        renderContent(data);
      })
      .catch(err => {
        document.getElementById('loading').innerHTML = '❌ Error loading routes: ' + err.message;
      });

    function renderContent(data) {
      const content = document.getElementById('content');

      // Summary cards
      const summaryHTML = \`
        <div class="summary-cards">
          <div class="card">
            <h3>Total Routes</h3>
            <div class="value">\${data.summary.totalRoutes}</div>
          </div>
          <div class="card">
            <h3>Middlewares</h3>
            <div class="value">\${data.summary.totalMiddlewares}</div>
          </div>
          <div class="card">
            <h3>Global Middlewares</h3>
            <div class="value">\${data.summary.globalMiddlewares}</div>
          </div>
          <div class="card">
            <h3>GET Routes</h3>
            <div class="value">\${data.summary.byMethod.GET || 0}</div>
          </div>
          <div class="card">
            <h3>POST Routes</h3>
            <div class="value">\${data.summary.byMethod.POST || 0}</div>
          </div>
        </div>
      \`;

      // Middlewares section
      const middlewaresHTML = \`
        <div class="section">
          <h2>🔧 Middlewares</h2>
          
          <h3 style="margin-top: 20px; color: #667eea;">Global Middlewares</h3>
          \${data.middlewares.global.length > 0 ? \`
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                \${data.middlewares.global.map(mw => \`
                  <tr>
                    <td>\${mw}</td>
                    <td><span class="badge global">Global</span></td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          \` : \`<div class="empty-state">No global middlewares</div>\`}

          <h3 style="margin-top: 30px; color: #f59e0b;">Available Middlewares</h3>
          \${data.middlewares.available.length > 0 ? \`
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Scope</th>
                </tr>
              </thead>
              <tbody>
                \${data.middlewares.available.map(mw => \`
                  <tr>
                    <td>\${mw}</td>
                    <td>
                      \${data.middlewares.global.includes(mw) 
                        ? '<span class="badge global">Global</span>' 
                        : '<span class="badge route">Route-specific</span>'}
                    </td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          \` : \`<div class="empty-state">No middlewares available</div>\`}
        </div>
      \`;

      // Routes section
      const routesHTML = \`
        <div class="section">
          <h2>🛣️ Routes</h2>
          \${data.routes.length > 0 ? \`
            <table>
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Path</th>
                  <th>Middlewares</th>
                  <th>File</th>
                </tr>
              </thead>
              <tbody>
                \${data.routes.map(route => \`
                  <tr>
                    <td>
                      <span class="method \${route.method.toLowerCase()}">\${route.method}</span>
                    </td>
                    <td class="path">\${route.path || '/'}</td>
                    <td>
                      <div class="middleware-list">
                        \${route.middlewares.length > 0 
                          ? route.middlewares.map(mw => 
                              \`<span class="badge \${mw.type}">\${mw.name}</span>\`
                            ).join('')
                          : '<span style="color: #999;">None</span>'}
                      </div>
                    </td>
                    <td class="file">\${route.file}</td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          \` : \`<div class="empty-state">No routes found</div>\`}
        </div>
      \`;

      content.innerHTML = summaryHTML + middlewaresHTML + routesHTML;
    }
  </script>
</body>
</html>`;
}