import express, { Request, Response } from "express";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 3000;

const dbConnect = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432,

  ssl: {
    rejectUnauthorized: false,
  },
});
console.log("connecting to DB:", process.env.DB_HOST);

app.get("/allUsers", async (req: Request, res: Response) => {
  try {
    const result = await dbConnect.query("SELECT * FROM users");
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
