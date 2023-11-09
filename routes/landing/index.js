const path = require('path')

const express = require('express')
const router = express.Router()

const pool = require(path.join(__basedir, 'config', 'db-config'))

const hotelid = 'H0T1L3D7';

router.get('/', async(req, res)=>{
    try {
        res.render('landing/index')
    } catch (error) {
        console.error(error.message)
    }
})


// read all room type
/*router.get('/', async(req, res)=>{
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
})*/

module.exports = router