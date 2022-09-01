const express = require('express')
const cors = require('cors')
require('dotenv').config()
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


const app = express()
const port = process.env.PORT || 5000


// middleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.d2u5z.mongodb.net/?retryWrites=true&w=majority`

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 })


 // jwt function 
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
        const ordersCollection = client.db('parts_and_co').collection('orders')
        const paymentsCollection = client.db('parts_and_co').collection('payments')


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

        // delete user api
        app.delete("/user/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await allUsersCollection.deleteOne(query);
            res.send(result);
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
                const cursor = reviewCollection.find(query);
                const InventoryItems = await cursor.toArray();
                console.log(InventoryItems);
                res.send(InventoryItems);
            } else {
                res.status(403).send({ message: "Access denied! Forbidden access" });
            }
        })

        // get review api
        app.get('/allreview', async (req, res) => {
            const query = {}
            const result = await reviewCollection.find(query).toArray()
            res.send(result)
        })


        // prost order to database
        app.post('/orders', async (req, res) => {
            const orders = req.body
            const result = await ordersCollection.insertOne(orders)
            res.send(result)
        })


        // filter orders by email for my orders
        app.get("/myaddedorders", verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.query.email;
            if (email === decodedEmail) {
                console.log(email);
                const query = { email: email };
                console.log(query);
                const cursor = ordersCollection.find(query);
                const InventoryItems = await cursor.toArray();
                console.log(InventoryItems);
                res.send(InventoryItems);
            } else {
                res.status(403).send({ message: "Access denied! Forbidden access" });
            }
        })

        // get all orders
        app.get('/allorders', async (req, res) => {
            const query = {}
            const result = await ordersCollection.find(query).toArray()
            res.send(result)
        })


        // cancle ordeer
        app.delete("/myorders/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            res.send(result);
        })

        //   update bookin after payment 
        app.patch('/myaddedorders/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const result = await paymentsCollection.insertOne(payment);
            const updatedOrders = await ordersCollection.updateOne(filter, updatedDoc);
            res.send(updatedOrders)
        })

        // get product filter by id for payment
        app.get('/payment/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const booking = await ordersCollection.findOne(query);
            res.send(booking)
        })

        //   payment
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const parts = req.body
            console.log(parts);
            const price = parts.totalPrice
            console.log(price);
            const amount = parseInt(price) * 100
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            })
            res.send({ clientSecret: paymentIntent.client_secret })
        })

        // get paid product
        app.get('/paidproduct', async(req, res) => {
            const query = {}
            const result = await paymentsCollection.find(query).toArray()
            res.send(result)
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