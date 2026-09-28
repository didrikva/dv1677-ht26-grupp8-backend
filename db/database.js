import { MongoClient } from "mongodb";
import "dotenv/config";

let client;

async function openDb() {
  if (!client) {
    const host = process.env.DOCKER_HOSTING ? "mongodb" : "localhost";
    const uri = process.env.MONGODB_URI || `mongodb://${host}:27017`;
    client = new MongoClient(uri);
  }

    try {
        await client.connect();
    return client.db(process.env.DB_NAME || "jsramverk");
    } catch (error) {
    client = undefined;
    throw error;
    }
}

const closeDB = async () => {
  if (client) {
    await client.close();
    client = undefined;
  }
};

export { openDb, closeDB };