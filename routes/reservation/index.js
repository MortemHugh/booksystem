const path = require('path')

const express = require('express')
const router = express.Router()

const pool = require(path.join(__basedir, 'config', 'db-config'))

const publishable_key = 'pk_test_51O7aAsEiAQtmZRihVzUEUteADP6NJHHFxXoIx0Qj7MK0j0JRbUt57NEgWFYYVdgQreWdKJQD3F4DB5KipDJNpfsF00cBoERSxf'
const secret_key = 'sk_test_51O7aAsEiAQtmZRihqwrcvpx77PGEG3mwzkMNoMLF0xYn51lSNBul1jWjBC866RD1IgiESDi9ROeOgNQV1IJGAYgG00GkFl8aBM'
const stripe = require('stripe')(secret_key) 

const hotelid = 'H0T1L3D7';

const getCurrentDate = require(path.join(__basedir, 'utils', 'getCurrentDate'))
const generateReservationID = require(path.join(__basedir, 'utils', 'generateReservationID'))

const nodemailer = require('nodemailer');
const { google } = require('googleapis');

//- OAuth Credentials for email confirmation
const CLIENT_ID = "179230253575-l6kh9dr95m9rjgbqmjbi4j93brpju79t.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const REFRESH_TOKEN = "1//04BNho0_51egVCgYIARAAGAQSNwF-L9IrM2e-da-cJtjKjWrzt37R-wFhMfSvP7uZYM7c0WJ5Qi8eB9FiMlgTjha7d9b8-JkWbLE";
const REDIRECT_URI = "https://developers.google.com/oauthplayground"; //DONT EDIT THIS
const MY_EMAIL = "acisfds@gmail.com";

//- Set up the OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });


//- render reservation form/page
router.get('/', async(req, res)=>{

    //- select rooms based on room type
    const typeId = req.query.typeid;
        const roomTypeResult = await pool.query('SELECT * FROM room_type WHERE hotelid = $1 and typeid = $2', [hotelid, typeId]);
        if (roomTypeResult.rows.length === 0) {
            // Handle the case where no matching room type is found
            res.status(404).send('Room type not found');
            return;
        }
        const roomType = roomTypeResult.rows[0];

        roomTypeResult.rows.forEach(row => {
            if (row.roomimage) {
                row.roomimage = 'data:' + row.imagetype + ';base64,' + row.roomimage.toString('base64');
            }
        });
       const rooms = await pool.query(
           'SELECT * FROM rooms r JOIN room_type rt ON r.typeid = rt.typeid WHERE r.typeid = $1 AND r.hotelid = $2 AND r.status NOT IN ($3, $4)',
           [typeId, hotelid, 'On-Change', 'Out-of-Order']
       ); 
       //console.log(`typeid: ${typeId}, hotelid: ${hotelid}`);
       //console.log(roomType);
    
    res.render('reservation/reservation', {
        image: roomTypeResult.rows,
        roomType: roomType,
        key: publishable_key,
        rooms: rooms.rows 
    })
})

