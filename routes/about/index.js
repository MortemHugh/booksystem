const path = require('path')

const express = require('express')
const router = express.Router()

const pool = require(path.join(__basedir, 'config', 'db-config'))


//- render the about page
router.get('/', async(req, res)=>{
    try {
        res.render('landing/about')
    } catch (error) {
        console.error(error.message)
    }
})


module.exports = router