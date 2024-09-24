const express = require('express');
// const { ObjectId } = require('mongodb');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const SSLCommerzPayment = require('sslcommerz-lts')
const store_id = `${process.env.STORE_ID}`
const store_passwd = `${process.env.STORE_PASS}`
const is_live = false //true for live, false for sandbox
const port = process.env.PORT || 5000;

// middleware
app.use(cors())
app.use(cors({
    origin: ['http://localhost:5173', 'https://just-you-get.web.app'],
}));

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
        const cartCollections = client.db("JustYouGetDB").collection("carts");
        const categoriesCollections = client.db("JustYouGetDB").collection("categories");
        const orderCollections = client.db("JustYouGetDB").collection("orders");

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

        // Update User
        app.patch('/users/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updatedinfo = req.body
            console.log(updatedinfo);

            const options = {};
            // Specify the update to set a value for the fields
            const updateDoc = {
                $set: {
                    ...updatedinfo
                },
            };
            // Update the first document that matches the filter
            const result = await userCollections.updateOne(filter, updateDoc, options);
            if (result.modifiedCount === 1) {
                res.status(200).json({ acknowledged: true });
            } else {
                res.status(500).json({ acknowledged: false, error: "Failed to update user information." });
            }
        });

        // get all users
        app.get('/users', async (req, res) => {
            const result = await usersCollections.find().toArray()
            res.send(result)
        })

        // Get user by email
        app.get('/users/:email', async (req, res) => {
            const email = req?.params?.email;
            const filter = { email: email };
            const result = await usersCollections.findOne(filter)
            res.send(result)
        })

        // update User
        app.put('/users/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updatedinfo = req.body

            const options = {};
            // Specify the update to set a value for the plot field
            const updateDoc = {
                $set: {

                    phone: updatedinfo.phone,
                    address: updatedinfo.address

                },
            };
            // Update the first document that matches the filter
            const result = await usersCollections.updateOne(filter, updateDoc, options);
            if (result.modifiedCount === 1) {
                res.status(200).json({ acknowledged: true });
            } else {
                res.status(500).json({ acknowledged: false, error: "Failed to update user information." });
            }
        });


        // Post a product
        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productsCollections.insertOne(product);
            res.send(result)
        })

        // Get all products
        app.get('/all-products', async (req, res) => {
            const result = await productsCollections.find().toArray();
            res.send(result)
        })

        // Get a product with pagination
        app.get('/products', async (req, res) => {
            const page = parseInt(req.query.page) || 1;
            const limit = 12;

            try {
                const skip = (page - 1) * limit;
                const result = await productsCollections.find().skip(skip).limit(limit).toArray();

                const totalproducts = await productsCollections.countDocuments();
                const totalPages = Math.ceil(totalproducts / limit);

                res.send({
                    page,
                    totalPages,
                    totalproducts,
                    products: result
                });
            } catch (error) {
                res.status(500).send({ message: 'Error retrieving products', error });
            }
        });


        // Post a Categories
        app.post('/categories', async (req, res) => {
            const category = req.body;
            const result = await categoriesCollections.insertOne(category);
            res.send(result)
        })

        // Get All Categories
        app.get('/categories', async (req, res) => {
            const result = await categoriesCollections.find().toArray()
            res.send(result)
        })

        // Cart Collection
        app.post('/carts', async (req, res) => {
            const item = req.body;
            const result = await cartCollections.insertOne(item)
            res.send(result)
        })

        // get all cart
        app.get('/carts', async (req, res) => {
            const result = await cartCollections.find().toArray()
            res.send(result)
        })

        // get cart by email
        app.get('/carts/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { userEmail: email };
            const result = await cartCollections.find(filter).toArray()
            res.send(result);
        });

        // delete a item from cart
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const result = await cartCollections.deleteOne(filter)
            res.send(result)
        })

        // Payments ........................

        app.post('/orders', async (req, res) => {
            const initialOrder = req?.body;
            const items = initialOrder?.items;
            const client = initialOrder?.client;
            const productIDs = items.map(item => new ObjectId(item?.productId)); // Use 'productId' instead of 'productID'

            // Assuming productsCollections is your MongoDB collection
            const products = await productsCollections.find({ _id: { $in: productIDs } }).toArray();

            const selectedItems = items?.map(item => {
                const matchedProducts = products?.find(product => product._id.equals(new ObjectId(item.productId)));
                if (matchedProducts) {
                    const discountedPrice = Math.ceil(matchedProducts.price - (matchedProducts.price * (matchedProducts.discounts / 100)));
                    return {
                        discountedPrice: discountedPrice,
                        itemCount: item.itemCount
                    };
                } else {
                    console.error(`Product not found with ID: ${item.productId}`);
                    return null;
                }
            }).filter(item => item !== null);


            const totalPrice = selectedItems.reduce((total, item) => {
                return total + (item.discountedPrice * item.itemCount);
            }, 0);



            const trans_id = Math.random().toString(36).substr(2, 6) + Math.random().toString(36).substr(2, 6).substr(0, 6)
            const data = {
                total_amount: totalPrice + initialOrder.deliveryCost,
                currency: 'BDT',
                tran_id: trans_id,
                success_url: `https://just-you-get.vercel.app/payment/success/${trans_id}`,
                fail_url: 'https://just-you-get.web.app/failed-payment',
                cancel_url: 'https://just-you-get.web.app/cancel-payment',
                shipping_method: 'Courier',
                product_name: 'product',
                product_category: 'product',
                product_profile: 'general',
                cus_name: client.name,
                cus_email: client.email,
                cus_add1: client.address.district,
                cus_phone: client.phone,
                ship_name: client.name,
                ship_add1: client.address.division,
                ship_city: client.address.district,
                ship_area: client.address.street,
                ship_postcode: client.address.postCode,
                ship_country: 'Bangladesh',
            };


            const finalOrder = {
                client: initialOrder?.client,
                products: items,
                transactionId: data?.tran_id,
                paymentStatus: false,
                deliveryCost: initialOrder.deliveryCost,
                totalPrice: totalPrice
            }

            const orderInsert = await orderCollections.insertOne(finalOrder)

            const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
            sslcz.init(data).then(apiResponse => {
                let GatewayPageURL = apiResponse.GatewayPageURL;

                res.send({ url: GatewayPageURL });
                // console.log('Redirecting to: ', GatewayPageURL);
            }).catch(error => {
                console.error('Error initiating SSLCommerz payment:', error);
                res.status(500).send('An error occurred while initiating payment.');
            });



        });



        app.post('/payment/success/:trans_id', async (req, res) => {
            try {
                const orderCreationDate = new Date();

                // Calculate minimum and maximum estimated delivery dates
                const minDeliveryDays = 3;
                const maxDeliveryDays = 7;

                const minEstimatedDeliveryDate = new Date(orderCreationDate);
                minEstimatedDeliveryDate.setDate(orderCreationDate.getDate() + minDeliveryDays);

                const maxEstimatedDeliveryDate = new Date(orderCreationDate);
                maxEstimatedDeliveryDate.setDate(orderCreationDate.getDate() + maxDeliveryDays);

                const estimatedDelivery = `${minEstimatedDeliveryDate.toDateString()} - ${maxEstimatedDeliveryDate.toDateString()}`;

                const result = await orderCollections.updateOne({ transactionId: req.params.trans_id }, {
                    $set: {
                        paymentStatus: true,
                        orderStatus: "Processing",
                        orderCreationDate: orderCreationDate,
                        estimatedDelivery: estimatedDelivery
                    }
                });

                if (result.modifiedCount === 0) {
                    return res.status(400).send('Order update failed');
                }

                const order = await orderCollections.findOne({ transactionId: req.params.trans_id });
                if (!order) {
                    return res.status(404).send('Order not found');
                }

                const items = order.products;
                const client = order.client;

                if (items && items.length > 0) {
                    for (const item of items) {
                        if (item.productId) {
                            const product = await productsCollections.findOne({ _id: new ObjectId(item.productId) });
                            if (product) {
                                const newQuantity = (product.quantity || 0) - item.itemCount;
                                const newSold = (product.sold || 0) + item.itemCount;
                                const updateResult = await productsCollections.updateOne(
                                    { _id: new ObjectId(item.productId) },
                                    {
                                        $set: {
                                            quantity: newQuantity,
                                            sold: newSold
                                        }
                                    }
                                );

                                if (updateResult.modifiedCount === 0) {
                                    console.error(`Failed to update product with ID: ${item.productId}`);
                                }
                            } else {
                                console.error(`product not found with ID: ${item.productId}`);
                            }
                        } else {
                            console.error('Item is missing required properties:', item);
                        }
                    }
                }

                // Delete purchased items from the user's cart
                const purchasedItemIds = items.map(item => item.productId);
                await cartCollections.deleteMany({ userEmail: client.email, productId: { $in: purchasedItemIds } });

                console.log("Order processed successfully.");

                res.redirect(`https://just-you-get.web.app/success-payment/${req.params.trans_id}`);

            } catch (error) {
                console.error('Error processing payment success:', error);
                res.status(500).send('Internal Server Error');
            }
        });


        //Manage Orders............

        app.get('/orders', async (req, res) => {
            const result = await orderCollections.find().toArray();
            res.send(result);
        });

        app.get('/orders/:email', async (req, res) => {
            const email = req.params.email
            const filter = {
                'client.email': email
            }
            const result = await orderCollections.find(filter).toArray();
            res.send(result);
        });

        // Get orders by orderStatus
        app.get('/orders/status/:status', async (req, res) => {
            const status = req.params.status.toLowerCase();
            const filter = { $expr: { $eq: [{ $toLower: "$orderStatus" }, status] } };
            const result = await orderCollections.find(filter).toArray();
            res.send(result);
        });

        // Change order Status
        app.patch('/orders/status/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const update = req.body
            const updateDoc = {
                $set: {
                    orderStatus: update?.orderStatus
                },
            };
            const result = await orderCollections.updateOne(filter, updateDoc)
            res.send(result)
        })

        // Change order Status delivered
        app.patch('/orders/setDelivered/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const update = req.body;
            const updateDoc = {
                $set: {
                    orderStatus: update?.orderStatus,
                    deliveredIn: update?.deliveredIn
                },
            };
            const result = await orderCollections.updateOne(filter, updateDoc)
            res.send(result)
        })

        // get order by transactionId
        app.get('/orders/transID/:transactionId', async (req, res) => {
            const transactionId = req.params.transactionId
            const filter = {
                'transactionId': transactionId
            }
            const result = await orderCollections.findOne(filter)
            res.send(result);
        });



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