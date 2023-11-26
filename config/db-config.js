const Pool = require('pg').Pool

const pool = new Pool({
    user: 'acis',
    password: 'Ofdvpi7BxtIJ9KwisfYOc6nGb5HWAbLN',
    host: 'dpg-clha9hmbbf9s73b0brp0-a',
    port: 5432, 
    database: 'fds'
})

module.exports = pool;