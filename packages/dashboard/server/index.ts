import express from "express";
import path from "path";

export const startDashboard = (port: number) => {
  const app = express();

  app.use(express.static(path.join(__dirname, '..')));

  app.listen(port, () => {
    console.log("@truffle/dashboard started on port 5000");
  });

  return app;
};
