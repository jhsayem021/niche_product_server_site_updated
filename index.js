const express = require('express');
const {MongoClient } = require('mongodb');
require('dotenv').config();
const cors = require('cors');
const ObjectID = require('mongodb').ObjectId;
const admin = require("firebase-admin");

const app = express();
// middleware
app.use(cors());
app.use(express.json());
const port = process.env.PORT || 5000;

// firebase admin initialization 

const serviceAccount = require("./road-bolt-39afe-firebase-adminsdk-t5huu-853309f632.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sezawpu.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const idToken = req.headers.authorization.split('Bearer ')[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(idToken);
            req.decodedUserEmail = decodedUser.email;
        }
        catch {

        }
    }
    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db('moto-gp');
        const productCollection = database.collection('products');
        const orderCollection = database.collection('orders');
        const usersCollection = database.collection('users');
        const reviewCollection = database.collection('review');
        console.log("mondodb connected");
        //GET Products API
        app.get('/services', async (req, res) => {
            const cursor = productCollection.find({});
            const products = await cursor.toArray();
            console.log(products);    
            res.send({              
                products
            });
        });
        app.get('/review', async (req, res) => {
            const cursor = reviewCollection.find({});
            const review = await cursor.toArray();
                
            res.send({              
                review
            });
        });

        // Use POST to get data by keys
        app.post('/services/bykeys', async (req, res) => {
            const keys = req.body;
            
            const query = { key: { $in: keys } }
            const products = await productCollection.find(query).toArray();
            res.json(products);
        });

        // Add Orders API
        app.get('/booked_service', async (req, res) => {
    
                const cursor = orderCollection.find({});
                const orders = await cursor.toArray();
                res.send({              
                  orders
              });
            }
        );

        app.post('/booked_service', async (req, res) => {
            const order = req.body;
            console.log(order);
            order.createdAt = new Date();
            const result = await orderCollection.insertOne(order);
            res.json(result);
        })

        // Delete API 
        app.delete('/booked_service/:key',async(req,res)=>{
            const id = req.params.key;
            const query = {_id: ObjectID(id)};
            const result = await orderCollection.deleteOne(query);
            console.log(result, 'delete')

            res.json(result);
        })
        // Delete Products
        app.delete('/services/:key',async(req,res)=>{
            const id = req.params.key;
            const query = {_id: ObjectID(id)};
            const result = await productCollection.deleteOne(query);
            console.log(result, 'delete')

            res.json(result);
        })

//dashboard server

          // add user info 

          app.post("/addUserInfo", async (req, res) => {
            console.log("req.body");
            const result = await usersCollection.insertOne(req.body);
            res.send(result);
            console.log(req.body);
          });

  //  make admin
  app.put("/makeAdmin", async (req, res) => {
    const filter = { email: req.body.email };
    const result = await usersCollection.find(filter).toArray();
    if (result) {
      const documents = await usersCollection.updateOne(filter, {
        $set: { role: "admin" },
      });
      console.log(documents);
    }
    else {
      const role = "admin";
      const result = await usersCollection.insertOne(req.body.email, {
        role: role,
      });
    }
  });

          // check admin or not
  app.get("/checkAdmin/:email", async (req, res) => {
    const result = await usersCollection
      .find({ email: req.params.email })
      .toArray();
    console.log(result);
    res.send(result);
  });

  // review
  app.post("/addSReview", async (req, res) => {
    const result = await reviewCollection.insertOne(req.body);
    res.send(result);
  });

   //add servicesCollection
   app.post("/addProducts", async (req, res) => {
    console.log(req.body);
    const result = await productCollection.insertOne(req.body);
    res.send(result);
  });

    //  my order
    app.get("/myOrder/:uid", async (req, res) => {
        console.log(req.params.uid);
        const result = await orderCollection
          .find({ userId: req.params.uid })
          .toArray();
        res.send(result);
      });

    }
    finally {
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Moto-GP server is running');
});

app.listen(port, () => {
    console.log('Server running at port', port);
})