const path = require('path')

//- express and router
const express = require('express')
const router = express.Router()

//- pool
const pool = require(path.join(__basedir, 'config', 'db-config'))

//- utils
const formatDate = require(path.join(__basedir, 'utils', 'formatDate'))

const hotelID = __hotelID

//- render the promos page
router.get('/', async(req, res)=>{
    try {
        const q1 = `
            SELECT * FROM promos t1
            JOIN room_type t2
                ON t1.typeid = t2.typeid
            WHERE t1.hotelid = $1 AND
                status = $2
        `
        const q1result = await pool.query(q1, [hotelID, 'Active'])

        q1result.rows.forEach(row => {
            if (row.poster) {
                row.poster = 'data:' + row.imagetype + ';base64,' + row.poster.toString('base64')
            }
        })

        q1result.rows.forEach((row)=>{
            if(row.startdate){
                row.startdate = formatDate(row.startdate)
            }
            if(row.enddate){
                row.enddate = formatDate(row.enddate)
            }
        })

        res.render('landing/promo', {
            promosArray: q1result.rows
        })
    } catch (error) {
        console.error(error.message)
    }
})


module.exports = router