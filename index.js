const express = require('express');
// const { ObjectId } = require('mongodb');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
// const SSLCommerzPayment = require('sslcommerz-lts')
// const store_id = `${process.env.STORE_ID}`
// const store_passwd = `${process.env.STORE_PASS}`
const is_live = false //true for live, false for sandbox
const port = process.env.PORT || 5000;

// middleware
app.use(cors())

app.use(express.json())
app.get('/', (req, res) => {
    res.send('Server is running...')
})

// MongoDB Connect

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.a46jnic.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        client.connect();

        const usersCollections = client.db("JustYouGetDB").collection("users");
        const productsCollections = client.db("JustYouGetDB").collection("products");

        // Users Api
        app.post('/users', async (req, res) => {
            const user = req?.body;
            const query = { email: user?.email }
            const existingUser = await usersCollections.findOne(query)
            if (existingUser) {
                return res.send({ message: "user already exist" })
            }
            const result = await usersCollections.insertOne(user);
            res.send(result)
        })

        // get all users
        app.get('/users', async (req, res) => {
            const result = await usersCollections.find().toArray()
            res.send(result)
        })

        // Post a product
        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productsCollections.insertOne(product);
            res.send(result)
        })

        // Get all products
        app.get("/products,", async (req, res) => {
            const result = await productsCollections.find().toArray();
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})