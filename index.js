import dotenv from 'dotenv'
import { app } from './App.js'
import connectDB from './db/db.js'

dotenv.config({
    path: './.env'
})
connectDB()
    .then(() => {
        app.listen(process.env.PORT, () => console.log(`Server is running on port ${process.env.PORT}`))
    })
    .catch((err) => {
        console.log("MONGO db connection failed !!", err)
    })

// const app = express();
// const port = 8000;
// app.listen(port, () => console.log(`Server is running on port ${port}`))   