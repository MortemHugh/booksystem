const path = require('path')

const express = require('express')
const router = express.Router()

const pool = require(path.join(__basedir, 'config', 'db-config'))

const hotelid = 'H0T1L3D7';

//- render reservation form/page
router.get('/', async(req, res)=>{
0
    //- select rooms based on room type
    const typeId = req.query.typeid;
       const roomTypeResult = await pool.query('SELECT * FROM room_type WHERE hotelid = $1 and typeid = $2', [hotelid, typeId]);

       const roomType = roomTypeResult.rows[0];
       const rooms = await pool.query(
           'SELECT * FROM rooms WHERE typeid = $1 AND hotelid = $2 AND status NOT IN ($3, $4)',
           [typeId, hotelid, 'On-Change', 'Out-of-Order']
       ); 

    res.render('reservation/reservation', {
        roomType,
        rooms: rooms.rows
    })
})

//- handle reservation
router.post('/reservation/reserve', async(req,res)=>{

    const { checkindate, checkoutdate, numofdays, adultno, childno,
        roomtype, roomid, promocode,
        fullname, address, email, contactno,
        modeofpayment, approvalcode, description, price, qty, amount
    } = req.body

    const date = getCurrentDate()

    //- insert to "guestaccounts" T
    const q1 = `
        INSERT INTO guestaccounts(hotelid, typeid, roomid, adultno, childno, checkindate, checkoutdate, numofdays, modeofpayment, promocode)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
    `
    const q1result = await pool.query(q1, [hotelid, roomtype, roomid, adultno, childno, checkindate, checkoutdate, numofdays, modeofpayment, promocode])

    //- get accountid of newly inserted record
    const accountid = q1result.rows[0].accountid

    //- insert to "guestaccount_guestdetails" T
    const q2 = `
        INSERT INTO guestaccounts_guestdetails(accountid, hotelid, fullname, email, contactno, address)
        VALUES ($1, $2, $3, $4, $5, $6)
    `
    const q2result = await pool.query(q2, [accountid, hotelid, fullname, email, contactno, address])

    //- insert to "transactions" T
    const q3 = `
        INSERT INTO transactions(hotelid, accountid, roomid, description, price, qty, amount, date, approvalcode)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `
    const q3result = await pool.query(q3, [hotelid, accountid, roomid, description, price, qty, amount, date, approvalcode])

    res.redirect('/reservation')
})


module.exports = router