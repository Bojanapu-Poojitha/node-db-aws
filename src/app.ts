import express, { Request, Response } from "express";
import { Pool } from "pg";
import dotenv from "dotenv";
import AWS from "aws-sdk";

dotenv.config();

const app = express();
const port = 3000;
app.use(express.json());
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: "ap-south-1",
});

const sns = new AWS.SNS();
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
dbConnect.connect()
  .then(() => {
    console.log("connect to DB successfully");
  })
  .catch((err) => {
    console.error("failed connecting to DB:", err.message);
    process.exit(1); 
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
app.post("/addUser", async (req: Request, res: Response) => {
  const { name, age } = req.body;

  if ( !name || !age) {
    return res.status(400).json({ error: "name, and age are required" });
  }

  try {
    const result = await dbConnect.query(
      "INSERT INTO users ( name, age) VALUES ( $1, $2) RETURNING *",
      [ name, age],
    );
    const newUser = result.rows[0];

    const snsMessage = `new data: id: ${newUser.id}, name: ${newUser.name}, age: ${newUser.age}`;

    const params = {
      Message: snsMessage,
      TopicArn: process.env.SNS_TOPIC_ARN,
    };

    sns.publish(params, (err, data) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "failed to send SNS notification" });
      }
    });

    res.status(201).json({
      message: "New user added and SNS notification triggered.",
      user: newUser,
    });
  } catch (error: any) {
    res.status(500).json({ message:'failed'});
  }
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
process.on('handle', (reason, promise) => {
  console.error(' rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('uncaught Exception:', err);
  process.exit(1);  
});
