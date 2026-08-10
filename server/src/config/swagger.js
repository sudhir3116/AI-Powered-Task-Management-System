import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const serverUrl = process.env.API_URL || "http://localhost:8000";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AI-Powered Task Management API",
      version: "2.0.0",
      description:
        "Full REST API for authentication (email/Google OAuth), task management with AI features (priority, summary, deadline, subtasks, productivity insights), and analytics.",
      contact: {
        name: "Task Manager API",
      },
    },
    servers: [{ url: serverUrl, description: "API Server" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT token (obtained from /api/auth/login or /api/auth/google)",
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "Auth", description: "Authentication endpoints (email & Google OAuth)" },
      { name: "Tasks", description: "Task CRUD, search, filter, sort, pagination" },
      { name: "AI", description: "AI-powered features via Groq (Llama 3.3 70B)" },
    ],
  },
  apis: ["./src/routes/*.js", "./src/controllers/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

export const swaggerDocs = (app) => {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "Task Manager API Docs",
    customCss: ".swagger-ui .topbar { background-color: #4f46e5; }",
  }));

  // Also expose raw spec as JSON
  app.get("/api/docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
};

export default swaggerSpec;
