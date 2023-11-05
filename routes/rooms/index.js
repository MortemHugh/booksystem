const path = require('path')

const express = require('express')
const router = express.Router()

const pool = require(path.join(__basedir, 'config', 'db-config'))
const hotelid = 'H0T1L3D7';

//- render the rooms page
router.get('/', async(req, res)=>{
    try {
        const allRoomType = await pool.query('SELECT * FROM room_type WHERE hotelid = $1', [hotelid])

        // Convert binary data to base64 string
        allRoomType.rows.forEach(row => {
            if (row.roomimage) {
                row.roomimage = 'data:' + row.imagetype + ';base64,' + row.roomimage.toString('base64')
            }
        })

        res.render('landing/rooms', {
            allRoomTypeArray: allRoomType.rows
        })

    } catch (error) {
        console.error(error.message)
    }
})


module.exports = router