// handle reservation 
router.post('/reserve', async (req, res) => {
    const {
      checkindate, checkoutdate, numofdays, adultno, childno,
      roomtype, roomid, promocode,
      fullname, address, email, contactno,
      approvalcode, description, price, qty, amount
    } = req.body;
  
    const date = getCurrentDate();
    let reservationid = generateReservationID();
  
    const client = await pool.connect();   
  
    try {
        await client.query('BEGIN');

        // Check if the selected room is already reserved for the requested date range
        /*const existingReservation = await client.query(
            'SELECT * FROM reservations ' +
            'WHERE roomid = $1 ' +
            'AND ($2 >= checkindate AND $2 <= checkoutdate ' +
            'OR $3 >= checkindate AND $3 <= checkoutdate ' +
            'OR checkindate >= $2 AND checkindate <= $3 ' +
            'OR checkoutdate >= $2 AND checkoutdate <= $3)',
            [roomid, checkindate, checkoutdate]
        );
    
        if (existingReservation.rows.length > 0) {
            // Room is already reserved for the requested date range
            res.status(400).send("Room is already reserved for the selected dates. Please select other dates");
            return;
        }
        else{

        }*/

        const allRoomType = await pool.query('SELECT * FROM room_type WHERE hotelid = $1', [hotelid])

        // Convert binary data to base64 string
        allRoomType.rows.forEach(row => {
            if (row.roomimage) {
                row.roomimage = 'data:' + row.imagetype + ';base64,' + row.roomimage.toString('base64')
            }
        })

        const customer = await stripe.customers.create({
            email: req.body.stripeEmail,
            source: req.body.stripeToken,
            name: fullname,
        });
    
        // Convert amount to an integer and add two decimal places
        const amountInCents = (parseFloat(amount) * 100).toFixed(0);
    
        await stripe.charges.create({
            amount: amountInCents,
            description: 'Room Reservation Payment',
            currency: 'PHP',
            customer: customer.id
        });

        //- Get the typeid of room type
        const typeidresult = await client.query('SELECT typeid FROM room_type WHERE roomtype = $1', [roomtype]);
        const typeid = typeidresult.rows[0].typeid;
    
        if (!typeid) {
            // Handle the case where no matching room type is found
            res.status(404).send('Room type not found');
            return;
        }

        //- Get the roomnum of roomid
        const roomnumresult = await client.query('SELECT roomnum FROM rooms WHERE roomid = $1', [roomid]);
        const roomnum = roomnumresult.rows[0].roomnum;
    
        if (!roomnum) {
            // Handle the case where no matching room type is found
            res.status(404).send('Room number not found');
            return;
        }
    
        const q1 = `
            INSERT INTO reservations(reservationid, hotelid, typeid, roomid, adultno, childno, reservationdate, checkindate, checkoutdate, numofdays, promocode)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;
    
        const q1result = await client.query(q1, [reservationid, hotelid, typeid, roomid, adultno, childno, date, checkindate, checkoutdate, numofdays, promocode]);
        const reservationID = q1result.rows[0].reservationid;
    
        const q2 = `
            INSERT INTO reservation_guestdetails(reservationid, hotelid, fullname, email, contactno, address)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
    
        await client.query(q2, [reservationID, hotelid, fullname, email, contactno, address]);

        const q3 = `
            UPDATE rooms SET status = 'Reserved' WHERE hotelid = $1 AND roomid = $2
        `;
    
        await client.query(q3, [hotelid, roomid]);


        //- Generate an access token
        const ACCESS_TOKEN = await oAuth2Client.getAccessToken();

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
            type: "OAuth2",
            user: MY_EMAIL,
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            refreshToken: REFRESH_TOKEN,
            accessToken: ACCESS_TOKEN,
            },
            tls: {
            rejectUnauthorized: true,
            },
        });

        /*const htmlContent = `
            <html>
                <body>
                <h1>Reservation Confirmation</h1>
                <p>
                <strong>Hi ${fullname}!</strong> 
                We are delighted to confirm your reservation at Relax Hotel for the dates of ${checkindate} to ${checkoutdate}. We appreciate your choice to stay with us and look forward to providing you with a comfortable and memorable experience.
                Please present this email confirmation at the front desk on the date of your reservation.
                </p>
                <p><strong>Reservation Details:</strong></p>
                <ul>
                    <li><strong>Reservation ID:</strong> <span style="font-size: 24px; font-weight: bold;">${reservationid}</span></li>
                    <li><strong>Check-In Date:</strong> ${checkindate}</li>
                    <li><strong>Check-Out Date:</strong> ${checkoutdate}</li>
                    <li><strong>Number of Days:</strong> ${numofdays}</li>
                    <li><strong>Number of Adults:</strong> ${adultno}</li>
                    <li><strong>Number of Children:</strong> ${childno}</li>
                    <li><strong>Room Type:</strong> ${roomtype}</li>
                    <li><strong>Room Number:</strong> ${roomnum}</li>
                    <li><strong>Promo Code:</strong> ${promocode}</li>
                </ul>
                <p><strong>Guest Details:</strong></p>
                <ul>
                    <li><strong>Full Name:</strong> ${fullname}</li>
                    <li><strong>Address:</strong> ${address}</li>
                    <li><strong>Email:</strong> ${email}</li>
                    <li><strong>Contact Number:</strong> ${contactno}</li>
                </ul>
                <p>
                <strong>Reminder:</strong> 
                Please be informed that once a reservation is confirmed, there is no cancellation policy, and refunds will not be issued as per our terms and conditions, which were clearly stated on our website during your reservation.
                </p>
                </body>
            </html>
            `;*/
        const htmlContent = `
            <!DOCTYPE HTML PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
            <head>
            <!--[if gte mso 9]>
            <xml>
            <o:OfficeDocumentSettings>
                <o:AllowPNG/>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
            </xml>
            <![endif]-->
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="x-apple-disable-message-reformatting">
            <!--[if !mso]><!--><meta http-equiv="X-UA-Compatible" content="IE=edge"><!--<![endif]-->
            <title></title>
            
                <style type="text/css">
                @media only screen and (min-width: 620px) {
            .u-row {
                width: 600px !important;
            }
            .u-row .u-col {
                vertical-align: top;
            }

            .u-row .u-col-50 {
                width: 300px !important;
            }

            .u-row .u-col-100 {
                width: 600px !important;
            }

            }

            @media (max-width: 620px) {
            .u-row-container {
                max-width: 100% !important;
                padding-left: 0px !important;
                padding-right: 0px !important;
            }
            .u-row .u-col {
                min-width: 320px !important;
                max-width: 100% !important;
                display: block !important;
            }
            .u-row {
                width: 100% !important;
            }
            .u-col {
                width: 100% !important;
            }
            .u-col > div {
                margin: 0 auto;
            }
            }
            body {
            margin: 0;
            padding: 0;
            }

            table,
            tr,
            td {
            vertical-align: top;
            border-collapse: collapse;
            }

            p {
            margin: 0;
            }

            .ie-container table,
            .mso-container table {
            table-layout: fixed;
            }

            * {
            line-height: inherit;
            }

            a[x-apple-data-detectors='true'] {
            color: inherit !important;
            text-decoration: none !important;
            }

            table, td { color: #000000; } #u_body a { color: #0000ee; text-decoration: underline; } @media (max-width: 480px) { #u_content_image_1 .v-src-width { width: auto !important; } #u_content_image_1 .v-src-max-width { max-width: 65% !important; } #u_content_heading_1 .v-font-size { font-size: 22px !important; } #u_content_heading_2 .v-text-align { text-align: center !important; } #u_content_text_2 .v-container-padding-padding { padding: 0px 20px 20px !important; } #u_content_text_2 .v-text-align { text-align: center !important; } #u_content_heading_3 .v-text-align { text-align: center !important; } #u_content_heading_5 .v-text-align { text-align: center !important; } #u_content_text_8 .v-text-align { text-align: center !important; } #u_content_text_9 .v-text-align { text-align: center !important; } #u_content_text_15 .v-container-padding-padding { padding: 0px 20px 10px !important; } #u_content_text_13 .v-container-padding-padding { padding: 0px 20px 20px !important; } #u_content_text_13 .v-text-align { text-align: center !important; } #u_content_text_10 .v-container-padding-padding { padding: 0px 20px 10px !important; } #u_content_button_1 .v-size-width { width: 50% !important; } }
                </style>
            
            

            <!--[if !mso]><!--><link href="https://fonts.googleapis.com/css2?family=Bungee&display=swap" rel="stylesheet" type="text/css"><link href="https://fonts.googleapis.com/css?family=Rubik:400,700&display=swap" rel="stylesheet" type="text/css"><link href="https://fonts.googleapis.com/css?family=Montserrat:400,700&display=swap" rel="stylesheet" type="text/css"><!--<![endif]-->

            </head>

            <body class="clean-body u_body" style="margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: #eeeeee;color: #000000">
            <!--[if IE]><div class="ie-container"><![endif]-->
            <!--[if mso]><div class="mso-container"><![endif]-->
            <table id="u_body" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 320px;Margin: 0 auto;background-color: #eeeeee;width:100%" cellpadding="0" cellspacing="0">
            <tbody>
            <tr style="vertical-align: top">
                <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top">
                <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="background-color: #eeeeee;"><![endif]-->
                
            
            
            <div class="u-row-container" style="padding: 0px;background-color: #34449a">
            <div class="u-row" style="margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
                <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
                <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: #34449a;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: transparent;"><![endif]-->
                
            <!--[if (mso)|(IE)]><td align="center" width="600" style="background-color: #34449a;width: 600px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;" valign="top"><![endif]-->
            <div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;">
            <div style="background-color: #34449a;height: 100%;width: 100% !important;">
            <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;"><!--<![endif]-->
            
            <table id="u_content_image_1" style="font-family:'Rubik',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
            <tbody>
                <tr>
                <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:50px 10px 10px;font-family:'Rubik',sans-serif;" align="left">
                    
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
                <td class="v-text-align" style="padding-right: 0px;padding-left: 0px;" align="center">
                
                <img align="center" border="0" src="images/image-1.png" alt="email icon" title="email icon" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: inline-block !important;border: none;height: auto;float: none;width: 50%;max-width: 290px;" width="290" class="v-src-width v-src-max-width"/>
                
                </td>
            </tr>
            </table>

                </td>
                </tr>
            </tbody>
            </table>

            <table id="u_content_heading_1" style="font-family:'Rubik',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
            <tbody>
                <tr>
                <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:20px 10px 0px;font-family:'Rubik',sans-serif;" align="left">
                    
            <h1 class="v-text-align v-font-size" style="margin: 0px; color: #ffffff; line-height: 140%; text-align: center; word-wrap: break-word; font-family: 'Montserrat',sans-serif; font-size: 28px; font-weight: 400;"><strong>Online Booking Confirmation</strong></h1>

                </td>
                </tr>
            </tbody>
            </table>

            <table style="font-family:'Rubik',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
            <tbody>
                <tr>
                <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:5px 10px 40px;font-family:'Rubik',sans-serif;" align="left">
                    
            <div class="v-text-align v-font-size" style="font-size: 14px; color: #ecf0f1; line-height: 140%; text-align: center; word-wrap: break-word;">
                <p style="font-size: 14px; line-height: 140%;"><span style="font-size: 25px; line-height: 28px; font-family: Arial Black; color: #adf4ff;">${reservationid}</span></p>
            </div>

                </td>
                </tr>
            </tbody>
            </table>

            <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
            </div>
            </div>
            <!--[if (mso)|(IE)]></td><![endif]-->
                <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
                </div>
            </div>
            </div>
            
            <div class="u-row-container" style="padding: 0px;background-color: transparent">
            <div class="u-row" style="margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
                <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
                <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: transparent;"><![endif]-->
                
            <!--[if (mso)|(IE)]><td align="center" width="600" style="background-color: #eeeeee;width: 600px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;" valign="top"><![endif]-->
            <div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;">
            <div style="background-color: #eeeeee;height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
            <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;"><!--<![endif]-->
            
            <table id="u_content_heading_2" style="font-family:'Rubik',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
            <tbody>
                <tr>
                <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:35px 30px 0px;font-family:'Rubik',sans-serif;" align="left">
                    
            <h1 class="v-text-align v-font-size" style="margin: 0px; line-height: 140%; text-align: left; word-wrap: break-word; font-family: 'Rubik',sans-serif; font-size: 18px; font-weight: 400;"><strong>Hi ${fullname}!</strong></h1>

                </td>
                </tr>
            </tbody>
            </table>

            <table id="u_content_text_2" style="font-family:'Rubik',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
            <tbody>
                <tr>
                <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:0px 30px 20px;font-family:'Rubik',sans-serif;" align="left">
                    
            <div class="v-text-align v-font-size" style="font-size: 14px; line-height: 170%; text-align: left; word-wrap: break-word;">
                <p style="font-size: 14px; line-height: 170%;">We are delighted to confirm your reservation at Relax Hotel for the dates of ${checkindate} to ${checkoutdate}. We appreciate your choice to stay with us and look forward to providing you with a comfortable and memorable experience.</p>
            <p style="font-size: 14px; line-height: 170%;"> </p>
            <p style="font-size: 14px; line-height: 170%;">Please present this email confirmation at the front desk on the date of your reservation.</p>
            </div>

                </td>
                </tr>
            </tbody>
            </table>

            <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
            </div>
            </div>
            <!--[if (mso)|(IE)]></td><![endif]-->
                <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
                </div>
            </div>
            </div>

            <div class="u-row-container" style="padding: 0px;background-color: transparent">
            <div class="u-row" style="margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
                <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
                <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: transparent;"><![endif]-->
                
            <!--[if (mso)|(IE)]><td align="center" width="300" style="background-color: #eeeeee;width: 300px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;" valign="top"><![endif]-->
            <div class="u-col u-col-50" style="max-width: 320px;min-width: 300px;display: table-cell;vertical-align: top;">
            <div style="background-color: #eeeeee;height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
            <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;"><!--<![endif]-->
            
            <table id="u_content_heading_3" style="font-family:'Rubik',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
            <tbody>
                <tr>
                <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:33px 10px 0px;font-family:'Rubik',sans-serif;" align="left">
                    
            <h1 class="v-text-align v-font-size" style="margin: 0px; line-height: 140%; text-align: left; word-wrap: break-word; font-family: 'Rubik',sans-serif; font-size: 18px; font-weight: 400;"><strong>Guest Details</strong></h1>

                </td>
                </tr>
            </tbody>
            </table>

            <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
            </div>
            </div>
            <!--[if (mso)|(IE)]></td><![endif]-->
            <!--[if (mso)|(IE)]><td align="center" width="300" style="background-color: #eeeeee;width: 300px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;" valign="top"><![endif]-->
            <div class="u-col u-col-50" style="max-width: 320px;min-width: 300px;display: table-cell;vertical-align: top;">
            <div style="background-color: #eeeeee;height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
            <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;"><!--<![endif]-->
            
            <table id="u_content_heading_5" style="font-family:'Rubik',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
            <tbody>
                <tr>
                <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:33px 10px 0px;font-family:'Rubik',sans-serif;" align="left">
                    
            <h1 class="v-text-align v-font-size" style="margin: 0px; line-height: 140%; text-align: left; word-wrap: break-word; font-family: 'Rubik',sans-serif; font-size: 18px; font-weight: 400;"><strong>Reservation Details</strong></h1>

                </td>
                </tr>
            </tbody>
            </table>

            <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
            </div>
            </div>
            <!--[if (mso)|(IE)]></td><![endif]-->
                <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
                </div>
            </div>
            </div>
            
            <div class="u-row-container" style="padding: 0px;background-color: transparent">
            <div class="u-row" style="margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
                <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
                <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: transparent;"><![endif]-->
                
            <!--[if (mso)|(IE)]><td align="center" width="300" style="background-color: #eeeeee;width: 300px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;" valign="top"><![endif]-->
            <div class="u-col u-col-50" style="max-width: 320px;min-width: 300px;display: table-cell;vertical-align: top;">
            <div style="background-color: #eeeeee;height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
            <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;"><!--<![endif]-->
            
            <table id="u_content_text_8" style="font-family:'Rubik',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
            <tbody>
                <tr>
                <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:5px 10px 10px;font-family:'Rubik',sans-serif;" align="left">
                    
            <div class="v-text-align v-font-size" style="font-size: 14px; line-height: 170%; text-align: left; word-wrap: break-word;">
                <p style="font-size: 14px; line-height: 170%;"><strong>Full Name:</strong> ${fullname}<br /><strong>Address:</strong> ${address}<br /><strong>Email:</strong> ${email}<br /><strong>Contact Number:</strong> ${contactno}</p>
            </div>

                </td>
                </tr>
            </tbody>
            </table>

            <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
            </div>
            </div>
            <!--[if (mso)|(IE)]></td><![endif]-->
            <!--[if (mso)|(IE)]><td align="center" width="300" style="background-color: #eeeeee;width: 300px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;" valign="top"><![endif]-->
            <div class="u-col u-col-50" style="max-width: 320px;min-width: 300px;display: table-cell;vertical-align: top;">
            <div style="background-color: #eeeeee;height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
            <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;"><!--<![endif]-->
            
            <table id="u_content_text_9" style="font-family:'Rubik',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
            <tbody>
                <tr>
                <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:5px 10px 10px;font-family:'Rubik',sans-serif;" align="left">
                    
            <div class="v-text-align v-font-size" style="font-size: 14px; line-height: 170%; text-align: left; word-wrap: break-word;">
                <p style="font-size: 14px; line-height: 170%;"><strong>Reservation ID: <span style="color: #3598db; line-height: 23.8px;">${reservationid}</span></strong><br /><strong>Check-In Date:</strong> ${checkindate}<br /><strong>Check-Out Date:</strong> ${checkoutdate}</p>
            <p style="font-size: 14px; line-height: 170%;"><strong>Room Type:</strong> ${roomtype}<br /><strong>Room Number:</strong> ${roomnum}<br /><strong>Number of Days:</strong> ${numofdays}<br /><strong>Number of Adults:</strong> ${adultno}<br /><strong>Number of Children:</strong> ${childno}<br /><strong>Promo Code:</strong> ${promocode}</p>
            </div>

                </td>
                </tr>
            </tbody>
            </table>

            <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
            </div>
            </div>
            <!--[if (mso)|(IE)]></td><![endif]-->
                <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
                </div>
            </div>
            </div>
            
            <div class="u-row-container" style="padding: 0px;background-color: transparent">
            <div class="u-row" style="margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
                <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
                <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: transparent;"><![endif]-->
                
            <!--[if (mso)|(IE)]><td align="center" width="600" style="background-color: #eeeeee;width: 600px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;" valign="top"><![endif]-->
            <div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;">
            <div style="background-color: #eeeeee;height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
            <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;"><!--<![endif]-->
            
            <table id="u_content_text_15" style="font-family:'Rubik',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
            <tbody>
                <tr>
                <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:0px 70px 10px;font-family:'Rubik',sans-serif;" align="left">
                    
            <div class="v-text-align v-font-size" style="font-size: 14px; line-height: 140%; text-align: center; word-wrap: break-word;">
                <p style="font-size: 14px; line-height: 140%; text-align: center;"> </p>
            <p style="font-size: 14px; line-height: 140%; text-align: center;">Thank you for choosing Relax Hotel. We are committed to ensuring that your stay is relaxing and pleasant. We look forward to welcoming you on ${checkindate} and wish you safe travels until then.</p>
            </div>

                </td>
                </tr>
            </tbody>
            </table>

            <table style="font-family:'Rubik',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
            <tbody>
                <tr>
                <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:25px 10px 5px;font-family:'Rubik',sans-serif;" align="left">
                    
            <h3 class="v-text-align v-font-size" style="margin: 0px; color: #dd2b2b; line-height: 140%; text-align: left; word-wrap: break-word; font-family: 'Rubik',sans-serif; font-size: 18px; font-weight: 400;"><strong>Reminder:</strong></h3>

                </td>
                </tr>
            </tbody>
            </table>

            <table id="u_content_text_13" style="font-family:'Rubik',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
            <tbody>
                <tr>
                <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:0px 30px 20px;font-family:'Rubik',sans-serif;" align="left">
                    
            <div class="v-text-align v-font-size" style="font-size: 14px; color: #eb3737; line-height: 170%; text-align: left; word-wrap: break-word;">
                <p style="font-size: 14px; line-height: 170%;">Please be informed that once a reservation is confirmed, there is no cancellation policy, and refunds will not be issued as per our terms and conditions, which were clearly stated on our website during your reservation.</p>
            </div>

                </td>
                </tr>
            </tbody>
            </table>

            <table style="font-family:'Rubik',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
            <tbody>
                <tr>
                <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:25px 10px 5px;font-family:'Rubik',sans-serif;" align="left">
                    
            <h1 class="v-text-align v-font-size" style="margin: 0px; line-height: 140%; text-align: center; word-wrap: break-word; font-family: 'Rubik',sans-serif; font-size: 18px; font-weight: 400;"><strong>Need Help</strong></h1>

                </td>
                </tr>
            </tbody>
            </table>

            <table id="u_content_text_10" style="font-family:'Rubik',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
            <tbody>
                <tr>
                <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:0px 70px 10px;font-family:'Rubik',sans-serif;" align="left">
                    
            <div class="v-text-align v-font-size" style="font-size: 14px; line-height: 140%; text-align: center; word-wrap: break-word;">
                <p style="font-size: 14px; line-height: 140%;">Should you have any questions or need to make any changes to your reservation, please feel free to contact our reservations team at acisfds@gmail.com.</p>
            </div>

                </td>
                </tr>
            </tbody>
            </table>

            <table id="u_content_button_1" style="font-family:'Rubik',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
            <tbody>
                <tr>
                <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:10px 10px 30px;font-family:'Rubik',sans-serif;" align="left">
                    
            <!--[if mso]><style>.v-button {background: transparent !important;}</style><![endif]-->
            <div class="v-text-align" align="center">
            <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://www.unlayer.com" style="height:37px; v-text-anchor:middle; width:174px;" arcsize="11%"  stroke="f" fillcolor="#ba372a"><w:anchorlock/><center style="color:#FFFFFF;"><![endif]-->
                <a href="https://www.unlayer.com" target="_blank" class="v-button v-size-width v-font-size" style="box-sizing: border-box;display: inline-block;text-decoration: none;-webkit-text-size-adjust: none;text-align: center;color: #FFFFFF; background-color: #ba372a; border-radius: 4px;-webkit-border-radius: 4px; -moz-border-radius: 4px; width:30%; max-width:100%; overflow-wrap: break-word; word-break: break-word; word-wrap:break-word; mso-border-alt: none;font-size: 14px;">
                <span style="display:block;padding:10px 20px;line-height:120%;"><span style="font-size: 14px; line-height: 16.8px;">Contact Us</span></span>
                </a>
                <!--[if mso]></center></v:roundrect><![endif]-->
            </div>

                </td>
                </tr>
            </tbody>
            </table>

            <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
            </div>
            </div>
            <!--[if (mso)|(IE)]></td><![endif]-->
                <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
                </div>
            </div>
            </div>
            
            <div class="u-row-container" style="padding: 0px;background-color: #34449a">
            <div class="u-row" style="margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
                <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
                <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: #34449a;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: transparent;"><![endif]-->
                
            <!--[if (mso)|(IE)]><td align="center" width="600" style="background-color: #34449a;width: 600px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;" valign="top"><![endif]-->
            <div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;">
            <div style="background-color: #34449a;height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
            <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;"><!--<![endif]-->
            
            <table style="font-family:'Rubik',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
            <tbody>
                <tr>
                <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:10px 10px 40px;font-family:'Rubik',sans-serif;" align="left">
                    
            <div class="v-text-align v-font-size" style="font-size: 14px; color: #ffffff; line-height: 140%; text-align: center; word-wrap: break-word;">
                <p style="font-size: 14px; line-height: 140%;"> </p>
            <p style="font-size: 14px; line-height: 140%;">Copyright © 2023, Relax Hotel. All Rights Reserved.</p>
            </div>

                </td>
                </tr>
            </tbody>
            </table>

            <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
            </div>
            </div>
            <!--[if (mso)|(IE)]></td><![endif]-->
                <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
                </div>
            </div>
            </div>
            
                <!--[if (mso)|(IE)]></td></tr></table><![endif]-->
                </td>
            </tr>
            </tbody>
            </table>
            <!--[if mso]></div><![endif]-->
            <!--[if IE]></div><![endif]-->
            </body>

            </html>
        `; 
        
        const mailOptions = {
            from: 'acisfds@gmail.com',
            to: email,
            subject: 'Reservation Confirmation',
            html: htmlContent,
        };
    
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Email could not be sent: ' + error);
                client.query('ROLLBACK');
                res.status(500).send('Email could not be sent');
            } else {
                client.query('COMMIT');
                console.log('Email sent: ' + info.response);
                res.render('reservation/confirmation');
            }
        });
        } catch (error) {
            console.error('Error in transaction:', error);
            client.query('ROLLBACK');
            res.status(500).send('Error in reservation process');
        } finally {
            client.release();
        }
    });


