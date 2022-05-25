const express = require('express')
const cors = require('cors')
require('dotenv').config()
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const app = express()
const port = process.env.PORT || 5000


// middleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.d2u5z.mongodb.net/?retryWrites=true&w=majority`

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 })


// // jwt function 
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorizd Access' })
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            res.status(403).send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded
        next()
    })
}


async function run() {
    try {
        await client.connect()
        const productsCollection = client.db('parts_and_co').collection('products')
        const allUsersCollection = client.db('parts_and_co').collection('all-users')
        const reviewCollection = client.db('parts_and_co').collection('coustomer-review')


        app.get('/product', async (req, res) => {
            const query = {}
            const result = await productsCollection.find(query).toArray()
            res.send(result)
        })


        app.get('/singleProduct/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await productsCollection.findOne(query)
            res.send(result)
        })

        app.post('/product', async (req, res) => {
            const data = req.body
            const result = await productsCollection.insertOne(data)
            res.send(result)
        })

        // get all user
        app.get('/users', verifyJWT, async (req, res) => {
            const query = {}
            const result = await allUsersCollection.find(query).toArray()
            res.send(result)
        })

        // user put api 
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email
            const user = req.body
            const filter = { email: email }
            const options = { upsert: true }
            const updatedDoc = {
                $set: user,
            }
            const result = await allUsersCollection.updateOne(filter, updatedDoc, options)
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '20d' })
            // console.log(result, token);
            res.send({ result, token })
        })

        // make admin api 
        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email
            const requester = req.decoded.email
            const requesterAc = await allUsersCollection.findOne({ email: requester })

            if (requesterAc.role === 'admin') {
                const filter = { email: email }
                const updatedDoc = {
                    $set: { role: 'admin' },
                }
                const result = await allUsersCollection.updateOne(filter, updatedDoc)
                res.send(result)
            }
            else {
                res.status(403).send({ message: 'Forbidden' });
            }
        })

        // get admin api
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email
            const user = await allUsersCollection.findOne({ email: email })
            const isAdmin = user.role === 'admin'
            res.send({ admin: isAdmin })
        })


        // my product api
        app.get("/myaddeditems", verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.query.email;
            if (email === decodedEmail) {
                console.log(email);
                const query = { email: email };
                console.log(query);
                const cursor = productsCollection.find(query);
                const InventoryItems = await cursor.toArray();
                console.log(InventoryItems);
                res.send(InventoryItems);
            } else {
                res.status(403).send({ message: "Access denied! Forbidden access" });
            }
        })

        //   delete specific product
        app.delete("/myproduct/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        })

        // review post api
        app.post('/review', async (req, res) => {
            const review = req.body
            const result = await reviewCollection.insertOne(review)
            console.log(result);
            res.send(result)
        })

        // myreview / review filter by email for my review
        app.get("/myaddedreview", verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.query.email;
            if (email === decodedEmail) {
                console.log(email);
                const query = { email: email };
                console.log(query);
                const cursor = reviewCollection .find(query);
                const InventoryItems = await cursor.toArray();
                console.log(InventoryItems);
                res.send(InventoryItems);
            } else {
                res.status(403).send({ message: "Access denied! Forbidden access" });
            }
        })

    }
    finally { }
}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Running Parts & Co')
})

app.listen(port, () => {
    console.log('Listning to port', port);
})