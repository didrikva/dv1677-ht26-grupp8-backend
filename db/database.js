import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI);

let db;

async function connectToDatabase() {
    await client.connect();
    db = client.db(process.env.DB_NAME);
    console.log('Connected to MongoDB');
}

export default db;
