const express = require('express')
const app = express()

const path = require('path')
global.__basedir = __dirname

const pool = require(path.join(__basedir, 'config', 'db-config'))

const hotelid = 'H0T1L3D7';

//const methodOverride = require('method-override')
//const session = require('express-session')

app.use(express.static(path.join(__dirname, 'public')))
app.use(express.json())
app.use(express.urlencoded({extended : true}))
//app.use(methodOverride('_method'))
/*app.use(session({
    secret: 'abcd123456789',
    resave: false,
    saveUninitialized: true
}))*/


// set pug as view engine
app.set('view engine', 'pug')
app.set('views', path.join(__dirname, 'views'))

// routes
const reservation = require('./routes/reservation')

const landing = require('./routes/landing')


// register routes as middleware
app.use('/reservation', reservation)
app.use('/landing', landing)


app.get('/', async(req, res)=>{
    try {
        const allRoomType = await pool.query('SELECT * FROM room_type WHERE hotelid = $1', [hotelid])

        // Convert binary data to base64 string
        allRoomType.rows.forEach(row => {
            if (row.roomimage) {
                row.roomimage = 'data:' + row.imagetype + ';base64,' + row.roomimage.toString('base64')
            }
        })

        res.render('landing/index', {
            allRoomTypeArray: allRoomType.rows
        })

    } catch (error) {
        console.error(error.message)
    }
})


const PORT = 5050
app.listen(PORT, ()=>{
    console.log(`Server started on port ${PORT}`)
})
