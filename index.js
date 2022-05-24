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
// function verifyJWT(req, res, next) {
//     const authHeader = req.headers.authorization
//     if (!authHeader) {
//         return res.status(401).send({ message: 'Unauthorizd Access' })
//     }
//     const token = authHeader.split(' ')[1]
//     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
//         if (err) {
//             res.status(403).send({ message: 'Forbidden Access' })
//         }
//         req.decoded = decoded
//         next()
//     });
// }


async function run() {
    try {
        await client.connect()
        const productsCollection = client.db('parts_and_co').collection('products')
        const allUsersCollection = client.db('parts_and_co').collection('all-users')
        // const userProfileCollection = client.db('parts_and_co').collection('users-profile')


        app.get('/product', async (req, res) => {
            const query = {}
            const result = await productsCollection.find(query).toArray()
            res.send(result)
        })


        app.get('/singleProduct/:id', async (req, res) => {
            const id = req.params.id
            console.log(id);
            const query = {_id : ObjectId(id)}
            console.log(query);
            const result = await productsCollection.findOne(query)
            console.log(result)
            res.send(result)
        })

        app.post('/product', async (req, res) => {
            const data = req.body
            const result = await productsCollection.insertOne(data)
            res.send(result)
        })


        // user put api 
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email
            // console.log(email);
            const user = req.body
            // console.log(user);
            const filter = { email: email }
            // console.log(filter);
            const options = { upsert: true }
            // console.log(options);
            const updatedDoc = {
                $set: user,
            }
            // console.log(updatedDoc);
            const result = await allUsersCollection.updateOne(filter, updatedDoc, options)
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '20d' })
            console.log(result, token);
            res.send({result, token})
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