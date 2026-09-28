import { MongoClient } from "mongodb";
import "dotenv/config";

const host = process.env.DOCKER_HOSTING ? "mongodb" : "localhost";

const uri = `mongodb://${host}:27017`;

let client = new MongoClient(uri);

async function openDb() {
    try {
        await client.connect();
        return client.db(process.env.DB_NAME);
    } catch (error) {
        console.log("Error connecting to MongoDB:", error);
    }
}

const closeDB = async () => {
  if (client) {
    await client.close();
    client = null;
  }
};

export { openDb, closeDB };