router.post('/checkRoomAvailability', async (req, res) => {
    try {
        const { roomnum, checkindate, checkoutdate } = req.body;

        console.log(`Received request with roomnum: ${roomnum}, checkindate: ${checkindate}, checkoutdate: ${checkoutdate}`); // Add this line
    
        // Get the roomid of roomnum
        const roomidresult = await pool.query('SELECT roomid FROM rooms WHERE roomnum = $1', [roomnum]);
        const roomid = roomidresult.rows[0].roomid;
    
        // Query the database to check room availability
        const query = `
            SELECT *
            FROM reservations
            WHERE roomid = $1
            AND (
            (checkindate <= $2 AND checkoutdate >= $2)  -- Check-in date overlaps
            OR
            (checkindate <= $3 AND checkoutdate >= $3)  -- Checkout date overlaps
            OR
            (checkindate >= $2 AND checkoutdate <= $3)  -- New reservation is within an existing one
            );
        `;
    
        const result = await pool.query(query, [roomid, checkindate, checkoutdate]);

        console.log(`Query result: ${result.rows}`); // Add this line
    
        // If any rows are returned, the room is not available
        if (result.rows.length > 0) {
            res.json({ isAvailable: false });
        } else {
            res.json({ isAvailable: true });
        }
    } catch (error) {
        console.error('Error checking room availability:', error);
        res.status(500).json({ error: 'An error occurred while checking room availability.' });
    }
});

module.exports = router