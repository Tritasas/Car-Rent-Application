var express = require('express');
var dayjs = require('dayjs');
var locale_de = require('dayjs/locale/th')
var router = express.Router();
let formidable = require('formidable')
let fs = require('fs');
const axios = require('axios').default;
const multer = require('multer');

const url_api_employee_ite = 'https://hr.italthaiengineering.com/api_employee_ite';

const cookieParser = require('cookie-parser');
router.use(cookieParser('some_secret_1234'));
const cookieConfig = {
  httpOnly: true, 
  maxAge: 1000000000, 
  signed: true 
};

router.use(express.static(__dirname+"/public"));

let mysql = require('mysql');

////////////////////////////////////////////////////////////////////////////////////////////////////////

// Set up multer storage configuration
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/') // Destination folder for uploaded files
//   },
//   filename: function (req, file, cb) {
//     // Rename the file to prevent naming conflicts
//     cb(null, Date.now() + '-' + file.originalname);
//   }
// });

// // Initialize multer instance with the storage configuration
// const upload = multer({ storage: storage });

////////////////////////////////////////////////////////////////////////////////////////////////////////

let condb = mysql.createConnection({
  host : "localhost" , 
  user : "root" ,
  password : "" ,
  database : "db_car_rent"
})

condb.connect( function(e){
  if(e){
    throw e ;
  }
  console.log("connect to db_car_rent success 123456");
} )

// let url_now = "http://192.168.100.169:7011" // syntec-dis
// let url_now = "http://10.167.200.52:7011" // syntec-control
// let url_now = "http://172.16.5.148:7011" // syntec-office site 
let url_now = "http://10.161.200.223:7011" // syntec-office
let powerapps_link = `https://apps.powerapps.com/play/e/default-031562b8-dcd2-4b83-a934-909ce954f3ae/a/afc06fd8-dbaf-4756-89d5-9a2412ebc9e5?tenantId=031562b8-dcd2-4b83-a934-909ce954f3ae&hint=e1be904e-604c-4ab0-ba3f-89fb7eeeb478&sourcetime=1715157845081`

////////////////////////////////////////////////////////////////////////////////////////////////////////

let sessions = require("express-session");

router.use(sessions({
  secret : "secretcode" ,
  saveUninitialized : true ,
  cookie : { maxAge : 100 * 60 * 24 * 30 } , // 100 * 60 * 24 * 30 = 30 วัน
  resave : false
}))

router.use( function( req , res , next ){
  res.locals.session = req.session;
  next();
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// const sql = require('mssql')

// let dbConfig = {
//   server : "" , 
//   database : "" , 
//   user : "" , 
//   password : "" , 
//   port : ""
// }

// getEmp()

// function getEmp(){
//   let conn = new sql.connect(dbConfig);
//   let req = new sql.Request(conn);

//   conn.connect( function(err){
//     if(err){ 
//       console.log("err") 
//       console.log(err)
//       return; 
//     }
//     req.query("SELECT * FROM emp" , function(err , result){
//       if(err){throw err}
//       console.log(result)
//       conn.close();
//     })
//   } )
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// const { networkInterfaces } = require('os');

// const nets = networkInterfaces();
// const networkInfo = Object.create(null); // Or just '{}', an empty object

// for (const name of Object.keys(nets)) {
//     for (const net of nets[name]) {
//         const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
//         if (net.family === familyV4Value && !net.internal) {
//             if (!networkInfo[name]) {
//               networkInfo[name] = [];
//             }
//             networkInfo[name].push(net.address);
//         }
//     }
// }

// const ipAddress = networkInfo['Wi-Fi'][0];
// console.log("ipAddress")
// console.log(ipAddress)

// test_function_async_await()

// async function test_function_async_await(){
//   for( let i = 0 ; i < 5 ; i++ ){
//     await await_funtion(i)
//     console.log("++++")
//     console.log("++++")
//     console.log("++++")
//     console.log("++++")
//   }

//   console.log("****")
//   console.log("****")
//   console.log("****")
//   console.log("****")
 
//   function await_funtion(i){
//     return new Promise ( ( resolve , reject ) => {
//       setTimeout(() => {
//         console.log("-----------")
//         console.log(i)
//         resolve()
//       }, 1000);
//     } )
//   }

// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////// WORK SCHEDULE ////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

let cron = require('node-cron');

cron.schedule('*/1 * * * *', function(){
  auto_generate_ticket()
});

cron.schedule('30 * * * *', function(){
  let date_time = new Date()

  if( date_time.getHours() == 7 ){
    console.log('running a schedule task : admin report call');
    admin_work_today_schedule_task()
  }
});

cron.schedule('35 * * * *', async function(){
  if( date_time.getHours() == 7 ){
    console.log('running a schedule task : user report call');
    await user_req_doc_today_first_phase_schedule_task()
    await user_req_doc_today_ticket_schedule_task()
  }

  if( date_time.getHours() == 12 ){
    console.log('running a schedule task : user report call');
    await user_req_doc_today_second_phase_schedule_task()
  }
});

// user_req_doc_today_ticket_schedule_task()

function user_req_doc_today_ticket_schedule_task(){
  return new Promise( ( resolve , reject ) => {
    console.log('running a schedule task : user report function');
  
    let sql_1 = `SELECT * FROM tb_ticket_document_sub LEFT JOIN tb_ticket_document_main ON tb_ticket_document_main.tdm_id = tb_ticket_document_sub.tds_join_jdm_id 
    WHERE tb_ticket_document_sub.tds_want_date = ? AND tb_ticket_document_sub.tds_status = ?`
  
    let now = new Date(new Date().setHours(0,0,0,0))
  
    let input_1 = [
      now , 
      "อนุมัติแล้ว"
    ]
  
    condb.query( sql_1 , input_1 , function(err , result){
      if(err){throw err}
      let ticket_req_today = result

      if( ticket_req_today.length == 0 ){
        resolve()
      }else{
        let user_emails = ticket_req_today.map(item => item.tdm_user_email).join('; ');
  
        send_email( 
          user_emails , 
          "" , 
          "แจ้งเตือน : เอกสารขอยืมรถยนต์" , 
  
          `<br>
          สรุปงานประจำวัน ${dayjs(now).format("DD/MM/YYYY")} <br> 
          <br>
          คุณมีเอกสารการขอตั๋วเดินทาง Grab ในวันนี้ <br>` , 
  
          `เอกสารขอยืมรถยนต์` , 
          `${url_now}/car_rent_document_list` , 
  
          "สามารถกดที่ปุ่มด้านบนนี้ เพื่อเข้าสู่ระบบ" 
        )

        resolve()

      }
    } )
  } )
}

// user_req_doc_today_first_phase_schedule_task()
// user_req_doc_today_second_phase_schedule_task()

function user_req_doc_today_second_phase_schedule_task(){
  return new Promise( ( resolve , reject ) => {
    console.log('running a schedule task : user report function');
  
    let sql_1 = `SELECT * FROM tb_car_rent_document_sub 
    LEFT JOIN tb_car_rent_document_main ON tb_car_rent_document_main.cdm_id = tb_car_rent_document_sub.cds_join_cdm_id 
    LEFT JOIN tb_car_list ON tb_car_list.car_id = tb_car_rent_document_sub.cds_join_car_id 
    WHERE tb_car_rent_document_sub.cds_date = ? AND tb_car_rent_document_sub.cds_status = ? AND tb_car_rent_document_sub.cds_phase = ?`
  
    let now = new Date(new Date().setHours(0,0,0,0))
  
    let input_1 = [
      now , 
      "อนุมัติแล้ว" , 
      "ช่วงบ่าย"
    ]
  
    condb.query( sql_1 , input_1 , function(err , result){
      if(err){throw err}
      let work_today_second_phase = result

      if( work_today_second_phase.length == 0 ){
        resolve()
      }else{
        let user_emails = work_today_second_phase.map(item => item.cdm_for_person_email).join('; ');
  
        send_email( 
          user_emails , 
          "" , 
          "แจ้งเตือน : เอกสารขอยืมรถยนต์" , 
  
          `<br>
          สรุปงานประจำวัน ${dayjs(now).format("DD/MM/YYYY")} <br> 
          <br>
          คุณมีเอกสารขอยืมรถยนต์วันนี้ ในช่วงบ่าย <br>` , 
  
          `เอกสารขอยืมรถยนต์` , 
          `${url_now}/home` , 
  
          "สามารถกดที่ปุ่มด้านบนนี้ เพื่อเข้าสู่ระบบ" 
        )

        resolve()

      }
    } )
  } )
}

function user_req_doc_today_first_phase_schedule_task(){
  return new Promise( ( resolve , reject ) => {
    console.log('running a schedule task : user report function');
  
    let sql_1 = `SELECT * FROM tb_car_rent_document_sub 
    LEFT JOIN tb_car_rent_document_main ON tb_car_rent_document_main.cdm_id = tb_car_rent_document_sub.cds_join_cdm_id 
    LEFT JOIN tb_car_list ON tb_car_list.car_id = tb_car_rent_document_sub.cds_join_car_id 
    WHERE tb_car_rent_document_sub.cds_date = ? AND tb_car_rent_document_sub.cds_status = ? AND tb_car_rent_document_sub.cds_phase = ?`
  
    let now = new Date(new Date().setHours(0,0,0,0))
  
    let input_1 = [
      now , 
      "อนุมัติแล้ว" , 
      "ช่วงเช้า"
    ]
  
    condb.query( sql_1 , input_1 , function(err , result){
      if(err){throw err}
      let work_today_first_phase = result

      if(work_today_first_phase.length == 0){
        resolve()
      }else{
        let user_emails = work_today_first_phase.map(item => item.cdm_for_person_email).join('; ');
  
        send_email( 
          user_emails , 
          "" , 
          "แจ้งเตือน : เอกสารขอยืมรถยนต์" , 
  
          `<br>
          สรุปงานประจำวัน ${dayjs(now).format("DD/MM/YYYY")} <br> 
          <br>
          คุณมีเอกสารขอยืมรถยนต์วันนี้ ในช่วงเช้า <br>` , 
  
          `เอกสารขอยืมรถยนต์` , 
          `${url_now}/home` , 
  
          "สามารถกดที่ปุ่มด้านบนนี้ เพื่อเข้าสู่ระบบ" 
        )

        resolve()
      }
    } )
  } )
}

function admin_work_today_schedule_task(){

  console.log('running a schedule task : admin report function');

  let sql_1 = `SELECT * FROM tb_car_rent_document_sub 
  LEFT JOIN tb_car_rent_document_main ON tb_car_rent_document_main.cdm_id = tb_car_rent_document_sub.cds_join_cdm_id 
  LEFT JOIN tb_car_list ON tb_car_list.car_id = tb_car_rent_document_sub.cds_join_car_id 
  WHERE tb_car_rent_document_sub.cds_date = ? AND tb_car_rent_document_sub.cds_status = ? AND tb_car_rent_document_sub.cds_phase = ?`

  let sql_2 = `SELECT * FROM tb_car_rent_document_sub 
  LEFT JOIN tb_car_rent_document_main ON tb_car_rent_document_main.cdm_id = tb_car_rent_document_sub.cds_join_cdm_id 
  LEFT JOIN tb_car_list ON tb_car_list.car_id = tb_car_rent_document_sub.cds_join_car_id 
  WHERE tb_car_rent_document_sub.cds_date = ? AND tb_car_rent_document_sub.cds_status = ? AND tb_car_rent_document_sub.cds_phase = ?`

  let sql_3 = `SELECT * FROM tb_ticket_document_sub WHERE tb_ticket_document_sub.tds_want_date = ? AND tb_ticket_document_sub.tds_status = ?`

  let sql_4 = `SELECT * FROM tb_user_in_app WHERE tb_user_in_app.user_enable = ? AND ( tb_user_in_app.user_admin = ? OR tb_user_in_app.user_master_admin = ? )`

  let now = new Date(new Date().setHours(0,0,0,0))

  let input_1 = [
    now , 
    "อนุมัติแล้ว" , 
    "ช่วงเช้า"
  ]

  let input_2 = [
    now , 
    "อนุมัติแล้ว" , 
    "ช่วงบ่าย"
  ]

  let input_3 = [
    now , 
    "อนุมัติแล้ว"
  ]

  let input_4 = [
    "ใช้งาน" , 
    "ใช่" , 
    "ใช่" , 
  ]

  condb.query( sql_1 , input_1 , function(err , result){
    if(err){throw err}
    let work_today_first_phase = result
    
    condb.query( sql_2 , input_2 , function(err , result){
      if(err){throw err}
      let work_today_second_phase = result

      condb.query( sql_3 , input_3 , function(err , result){
        if(err){throw err}
        let ticket_req_today = result

        condb.query( sql_4 , input_4 , function(err , result){
          if(err){throw err}
          let admin_data = result

          let admin_names = admin_data.map(item => item.user_nane_en + " " + item.user_surname_en + " (แอดมินระบบ)").join('; ');
          let admin_emails = admin_data.map(item => item.user_email).join('; ');

          send_email( 
            admin_emails , 
            "เรียน " + admin_names , 
            "แจ้งเตือน : เอกสารขอยืมรถยนต์" , 
  
            `<br>
            สรุปงานประจำวัน ${dayjs(now).format("DD/MM/YYYY")} <br> 
            <br>
            เอกสารขอยืมรถยนต์วันนี้ ในช่วงเช้า จำนวน ${work_today_first_phase.length} ฉบับ <br>
            เอกสารขอยืมรถยนต์วันนี้ ในช่วงบ่าย จำนวน ${work_today_second_phase.length} ฉบับ <br>
            เอกสารการขอตั๋วเดินทาง Grab วันนี้ จำนวน ${ticket_req_today.length} ฉบับ <br>` , 
  
            `เอกสารขอยืมรถยนต์` , 
            `${url_now}/admin_job_schedule_today` , 
  
            "สามารถกดที่ปุ่มด้านบนนี้ เพื่อเข้าสู่ระบบ" 
          )
        } )
      } )
    } )
  } )
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/login/:nane_en/:surname_en/:email/:division/:job_title/:office_location" , function(req , res){
  let nane_en = req.params.nane_en
  let surname_en = req.params.surname_en
  let email = req.params.email
  let division = req.params.division
  let job_title = req.params.job_title
  let office_location = req.params.office_location
  
  if( email == "" ){

  }else{

    let sql_1 = `SELECT * FROM tb_user_in_app WHERE user_email = ?`

    condb.query( sql_1 , email , async function(err , result){
      if(err){throw err}

      if(result.length == 0){
        console.log("111111111111111111")
        let user_data = await function_for_on_user_data()
        let status_login = await set_cookie(user_data)
        redirect(status_login , user_data)
      }else{
        console.log("2222222222222222222")
        let user_data = result
        let status_login = await set_cookie(user_data)
        redirect(status_login , user_data)
      }

      async function redirect(status_login , user_data){
        if( status_login == "success" ){

          if( req.cookies.cr_save_old_url == null || req.cookies.cr_save_old_url == "" ){
            check_division_and_insert(user_data);
            res.redirect( "/home" )
          }else{
            let old_url = req.cookies.cr_save_old_url
            res.cookie( "cr_save_old_url", "" );
            res.redirect( old_url )
          }
        }else{
          res.redirect( "/user_list_not_enable" )
        }
      }

      function check_division_and_insert(user_data){

        let sql_5 = `SELECT * FROM tb_division WHERE tb_division.div_name = ?`
        let sql_6 = `INSERT INTO tb_division 
        (div_create_by_user_app_id , div_create_by_name , div_create_by_email , div_create_by_division , div_create_timestamp , div_name) 
        VALUES (? , ? , ? , ? , ? , ?)`

        let timestamp = Date.now();

        condb.query( sql_5 , user_data[0].user_division , function(err , result){
          if(err){throw err}
          if( result.length == 0 ){
            let input_6 = [
              user_data[0].user_id , 
              user_data[0].user_nane_en + " " + user_data[0].user_surname_en , 
              user_data[0].user_email , 
              user_data[0].user_division , 
              timestamp ,
              user_data[0].user_division 
            ]
            condb.query( sql_6 , input_6 , function(err , result){
              if(err){throw err}
              return;
            } )
          }else{
            return;
          }
        } )
      };

      function set_cookie( user_data ){
        return new Promise( async (resolve , reject) => {
          if( user_data[0].user_enable == 'ใช้งาน' ){
            res.cookie( "cr_user_app_id", user_data[0].user_id );
            res.cookie( "cr_user_app_name_th", user_data[0].user_nane_th );
            res.cookie( "cr_user_app_surname_th", user_data[0].user_surname_th );
            res.cookie( "cr_user_app_name_en", user_data[0].user_nane_en );
            res.cookie( "cr_user_app_surname_en", user_data[0].user_surname_en );
            res.cookie( "cr_user_app_email", user_data[0].user_email );
            res.cookie( "cr_user_app_division", user_data[0].user_division );
            res.cookie( "cr_user_app_job_title", user_data[0].user_job_title );
            res.cookie( "cr_user_app_office_location", user_data[0].user_office_location );

            await check_row( user_data[0].user_email , res )

            resolve("success");
          }else{

            resolve("error");
          }
        })
      }

      function function_for_on_user_data(){
        return new Promise( (resolve , reject) => {
          let sql_2 = `INSERT INTO tb_user_in_app (user_nane_en , user_surname_en , user_email , user_division , user_job_title , user_office_location) VALUES (? , ? , ? , ? , ? , ?)`
          let sql_3 = `SELECT * FROM tb_user_in_app WHERE user_email = ?`
          let input_2 = [
            nane_en , 
            surname_en , 
            email , 
            division , 
            job_title , 
            office_location
          ]
  
          condb.query( sql_2 , input_2 , function(err , result){
            if(err){reject(err)}
  
            condb.query( sql_3 , email , function(err , result){
              if(err){reject(err)}
  
              console.log("result")
              console.log(result)

              resolve(result);
            } )
          } )
        } )
      }
    } )
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get("/user_list_in_application" , async function(req , res){

  if( req.cookies.cr_user_app_email == null || req.cookies.cr_user_app_email == "" ){
    res.cookie( "cr_save_old_url", `/user_list_in_application` );
    res.redirect( powerapps_link )

  }else{

    await check_row( req.cookies.cr_user_app_email , res )

    console.log( req.cookies.cr_user_row )

    let sql_1 = `SELECT * FROM tb_user_in_app`
  
    condb.query( sql_1 , function(err , result){
      if(err){throw err}
      let user_list = result
  
      res.render("user_list" , {user_data : req.cookies , user_list : user_list , dayjs : dayjs});
    } )
  }
})

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function check_row( email_checking , res ){
  return new Promise( (resolve , reject) => {
    let sql_1 = `SELECT * FROM tb_user_in_app WHERE tb_user_in_app.user_email = ?`

    condb.query( sql_1 , email_checking , function(err , result){
      if(err){throw err}
      let user_data = result

      if( user_data.length == 0 ){
        res.cookie( "cr_user_app_email", "" )
        resolve()
      }else{
        res.cookie( "cr_user_row", { enable : user_data[0].user_enable , admin : user_data[0].user_admin , master_admin : user_data[0].user_master_admin , system_admin : user_data[0].user_system_admin } )
        resolve()
      }
    } )
  } )
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/update_user_enable" , function(req , res){
  let sql_1 = `UPDATE tb_user_in_app SET user_enable = ? WHERE tb_user_in_app.user_id = ?`

  let input_1 = []

  if( req.body.value == "true" ){
    input_1 = [ "ใช้งาน" , req.body.user_id ]
  }else{
    input_1 = [ "ไม่ใช้งาน" , req.body.user_id ]
  }

  condb.query( sql_1 , input_1 , function(err , result){
    if(err){throw err}

    res.end();
  } )

} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/update_user_admin" , function(req , res){
  let sql_1 = `UPDATE tb_user_in_app SET user_admin = ? WHERE tb_user_in_app.user_id = ?`

  let input_1 = []

  if( req.body.value == "true" ){
    input_1 = [ "ใช่" , req.body.user_id ]
  }else{
    input_1 = [ "ไม่ใช่" , req.body.user_id ]
  }

  condb.query( sql_1 , input_1 , function(err , result){
    if(err){throw err}

    res.end();
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/update_user_master_admin" , function(req , res){
  let sql_1 = `UPDATE tb_user_in_app SET user_master_admin = ? WHERE tb_user_in_app.user_id = ?`

  let input_1 = []

  if( req.body.value == "true" ){
    input_1 = [ "ใช่" , req.body.user_id ]
  }else{
    input_1 = [ "ไม่ใช่" , req.body.user_id ]
  }

  condb.query( sql_1 , input_1 , function(err , result){
    if(err){throw err}

    res.end();
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/update_user_system_admin" , function(req , res){
  let sql_1 = `UPDATE tb_user_in_app SET user_system_admin = ? WHERE tb_user_in_app.user_id = ?`

  let input_1 = []

  if( req.body.value == "true" ){
    input_1 = [ "ใช่" , req.body.user_id ]
  }else{
    input_1 = [ "ไม่ใช่" , req.body.user_id ]
  }

  condb.query( sql_1 , input_1 , function(err , result){
    if(err){throw err}

    res.end();
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get("/user_list_not_enable" , function(req , res){
  res.send("ผู้ใช้งานนี้ ปิดใช้งานแล้ว")
})

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/home" , async function(req , res){
  if( req.cookies.cr_user_app_email == null || req.cookies.cr_user_app_email == "" ){
    res.cookie( "cr_save_old_url", `/home` );
    res.redirect( powerapps_link )

  }else{

    let sql_1 = `SELECT * FROM tb_car_rent_document_main 
    LEFT JOIN tb_car_rent_document_sub ON tb_car_rent_document_main.cdm_id = tb_car_rent_document_sub.cds_join_cdm_id 
    LEFT JOIN tb_car_list ON tb_car_list.car_id = tb_car_rent_document_sub.cds_join_car_id 
    WHERE ( tb_car_rent_document_sub.cds_status = "ส่งรถแล้ว" OR tb_car_rent_document_sub.cds_status = "รับรถแล้ว" ) AND tb_car_rent_document_main.cdm_for_person_email = ? `

    let sql_2 = `SELECT * FROM tb_car_rent_document_main 
    LEFT JOIN tb_division_approver 
    ON tb_car_rent_document_main.cdm_for_person_division_id = tb_division_approver.dap_join_div_id 
    WHERE tb_division_approver.dap_approver_email = ? AND tb_car_rent_document_main.cdm_status = "บันทึกแล้ว"`

    let sql_3 = `SELECT * FROM tb_car_rent_document_main 
    LEFT JOIN tb_car_rent_document_sub ON tb_car_rent_document_main.cdm_id = tb_car_rent_document_sub.cds_join_cdm_id 
    LEFT JOIN tb_car_list ON tb_car_list.car_id = tb_car_rent_document_sub.cds_join_car_id 
    WHERE (tb_car_rent_document_sub.cds_status = "อนุมัติแล้ว" OR tb_car_rent_document_sub.cds_status = "ส่งรถแล้ว" OR tb_car_rent_document_sub.cds_status = "รับรถแล้ว" OR tb_car_rent_document_sub.cds_status = "คืนรถแล้ว" OR tb_car_rent_document_sub.cds_status = "สำเร็จแล้ว") 
    AND tb_car_rent_document_sub.cds_date = ?`

    condb.query( sql_1 , req.cookies.cr_user_app_email , async function(err , result){
      if(err){throw err}
      let document_waiting_data = result

      condb.query( sql_2 , req.cookies.cr_user_app_email , async function(err , result){
        if(err){throw err}
        let document_approve_data = result
  
        condb.query( sql_3 , new Date(new Date().setHours(0,0,0,0)) , async function(err , result){
          if(err){throw err}
          let document_action_data = result
          await check_row( req.cookies.cr_user_app_email , res )
          res.render("home" , {user_data : req.cookies , document_action_data : await prepare_data_json(document_action_data) , document_waiting_data : await prepare_data_json(document_waiting_data) , document_approve_data : await prepare_data_json(document_approve_data) , dayjs : dayjs});
        } )
      } )
    } )
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/receive_car" , function(req , res){
  let sql_1 = `UPDATE tb_car_rent_document_sub SET cds_status = ? , cds_receive_user_id = ? , cds_receive_user_name = ? , cds_receive_user_email = ? , cds_receive_user_division = ? , cds_receive_date = ? WHERE tb_car_rent_document_sub.cds_id = ?`

  let input_1 = [
    "รับรถแล้ว" , 
    req.cookies.cr_user_app_id , 
    req.cookies.cr_user_app_name_en + " " + req.cookies.cr_user_app_surname_en , 
    req.cookies.cr_user_app_email , 
    req.cookies.cr_user_app_division , 
    new Date() , 
    req.body.sub_document_id
  ]

  condb.query( sql_1 , input_1 , function(err , result){
    if(err){throw err}

    res.end();
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/refueling_document/:sub_document_id" , function(req , res){
  let sql_1 = `SELECT * FROM tb_car_rent_document_sub WHERE tb_car_rent_document_sub.cds_id = ?`
  let sql_2 = `SELECT * FROM tb_refueling_document WHERE tb_refueling_document.rd_join_cds_id = ? ORDER BY tb_refueling_document.rd_id DESC`
  let sql_3 = `SELECT * FROM tb_car_rent_document_main WHERE tb_car_rent_document_main.cdm_id = ?`
  let sql_4 = `SELECT * FROM tb_car_list WHERE tb_car_list.car_id = ?`
  let sql_5 = `SELECT * FROM tb_expressway`
  let sql_6 = `SELECT * FROM tb_easy_pass_using_document 
  LEFT JOIN tb_expressway ON tb_expressway.epw_id = tb_easy_pass_using_document.eud_join_epw_id 
  WHERE tb_easy_pass_using_document.eud_join_cds_id = ?`

  condb.query( sql_1 , atob(req.params.sub_document_id) , function(err, result){
    if(err){throw err}
    let sub_document_data = result

    if( sub_document_data.length == 0 ){
      res.send("error code 3208")
    }else{

      condb.query( sql_2 , atob(req.params.sub_document_id) , function(err, result){
        if(err){throw err}
        let refueling_document = result

        condb.query( sql_3 , sub_document_data[0].cds_join_cdm_id , async function(err, result){
          if(err){throw err}
          let main_document_data = result
  
          if( main_document_data.length == 0 ){
            res.send("error code 3211")
          }else{
            condb.query( sql_4 , sub_document_data[0].cds_join_car_id , async function(err , result){
              if(err){throw err}
              let car_data = result

              if( car_data.length == 0 ){
                res.send("error code 3213")
              }else{

                condb.query( sql_5 , async function(err , result){
                  if(err){throw err}
                  let expressway_data = result

                  condb.query( sql_6 , atob(req.params.sub_document_id) , async function(err , result){
                    if(err){throw err}
                    let expressway_record = result
  
                    res.render( "refueling_document" , {
                      user_data : req.cookies , 
                      sub_document_data : await prepare_data_json(sub_document_data) , 
                      refueling_document : await prepare_data_json(refueling_document) , 
                      main_document_data : await prepare_data_json(main_document_data) , 
                      car_data : await prepare_data_json(car_data) , 
                      expressway_data : await prepare_data_json(expressway_data) , 
                      expressway_record : await prepare_data_json(expressway_record) , 
                      dayjs : dayjs 
                    })
                  } )
                } )
              }
            } )
          }
        } )
      } )
    }
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/insert_refueling_record" , function(req , res){
  let sql_1 = `INSERT INTO tb_refueling_document (rd_join_cds_id , rd_create_by_user_app_id , rd_create_by_name , rd_create_by_email , rd_create_by_division , rd_create_timestamp , rd_refueling_location , rd_refueling_litre , rd_refueling_price , rd_remark) 
  VALUES ( ? , ? , ? , ? , ? , ? , ? , ? , ? , ? )`

  let input_1 = [
    req.body.sub_document_id , 
    req.cookies.cr_user_app_id , 
    req.cookies.cr_user_app_name_en + " " + req.cookies.cr_user_app_surname_en , 
    req.cookies.cr_user_app_email , 
    req.cookies.cr_user_app_division , 
    Date.now() , 
    req.body.refueling_location , 
    req.body.refueling_litre , 
    req.body.refueling_price , 
    req.body.refueling_remark 
  ]

  condb.query( sql_1 , input_1 , function(err , result){
    if(err){throw err}
    
    res.end();
  } )

} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/insert_expressway_record" , function(req , res){
  let sql_1 = `INSERT INTO tb_easy_pass_using_document (eud_create_by_user_app_id , eud_create_by_name , eud_create_by_email , eud_create_by_division , eud_create_date , eud_create_timestamp , eud_join_cds_id , eud_join_epw_id , eud_remark) 
  VALUES ( ? , ? , ? , ? , ? , ? , ? , ? , ? )`

  let input_1 = [
    req.cookies.cr_user_app_id , 
    req.cookies.cr_user_app_name_en + " " + req.cookies.cr_user_app_surname_en , 
    req.cookies.cr_user_app_email , 
    req.cookies.cr_user_app_division , 
    new Date() ,
    Date.now() , 
    req.body.sub_document_id , 
    req.body.expressway_id , 
    req.body.expressway_remark_from_user , 
  ]

  condb.query( sql_1 , input_1 , function(err , result){
    if(err){throw err}
    
    res.end();
  } )

} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/delete_refueling_record" , function(req , res){
  let sql_1 = `DELETE FROM tb_refueling_document WHERE tb_refueling_document.rd_id = ?`

  condb.query( sql_1 , req.body.refueling_id , function(err , result){
    if(err){throw err}

    res.end()
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/return_car" , function(req , res){
  let sql_1 = `UPDATE tb_car_rent_document_sub SET cds_status = "คืนรถแล้ว" , cds_return_user_id = ? , cds_return_user_name = ? , cds_return_user_email = ? , cds_return_user_division = ? , cds_return_date = ? , cds_return_last_miles = ? WHERE tb_car_rent_document_sub.cds_id = ?`
  let sql_2 = `SELECT * FROM tb_car_rent_document_sub WHERE tb_car_rent_document_sub.cds_join_cdm_id = ?`
  let sql_3 = `SELECT * FROM tb_car_rent_document_sub WHERE tb_car_rent_document_sub.cds_join_cdm_id = ? AND tb_car_rent_document_sub.cds_join_cdm_id = "คืนรถแล้ว"`
  let sql_4 = `UPDATE tb_car_list SET car_last_miles = ? WHERE tb_car_list.car_id = ?`
  let sql_5 = `UPDATE tb_car_rent_document_main SET cdm_status = "สำเร็จ" WHERE tb_car_rent_document_main.cdm_id = ?`

  let input_1 = [
    req.cookies.cr_user_app_id , 
    req.cookies.cr_user_app_name_en + " " + req.cookies.cr_user_app_surname_en , 
    req.cookies.cr_user_app_email , 
    req.cookies.cr_user_app_division , 
    new Date() ,
    req.body.last_miles , 
    req.body.sub_document_id 
  ]

  condb.query( sql_1 , input_1 , function(err , result){
    if(err){throw err}

    condb.query( sql_2 , req.body.main_document_id , function(err , result){
      if(err){throw err}
      let all_sub_document_data = result
  
      condb.query( sql_3 , req.body.main_document_id , function(err , result){
        if(err){throw err}
        let success_sub_document_data = result

        condb.query( sql_4 , [req.body.last_miles , req.body.car_id] , function(err , result){ 
          if(err){throw err}

          res.end();

          // if( all_sub_document_data.length == success_sub_document_data.length ){
          //   res.end();
          // }else{
          //   condb.query( sql_5 , req.body.main_document_id , function(err , result){
          //     if(err){throw err}
          //     res.end();
          //   } )
          // }
         } )
      } )
    } )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/admin_car_checking" , function(req , res){

  let sql_1 = `UPDATE tb_car_rent_document_sub SET cds_status = "สำเร็จแล้ว" , cds_admin_checking_id = ? , cds_admin_checking_name = ? , cds_admin_checking_email = ? , cds_admin_checking_division = ? , cds_admin_checking_date = ? WHERE tb_car_rent_document_sub.cds_id = ?`
  let sql_2 = `SELECT * FROM tb_car_rent_document_sub WHERE tb_car_rent_document_sub.cds_join_cdm_id = ?`
  let sql_3 = `SELECT * FROM tb_car_rent_document_sub WHERE tb_car_rent_document_sub.cds_join_cdm_id = ? AND tb_car_rent_document_sub.cds_join_cdm_id = "สำเร็จแล้ว"`
  let sql_5 = `UPDATE tb_car_rent_document_main SET cdm_status = "สำเร็จแล้ว" WHERE tb_car_rent_document_main.cdm_id = ?`

  let input_1 = [
    req.cookies.cr_user_app_id , 
    req.cookies.cr_user_app_name_en + " " + req.cookies.cr_user_app_surname_en , 
    req.cookies.cr_user_app_email , 
    req.cookies.cr_user_app_division , 
    new Date() ,
    req.body.sub_document_id 
  ]

  condb.query( sql_1 , input_1 , function(err , result){
    if(err){throw err}

    condb.query( sql_2 , req.body.main_document_id , function(err , result){
      if(err){throw err}
      let all_sub_document_data = result
  
      condb.query( sql_3 , req.body.main_document_id , async function(err , result){
        if(err){throw err}
        let success_sub_document_data = result

        if( all_sub_document_data.length == success_sub_document_data.length ){
          condb.query( sql_5 , req.body.main_document_id , async function(err , result){
            if(err){throw err}
            await calculate_money_in_easy_pass( req.body.sub_document_id , req , res )
            res.end();
          } )
        }else{
          await calculate_money_in_easy_pass( req.body.sub_document_id , req , res )
          res.end();
        }
      } )
    } )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function calculate_money_in_easy_pass(sub_document_id , req , res){
  return new Promise( (resolve , reject) => {
    let sql_1 = `SELECT * FROM tb_car_rent_document_sub LEFT JOIN tb_car_list ON tb_car_list.car_id = tb_car_rent_document_sub.cds_join_car_id WHERE tb_car_rent_document_sub.cds_id = ?`
    let sql_2 = `SELECT * FROM tb_easy_pass_using_document 
    LEFT JOIN tb_expressway ON tb_expressway.epw_id = tb_easy_pass_using_document.eud_join_epw_id 
    WHERE tb_easy_pass_using_document.eud_join_cds_id = ?`
    let sql_3 = `INSERT INTO tb_easy_pass_recharge (epr_create_by_user_app_id , epr_create_by_name , epr_create_by_email , epr_create_by_division , epr_create_date , epr_create_timestamp , epr_join_ezp_id , epr_join_cds_id , epr_join_eud_id , epr_money , epr_remark) 
    VALUES ( ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? )`
    let sql_4 = `SELECT * FROM tb_easy_pass WHERE tb_easy_pass.ezp_id = ?`
    let sql_5 = `UPDATE tb_easy_pass SET ezp_easy_pass_money = ? WHERE tb_easy_pass.ezp_id = ?`

    condb.query( sql_1 , sub_document_id , function(err , result){
      if(err){throw err}
      let sub_document_data = result

      if(sub_document_data.length == 0){
        resolve();
      }else{
        condb.query( sql_2 , sub_document_id , function(err , result){
          if(err){throw err}
          let easy_pass_using_data = result

          if( easy_pass_using_data.length == 0 ){
            resolve();
          }else{
            let total_price = 0
            for( let i = 0 ; i < easy_pass_using_data.length ; i++ ){
              let input_3 = [
                req.cookies.cr_user_app_id , 
                req.cookies.cr_user_app_name_en + " " + req.cookies.cr_user_app_surname_en , 
                req.cookies.cr_user_app_email , 
                req.cookies.cr_user_app_division , 
                new Date() ,
                Date.now() ,
                sub_document_data[0].car_eazy_pass_id , 
                sub_document_id , 
                easy_pass_using_data[i].eud_id , 
                "-" + easy_pass_using_data[i].epw_expressway_price , 
                `รถทะเบียน : ${sub_document_data[0].car_registration_code} / ชื่อด่าน : ${easy_pass_using_data[i].epw_expressway_name} / เมื่อวันที่ : ${dayjs(easy_pass_using_data[i].eud_create_date).format("DD/MM/YYYY HH:mm:ss")} / หมายเหตุ : ${easy_pass_using_data[i].eud_remark} / ใช้งานโดย : ${sub_document_data[0].cds_return_user_name}`, 
              ]

              console.log("input_3")
              console.log(input_3)

              condb.query( sql_3 , input_3 , function(err , result){
                if(err){throw err}
                total_price += (+easy_pass_using_data[i].epw_expressway_price)

                if( i == easy_pass_using_data.length - 1 ){
                  condb.query( sql_4 , sub_document_data[0].car_eazy_pass_id , function(err , result){
                    if(err){throw err}
                    let easy_pass_card = result

                    condb.query( sql_5 , [ ((+easy_pass_card[0].ezp_easy_pass_money) - (+total_price)) , sub_document_data[0].car_eazy_pass_id] , function(err , result){
                      if(err){throw err}
                      resolve();
                    } )
                  } )
                }
              } )
            }
          }
        } )
      }
    } )
  } )
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/report_expressway" , function(req , res){
  let sql_1 = `SELECT * FROM tb_easy_pass_recharge 
  LEFT JOIN tb_easy_pass ON tb_easy_pass.ezp_id = tb_easy_pass_recharge.epr_join_ezp_id 
  LEFT JOIN tb_car_rent_document_sub ON tb_car_rent_document_sub.cds_id = tb_easy_pass_recharge.epr_join_cds_id 
  LEFT JOIN tb_easy_pass_using_document ON tb_easy_pass_using_document.eud_id = tb_easy_pass_recharge.epr_join_eud_id 
  LEFT JOIN tb_expressway ON tb_expressway.epw_id = tb_easy_pass_using_document.eud_join_epw_id 
  LEFT JOIN tb_car_list ON tb_car_list.car_id = tb_car_rent_document_sub.cds_join_car_id 
  ORDER BY tb_easy_pass_recharge.epr_id DESC`

  condb.query( sql_1 , async function(err , result){
    if(err){throw err}
    let report_expressway_data = result

    const filter_easy_pass_code = [...new Set(report_expressway_data.map(item => item.ezp_easy_pass_code))];
    const filter_expressway_name = [...new Set(report_expressway_data.map(item => item.epw_expressway_name))];
    const filter_car_registration_code = [...new Set(report_expressway_data.map(item => item.car_registration_code))];
    // const filter_phase = [...new Set(report_expressway_data.map(item => item.cds_phase))];

    console.log("report_expressway_data")
    console.log(report_expressway_data)

    res.render( "report_expressway" , {
      user_data : req.cookies , 
      report_expressway_data : await prepare_data_json(report_expressway_data) , 

      filter_easy_pass_code : filter_easy_pass_code , 
      filter_expressway_name : filter_expressway_name , 
      filter_car_registration_code : filter_car_registration_code , 
      // filter_phase : filter_phase , 

      dayjs : dayjs } )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/car_list" , function(req , res){
  if( req.cookies.cr_user_app_email == null || req.cookies.cr_user_app_email == "" ){
    res.cookie( "cr_save_old_url", `/car_list` );
    res.redirect( powerapps_link )

  }else{
    let sql_1 = `SELECT * FROM tb_car_list WHERE tb_car_list.car_status = "ใช้งานปกติ"`
    let sql_2 = `SELECT * FROM tb_car_image`
  
    condb.query( sql_1 , function(err , result){
      if(err){throw err}
      let car_list = result 
  
      condb.query( sql_2 , async function(err , result){
        if(err){throw err}
        let car_image = result 
        let car_list_have_path = []
  
        for(let i = 0 ; i < car_list.length ; i++){
          car_list_have_path.push(await set_path_image(car_list[i] , car_image))
        }
  
        res.render( "car_list" , { user_data : req.cookies , car_list : car_list_have_path , dayjs : dayjs } )
  
        function set_path_image( car_1 , car_image ){
          return new Promise( (resolve , reject) => {
            let car_image_1 = car_image.filter( function(e){
              return  e.ci_join_car_id == car_1.car_id
            } )
  
            if( car_image_1.length == 0 ){
              car_1.car_image_path = "/assets/images/400x400.png"
            }else{
              car_1.car_image_path = car_image_1[0].ci_file_part
            }
  
            resolve(car_1);
          } )
        }
      } )
    } )
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/create_new_car" , function(req , res){
  if( req.cookies.cr_user_app_email == null || req.cookies.cr_user_app_email == "" ){
    res.cookie( "cr_save_old_url", `/car_list` );
    res.redirect( powerapps_link )

  }else{
    let time_stamp = Date.now()
    let sql_1 = `INSERT INTO tb_car_list (car_create_by_user_app_id , car_create_by_name , car_create_by_email , car_create_by_division , car_create_timestamp , car_status) VALUES ( ? , ? , ? , ? , ? , ? )`
    let input_1 = [
      req.cookies.cr_user_app_id , 
      req.cookies.cr_user_app_name_en + " " + req.cookies.cr_user_app_surname_en , 
      req.cookies.cr_user_app_email , 
      req.cookies.cr_user_app_division , 
      time_stamp , 
      "กำลังสร้าง"
    ]
    let sql_2 = `SELECT * FROM tb_car_list WHERE tb_car_list.car_create_by_email = ? AND tb_car_list.car_create_timestamp = ?`
  
    condb.query( sql_1 , input_1 , function(err , result){
      if(err){throw err}

      condb.query( sql_2 , [ req.cookies.cr_user_app_email , time_stamp ] , function(err , result){
        if(err){throw err}
        
        let car_detail = result

        res.redirect( `/car_detait_edit/${btoa(car_detail[0].car_id)}` )
      } )
    } )
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/car_detait_edit/:car_id_code" , function(req , res){
  if( req.cookies.cr_user_app_email == null || req.cookies.cr_user_app_email == "" ){
    res.cookie( "cr_save_old_url", `/car_detait_edit/${req.params.car_id_code}` );
    res.redirect( powerapps_link )

  }else{
    let car_id = atob(req.params.car_id_code);
    let sql_1 = `SELECT * FROM tb_car_list WHERE tb_car_list.car_id = ?`
    let sql_2 = `SELECT * FROM tb_car_image WHERE tb_car_image.ci_join_car_id = ?`
    let sql_3 = `SELECT * FROM tb_easy_pass`
  
    condb.query( sql_1 , car_id , function(err , result){
      if(err){throw err}
      let car_detail = result
  
      condb.query( sql_2 , car_id , function(err , result){
        if(err){throw err}
        let car_image = result
  
        condb.query( sql_3 , car_id , async function(err , result){
          if(err){throw err}
          let easy_pass_data = result
    
          res.render( "car_detail_edit" , 
          {
            user_data : req.cookies , 
            car_detail : await prepare_data_json(car_detail) , 
            car_image : await prepare_data_json(car_image) , 
            easy_pass_data : await prepare_data_json(easy_pass_data) , 
            dayjs : dayjs} )
        } )
      } )
    } )
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/uploads_file/car_image/:car_id" , function(req , res){

  console.log(`/uploads_file/car_image/${req.params.car_id}`)

  let car_id = req.params.car_id
  let timestamp = Date.now()

  let dir = 'public/assets/file_upload'

  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
  }

  let form = new formidable.IncomingForm();

  form.parse( req , function(error , fields , file ){
    if (error) {
      res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
      res.end(String(err));
      return;
    }
    
    let filepath = file.fileupload.filepath
    let newpath = 'public/assets/file_upload/';
    let newpath1 = '/assets/file_upload/';
    newpath += timestamp + "-" + car_id + "-" + file.fileupload.originalFilename;
    newpath1 += timestamp + "-" + car_id + "-" + file.fileupload.originalFilename;

    console.log(`newpath`)
    console.log(newpath)

    fs.copyFile( filepath , newpath , function(err){
      if( err ){
        throw err 
      }else{
        let sql_1 = `INSERT INTO tb_car_image ( ci_create_by_user_app_id , ci_create_by_name , ci_create_by_email , ci_create_by_division , ci_join_car_id , ci_file_name , ci_file_part , ci_file_part_todelete)
        VALUE( ? , ? , ? , ? , ? , ? , ? , ? )`
        let now = new Date()
        let input_1 = [
          req.cookies.cr_user_app_id , 
          req.cookies.cr_user_app_name_en + " " + req.cookies.cr_user_app_surname_en , 
          req.cookies.cr_user_app_email , 
          req.cookies.cr_user_app_division , 
          car_id , 
          file.fileupload.originalFilename , 
          url_now + newpath1 , 
          newpath 
        ]
        condb.query( sql_1 , input_1 , function( err , result ){
          if( err ){ throw err }

          res.redirect( `/car_detait_edit/${btoa(car_id)}` )
        } )
      }
    } )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/delete_image_car" , function(req , res){

  let sql_1 = `SELECT * FROM tb_car_image WHERE tb_car_image.ci_id = ?`
  let sql_2 = `DELETE FROM tb_car_image WHERE tb_car_image.ci_id = ?`

  condb.query( sql_1 , req.body.car_image_id , function(err , result){
    if(err){throw err}
    let file_data = result

    if( file_data.length > 0 ){
      try {
        fs.unlinkSync(file_data[0].ci_file_part_todelete);
        condb.query( sql_2 , req.body.car_image_id ,function( err , result ){
          if(err){ throw err }
          
          res.end();
        } )
      } catch (error) {
        console.log(error);
      }
    }else{
      res.end();
    }
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/submit_edit_car_detail" , function(req , res){
  let sql_1 = `UPDATE tb_car_list SET car_status = ? WHERE tb_car_list.car_id = ?`
  let input_1 = [
    "ใช้งานปกติ" , 
    req.body.car_id
  ]

  condb.query( sql_1 , input_1 , function(err , result){
    if(err){throw err}

    res.contentType('application/json');
    let nextPage = JSON.stringify('/car_list')
    res.header('Content-Length', nextPage.length);
    res.end(nextPage);
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/car_detail_view/:car_id" , function(req , res){
  if( req.cookies.cr_user_app_email == null || req.cookies.cr_user_app_email == "" ){
    res.cookie( "cr_save_old_url", `/car_detail_view/${req.params.car_id}` );
    res.redirect( powerapps_link )

  }else{
    let sql_1 = `SELECT * FROM tb_car_list WHERE tb_car_list.car_id = ?`
    let sql_2 = `SELECT * FROM tb_car_image WHERE tb_car_image.ci_join_car_id = ?`
    let sql_3 = `SELECT * FROM tb_car_rent_document_sub 
    LEFT JOIN tb_car_rent_document_main 
    ON tb_car_rent_document_sub.cds_join_cdm_id = tb_car_rent_document_main.cdm_id 
    WHERE tb_car_rent_document_sub.cds_join_car_id = ? AND tb_car_rent_document_sub.cds_status <> "สร้าง"`
  
    condb.query( sql_1 , atob(req.params.car_id) , function(err , result){
      if(err){throw err}
      let car_data = result
  
      condb.query( sql_2 , atob(req.params.car_id) , function(err , result){
        if(err){throw err}
        let car_image_data = result
    
        condb.query( sql_3 , atob(req.params.car_id) , function(err , result){
          if(err){throw err}
          let document_sub_data = result
  
          console.log("document_sub_data")
          console.log(document_sub_data)
          res.render( "car_detail_view" , {user_data : req.cookies , car_image_data : car_image_data , document_sub_data : document_sub_data , car_data : car_data , dayjs : dayjs} )
        } )
      } )
    } )
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/car_rent_document_create" , function(req , res){

  if( req.cookies.cr_user_app_email == null || req.cookies.cr_user_app_email == "" ){
    res.cookie( "cr_save_old_url", `/car_rent_document_create` );
    res.redirect( powerapps_link )

  }else{
    let timestamp = Date.now()
    let sql_1 = `INSERT INTO tb_car_rent_document_main ( cdm_create_by_user_app_id , cdm_create_by_name , cdm_create_by_email , cdm_create_by_division , cdm_create_timestamp , cdm_status ) VALUES ( ? , ? , ? , ? , ? , ? )`
    let input_1 = [
      req.cookies.cr_user_app_id , 
      req.cookies.cr_user_app_name_en + " " + req.cookies.cr_user_app_surname_en , 
      req.cookies.cr_user_app_email , 
      req.cookies.cr_user_app_division , 
      timestamp ,  
      "สร้าง"
    ]
  
    let sql_2 = `SELECT * FROM tb_car_rent_document_main WHERE tb_car_rent_document_main.cdm_create_by_email = ? AND tb_car_rent_document_main.cdm_create_timestamp = ?`
  
    condb.query( sql_1 , input_1 , function( err , result ){
      if( err ){ throw err }
       
      condb.query( sql_2 , [ req.cookies.cr_user_app_email , timestamp ] , async function(err , result){
        if(err){throw err}
        let document_data = result
        let date_now = new Date()
        await generate_doccument_sub( [`${date_now.getDate()}/${date_now.getMonth()+1}/${date_now.getFullYear()}`] , document_data )
        res.redirect( `/car_rent_document_edit/${ btoa(document_data[0].cdm_id) }` );
      } )
    } )
  
    function generate_doccument_sub( array_date , document_data ){
      return new Promise( (resolve , reject) => {
        const weekday = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
        const weekdaysThai = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
        let sql_2 = `INSERT INTO tb_car_rent_document_sub (cds_join_cdm_id , cds_day , cds_day_th , cds_date , cds_phase , cds_status) VALUES ( ? , ? , ? , ? , ? , ? )`
        let sql_3 = `INSERT INTO tb_car_rent_document_sub (cds_join_cdm_id , cds_day , cds_day_th , cds_date , cds_phase , cds_status) VALUES ( ? , ? , ? , ? , ? , ? )`
        for( let i = 0 ; i < array_date.length ; i++ ){
          let date_split_array = array_date[i].split("/")
          let date = new Date(`${date_split_array[2]}-${date_split_array[1]}-${date_split_array[0]}`);
          console.log("date")
          console.log(date.getDay())
          let input_2 = [
            document_data[0].cdm_id , 
            weekday[date.getDay()] , 
            weekdaysThai[date.getDay()] , 
            `${date_split_array[2]}-${date_split_array[1]}-${date_split_array[0]}` , 
            "ช่วงเช้า" ,
            "สร้าง"
          ]
          let input_3 = [
            document_data[0].cdm_id , 
            weekday[date.getDay()] , 
            weekdaysThai[date.getDay()] , 
            `${date_split_array[2]}-${date_split_array[1]}-${date_split_array[0]}` , 
            "ช่วงบ่าย" ,
            "สร้าง"
          ]
          console.log(input_2)
          condb.query( sql_2 , input_2 , function(err , result){
            if(err){reject(err)}
  
            condb.query( sql_3 , input_3 , function(err , result){
              if(err){reject(err)}
    
              if( i == array_date.length - 1 ){
                resolve()
              }
            } )
          } )
        }
      } )
    }
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/car_rent_document_edit/:document_id" , function(req , res){

  if( req.cookies.cr_user_app_email == null || req.cookies.cr_user_app_email == "" ){
    res.cookie( "cr_save_old_url", `/car_rent_document_edit/${req.params.document_id}` );
    res.redirect( powerapps_link )

  }else{
    let sql_1 = `SELECT * FROM tb_car_rent_document_main WHERE tb_car_rent_document_main.cdm_id = ?`
    let sql_2 = `SELECT * FROM tb_driver_main WHERE tb_driver_main.dm_status = "ใช้งาน" ORDER BY tb_driver_main.dm_name_th ASC`
    let sql_3 = `SELECT * FROM tb_division`
    let sql_4 = `SELECT * FROM tb_division_approver`
  
    condb.query( sql_1 , [ atob(req.params.document_id) ] , function(err , result){
      if(err){throw err}
      let document_data = result
  
      condb.query( sql_2 , async function(err , result){
        if(err){throw err}
        let car_driver_data = result

        condb.query( sql_3 , function(err , result){
          if(err){throw err}
          let division_data = result

          condb.query( sql_4 , async function(err , result){
            if(err){throw err}
            let approver_division_data = result
  
            res.render( "car_rent_document_edit" , { 
              user_data : req.cookies , 
              document_data : await prepare_data_json(document_data) , 
              car_driver_data : await prepare_data_json(car_driver_data) , 
              division_data : await prepare_data_json(division_data) , 
              approver_division_data : await prepare_data_json(approver_division_data) , 
              dayjs : dayjs } );
          } )
        } )
      } )
    } )
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/create_sub_row" , async function (req , res){
  function getDates(startDate, endDate) {
    const dateArray = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        dateArray.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return dateArray;
  }

  const startDate = new Date(req.body.start_date);
  const endDate = new Date(req.body.end_date);

  const datesInRange = getDates(startDate, endDate);

  // Format the dates as strings (dd/mm/yyyy)
  const formattedDates = datesInRange.map(date => {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
  });

  console.log("formattedDates");
  console.log(formattedDates);

  if( req.body.type == 'redocumentsub' ){
    console.log('redocumentsub')
    let sql_0 = `UPDATE tb_car_rent_document_main SET cdm_start_date = ? , cdm_end_date = ? WHERE tb_car_rent_document_main.cdm_id = ?`
    let sql_1 = `DELETE FROM tb_car_rent_document_sub WHERE tb_car_rent_document_sub.cds_join_cdm_id = ? `

    condb.query( sql_0 , [startDate , endDate , req.body.document_id] , function(err , result){
      if(err){throw err}

      condb.query( sql_1 , req.body.document_id , async function(err , result){
        if(err){throw err}
        if( formattedDates.length > 0 ){
          await generate_doccument_sub(formattedDates)
          let new_document_sub = await query_document_sub()
          let set_date_templece = await function_set_date_templece(new_document_sub)
          let car_rent_list = await query_car_rent_list(set_date_templece)
    
          res.setHeader('Content-Type', 'application/json');
          res.send(JSON.stringify([new_document_sub , car_rent_list]));
        }else{
          res.send("")
        }
      } )
    } )
  }else{
    console.log('refresh')
    if( formattedDates.length > 0 ){
      // await generate_doccument_sub(formattedDates)
      let new_document_sub = await query_document_sub()
      let set_date_templece = await function_set_date_templece(new_document_sub)
      let car_rent_list = await query_car_rent_list(set_date_templece)

      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify([new_document_sub , car_rent_list]));
    }else{
      res.send("")
    }
  }

  function function_set_date_templece( new_document_sub ){
    return new Promise ( (resolve , reject) => {
      if( new_document_sub.length == 0 ){
        reject()
      }else{
        let array_date = []
        for( let i = 0 ; i < new_document_sub.length ; i++ ){
          let date = new_document_sub[i].cds_date

          array_date.push( { date : `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}` , phase : new_document_sub[i].cds_phase } )

          if(i == new_document_sub.length - 1){
            resolve(array_date)
          }
        }
      }
    } )
  }

  function query_car_rent_list( date_data_array ){
    return new Promise( (resolve , reject) => {
      let sql_3 = `SELECT * FROM tb_car_list WHERE tb_car_list.car_status = "ใช้งานปกติ"`
      let sql_4 = `SELECT * FROM tb_car_image`
      let sql_5 = `SELECT * FROM tb_car_rent_document_sub 
      WHERE (tb_car_rent_document_sub.cds_status <> "สร้าง" AND tb_car_rent_document_sub.cds_status <> "ถูกตีกลับ") 
      AND tb_car_rent_document_sub.cds_date = ? AND tb_car_rent_document_sub.cds_phase = ? AND tb_car_rent_document_sub.cds_join_car_id = ?`

      condb.query( sql_3 , function(err , result){
        if(err){throw err}
        let car_list = result 

        condb.query( sql_4 , async function(err , result){
          if(err){throw err}
          let car_image = result 
          let car_list_have_path = []

          for(let i = 0 ; i < car_list.length ; i++){
            car_list_have_path.push(await set_path_image(car_list[i] , car_image))
            // car_list_have_path.push(await check_busy_time(car_list[i]))
          }

          resolve(car_list_have_path)

          function check_busy_time( car_1 ){
            return new Promise( (resolve , reject) => {
              
              car_1.car_status_time = "free"
              car_1.car_busy_time = []

              for( let i = 0 ; i < date_data_array.length ; i++ ){

                let date_split_array = (date_data_array[i].date).split("/")

                condb.query( sql_5 , [`${date_split_array[2]}-${date_split_array[1]}-${date_split_array[0]}` , date_data_array[i].phase , car_1.car_id] , function(err , result){
                  if(err){reject(err)}

                  console.log("sql_5 ///////////////////////////////////////////////////////")
                  console.log(result)

                  if( result.length > 0 ){
                    console.log("not free")
                    car_1.car_status_time = "not free"

                    console.log(result[0].cds_id)
                    console.log(result[0].cds_date)

                    car_1.car_busy_time.push(result[0].cds_date)
                  }

                  if( i == date_data_array.length - 1 ){
                    resolve(car_1);
                  }
                } )
              }
            } )
          }

          async function set_path_image( car_1 , car_image ){
            return new Promise( async (resolve , reject) => {
              let car_image_1 = car_image.filter( function(e){
                return  e.ci_join_car_id == car_1.car_id
              } )

              if( car_image_1.length == 0 ){
                car_1.car_image_path = "/assets/images/400x400.png"
              }else{
                car_1.car_image_path = car_image_1[0].ci_file_part
              }

              car_1 = await check_busy_time( car_1 )

              resolve(car_1);
            } )
          }
        } )
      } )
    } )
  }

  function query_document_sub(){
    return new Promise( (resolve , reject) => {
      condb.query( "SELECT * FROM tb_car_rent_document_sub WHERE tb_car_rent_document_sub.cds_join_cdm_id = ? ORDER BY tb_car_rent_document_sub.cds_date ASC" , req.body.document_id , function(err , result){
        if(err){reject(err)}
        resolve(result)
      } )
    } )
  }

  function generate_doccument_sub( array_date ){
    return new Promise( (resolve , reject) => {
      const weekday = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
      const weekdaysThai = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
      let sql_2 = `INSERT INTO tb_car_rent_document_sub (cds_join_cdm_id , cds_day , cds_day_th , cds_date , cds_phase , cds_status) VALUES ( ? , ? , ? , ? , ? , ? )`
      let sql_3 = `INSERT INTO tb_car_rent_document_sub (cds_join_cdm_id , cds_day , cds_day_th , cds_date , cds_phase , cds_status) VALUES ( ? , ? , ? , ? , ? , ? )`
      for( let i = 0 ; i < array_date.length ; i++ ){
        let date_split_array = array_date[i].split("/")
        let date = new Date(`${date_split_array[2]}-${date_split_array[1]}-${date_split_array[0]}`);
        console.log("date")
        console.log(date.getDay())
        let input_2 = [
          req.body.document_id , 
          weekday[date.getDay()] , 
          weekdaysThai[date.getDay()] , 
          `${date_split_array[2]}-${date_split_array[1]}-${date_split_array[0]}` , 
          "ช่วงเช้า" ,
          "สร้าง"
        ]
        let input_3 = [
          req.body.document_id , 
          weekday[date.getDay()] , 
          weekdaysThai[date.getDay()] , 
          `${date_split_array[2]}-${date_split_array[1]}-${date_split_array[0]}` , 
          "ช่วงบ่าย" ,
          "สร้าง"
        ]
        console.log(input_2)
        condb.query( sql_2 , input_2 , function(err , result){
          if(err){reject(err)}

          condb.query( sql_3 , input_3 , function(err , result){
            if(err){reject(err)}
  
            if( i == array_date.length - 1 ){
              resolve()
            }
          } )
        } )
      }
    } )
  }

} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/submit_document_car_rent" , function(req , res){
  let sql_1 = `SELECT * FROM tb_car_rent_document_sub WHERE tb_car_rent_document_sub.cds_join_cdm_id = ? `
  let sql_2 = `SELECT * FROM tb_car_rent_document_sub WHERE tb_car_rent_document_sub.cds_status = "บันทึกแล้ว" AND tb_car_rent_document_sub.cds_join_car_id = ?`

  condb.query( sql_1 , req.body.document_id , function(err , result){
    if(err){throw err}
    let document_sub_data = result 

    condb.query( sql_2 , req.body.car_id , async function(err , result){
      if(err){throw err}
      let document_sub_submited_data = result 
  
      let same_date_array = await find_same_date(document_sub_data , document_sub_submited_data)
      console.log("same_date_array")
      console.log(same_date_array)

      if( same_date_array.length == 0 ){
        await update_status_document()
        await send_email_to_approver( req.body.document_id )
        console.log("return 1")

        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(["submit success" , "/home"]));
      }else{
        console.log("return 2")

        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(["connot submit" , same_date_array]));
      }
    } )
  } )

  function update_status_document(){
    return new Promise( (resolve , reject) => {
      let sql_3 = `UPDATE tb_car_rent_document_main SET cdm_status = ? WHERE tb_car_rent_document_main.cdm_id = ?`
      let sql_4 = `UPDATE tb_car_rent_document_sub SET cds_status = ? , cds_join_car_id = ? WHERE tb_car_rent_document_sub.cds_join_cdm_id = ?`
      let sql_5 = `SELECT * FROM tb_car_rent_document_main WHERE tb_car_rent_document_main.cdm_id = ?`
      let sql_6 = `INSERT INTO tb_driver_sub (ds_join_dm_id , ds_join_doc_id) VALUES ( ? , ? )`

      condb.query( sql_3 , [ "บันทึกแล้ว" , req.body.document_id ] , function(err , result){
        if(err){reject(err)}
        console.log("update 1")

        condb.query( sql_4 , [ "บันทึกแล้ว" , req.body.car_id , req.body.document_id ] , function(err , result){
          if(err){reject(err)}
          console.log("update 2") 

          condb.query( sql_5 , req.body.document_id , function(err , result){
            if(err){throw err}
            let document_data = result 
        
            condb.query( sql_6 , [ document_data[0].cdm_driver_id , req.body.document_id ] , function(err , result){
              if(err){throw err}
              resolve()
            } )
          } )
        } )
      } )
    } )
  }

  function find_same_date(document_sub_data , document_sub_submited_data){
    return new Promise( (resolve , reject) => {
      let same_date_array = []
      for( let i = 0 ; i < document_sub_data.length ; i++ ){
        let same_date = document_sub_submited_data.filter( function(e){
          return  new Date(e.cds_date).getTime() == new Date(document_sub_data[i].cds_date).getTime()
        } )

        if( same_date.length > 0 ){
          console.log("pust array")
          same_date_array.push(same_date[0].cds_date)
        }

        if( i == document_sub_data.length - 1 ){
          console.log("exit loop")
          resolve(same_date_array)
        }
      }
    } )
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function send_email_to_approver( document_id ){
  return new Promise( (resolve , reject) => {
    let sql_7 = `SELECT * FROM tb_car_rent_document_main WHERE tb_car_rent_document_main.cdm_id = ?`
    let sql_8 = `SELECT * FROM tb_division_approver WHERE tb_division_approver.dap_join_div_id = ?`

    condb.query( sql_7 , document_id , function(err , result){
      if(err){throw err}
      let main_document_data = result

      condb.query( sql_8 , main_document_data[0].cdm_for_person_division_id , function(err , result){
        if(err){throw err}
        let approver_data = result

        if( approver_data.length > 0 ){
          let approver_emails = approver_data.map(item => item.dap_approver_email).join('; ');
          let approver_name = approver_data.map(item => item.dap_approver_name).join(', ');

          send_email( 
            approver_emails , 
            "เรียน " + approver_name , 
            "ต้องอนุมัติ : เอกสารขอยืมรถยนต์" , 

            `เอกสารขอยืมรถยนต์ รออนุมัติจากคุณ  <br><br>
            ผู้สร้างเอกสาร : ${main_document_data[0].cdm_create_by_name} / ${main_document_data[0].cdm_create_by_division} / ${main_document_data[0].cdm_create_by_email} <br> 
            ผู้ขอใช้ : ${main_document_data[0].cdm_for_person} / ${main_document_data[0].cdm_for_person_division} / ${main_document_data[0].cdm_for_person_email} <br>
            <br>
            มีความประสงค์ขอใช้รถไปยังสถานที่ : ${main_document_data[0].cdm_destination_location} <br> 
            เพื่อ : ${main_document_data[0].cdm_for_what} <br>
            ประเภทการขับ/ชื่อคนขับ : ${main_document_data[0].cdm_driver_type} / ${main_document_data[0].cdm_driver_name} <br>` , 

            `เอกสารขอยืมรถยนต์` , 
            `${url_now}/car_rent_document_approve_view/${btoa(main_document_data[0].cdm_id)}` , 

            "สามารถกดที่ปุ่มด้านบนนี้ เพื่อเข้าสู่ระบบ" 
          )

          resolve()
        }else{
          resolve()
        }
      } )
    } )
  } )
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/car_rent_document_list" , function(req , res){

  if( req.cookies.cr_user_app_email == null || req.cookies.cr_user_app_email == "" ){
    res.cookie( "cr_save_old_url", `/car_rent_document_list` );
    res.redirect( powerapps_link )

  }else{

    let sql_1 = `SELECT * FROM tb_car_rent_document_main WHERE tb_car_rent_document_main.cdm_create_by_email = ? AND tb_car_rent_document_main.cdm_status <> ? ORDER BY tb_car_rent_document_main.cdm_id DESC `
    let sql_2 = `SELECT * FROM tb_ticket_document_main WHERE tb_ticket_document_main.tdm_create_by_email = ? AND tb_ticket_document_main.tdm_status <> ? ORDER BY tb_ticket_document_main.tdm_id DESC `
  
    condb.query( sql_1 , [req.cookies.cr_user_app_email , "สร้าง"] , function(err , result){
      if(err){throw err}
      let document_data = result

      condb.query( sql_2 , [req.cookies.cr_user_app_email , "สร้าง"] , async function(err , result){
        if(err){throw err}
        let ticket_request_document_data = result

        res.render( "car_rent_document_list" , 
        {
          user_data : req.cookies , 
          document_data : await prepare_data_json(document_data) , 
          ticket_request_document_data : await prepare_data_json(ticket_request_document_data) , 
          dayjs : dayjs
        } )
      } )
    } )
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/car_rent_document_approve_list" , function(req , res){

  if( req.cookies.cr_user_app_email == null || req.cookies.cr_user_app_email == "" ){
    res.cookie( "cr_save_old_url", `/car_rent_document_list` );
    res.redirect( powerapps_link )

  }else{
    // let sql_1 = `SELECT * FROM tb_car_rent_document_main 
    // LEFT JOIN tb_division_approver 
    // ON tb_car_rent_document_main.cdm_for_person_division_id = tb_division_approver.dap_join_div_id 
    // WHERE tb_car_rent_document_main.cdm_status = "บันทึกแล้ว" AND tb_division_approver.dap_approver_email = ?`

    let sql_1 = `SELECT * FROM tb_car_rent_document_main 
    LEFT JOIN tb_division_approver 
    ON tb_car_rent_document_main.cdm_for_person_division_id = tb_division_approver.dap_join_div_id 
    WHERE tb_division_approver.dap_approver_email = ? AND tb_car_rent_document_main.cdm_status = "บันทึกแล้ว"`

    let sql_2 = `SELECT * FROM tb_ticket_document_main 
    LEFT JOIN tb_division_approver 
    ON tb_ticket_document_main.tdm_user_division_id = tb_division_approver.dap_join_div_id 
    WHERE tb_division_approver.dap_approver_email = ? AND tb_ticket_document_main.tdm_status = "บันทึกแล้ว"`

    condb.query( sql_1 , req.cookies.cr_user_app_email , async function (err , result){
      if(err){throw err}
      let car_rent_document_approve_list = result

      condb.query( sql_2 , req.cookies.cr_user_app_email , async function (err , result){
        if(err){throw err}
        let ticket_requset_document_approve_list = result
  
        res.render( "car_rent_document_approve_list" , 
        {
          user_data : req.cookies , 
          car_rent_document_approve_list : await prepare_data_json(car_rent_document_approve_list) , 
          ticket_requset_document_approve_list : await prepare_data_json(ticket_requset_document_approve_list) , 
          dayjs : dayjs
        } )
      } )
    } )
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/car_rent_document_view/:document_id" , function(req , res){

  if( req.cookies.cr_user_app_email == null || req.cookies.cr_user_app_email == "" ){
    res.cookie( "cr_save_old_url", `/car_rent_document_view/${req.params.document_id}` );
    res.redirect( powerapps_link )

  }else{
    let sql_1 = `SELECT * FROM tb_car_rent_document_main WHERE tb_car_rent_document_main.cdm_id = ?`
    let sql_2 = `SELECT * FROM tb_car_rent_document_sub WHERE tb_car_rent_document_sub.cds_join_cdm_id = ?`
    let sql_3 = `SELECT * FROM tb_car_list WHERE tb_car_list.car_id = ?`
    let sql_4 = `SELECT * FROM tb_car_image WHERE tb_car_image.ci_join_car_id = ?`
  
    condb.query( sql_1 , atob(req.params.document_id) , function(err , result){
      if(err){throw err}
      let document_data = result
  
      condb.query( sql_2 , atob(req.params.document_id) , function(err , result){
        if(err){throw err}
        let document_sub_data = result
    
        condb.query( sql_3 , document_sub_data[0].cds_join_car_id , function(err , result){
          if(err){throw err}
          let car_data = result
      
          condb.query( sql_4 , car_data[0].car_id , function(err , result){
            if(err){throw err}
            let car_image_data = result
        
            res.render( "car_rent_document_view" , {user_data : req.cookies , car_image_data : car_image_data , document_data : document_data , document_sub_data : document_sub_data , car_data : car_data , dayjs : dayjs} )
          } )
        } )
      } )
    } )
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/car_rent_document_approve_view/:document_id" , function(req , res){
  if( req.cookies.cr_user_app_email == null || req.cookies.cr_user_app_email == "" ){
    res.cookie( "cr_save_old_url", `/car_rent_document_approve_view/${req.params.document_id}` );
    res.redirect( powerapps_link )

  }else{

    let sql_1 = `SELECT * FROM tb_car_rent_document_main WHERE tb_car_rent_document_main.cdm_id = ?`
    let sql_2 = `SELECT * FROM tb_car_rent_document_sub WHERE tb_car_rent_document_sub.cds_join_cdm_id = ? ORDER BY tb_car_rent_document_sub.cds_date`
    let sql_3 = `SELECT * FROM tb_division_approver WHERE tb_division_approver.dap_join_div_id = ?`
    let sql_4 = `SELECT * FROM tb_car_list WHERE tb_car_list.car_id = ?`
    let sql_5 = `SELECT * FROM tb_car_image WHERE tb_car_image.ci_join_car_id = ?`
    let sql_6 = `SELECT * FROM tb_car_rent_document_comment WHERE tb_car_rent_document_comment.cdc_document_id = ?`
  
    let document_id = atob(req.params.document_id)
  
    condb.query( sql_1 , document_id , function(err , result){
      if(err){throw err}
      let document_data = result
  
      condb.query( sql_2 , document_id , function(err , result){
        if(err){throw err}
        let document_sub_data = result
    
        condb.query( sql_3 , document_data[0].cdm_for_person_division_id , function(err , result){
          if(err){throw err}
          let approver_document_data = result
      
          condb.query( sql_4 , document_sub_data[0].cds_join_car_id , function(err , result){
            if(err){throw err}
            let car_data = result
        
            condb.query( sql_5 , car_data[0].car_id , async function(err , result){
              if(err){throw err}
              let car_img_data = result
          
              condb.query( sql_6 , document_id , async function(err , result){
                if(err){throw err}
                let comment_data = result
  
                let permission = await set_permission(document_data , approver_document_data)
  
                console.log("permission")
                console.log(permission)
    
                res.render( "car_rent_document_approve_view" , 
                {
                  user_data : req.cookies , 
                  document_data : await prepare_data_json(document_data) , 
                  document_sub_data : await prepare_data_json(document_sub_data) , 
                  approver_document_data : await prepare_data_json(approver_document_data) , 
                  car_data : await prepare_data_json(car_data) , 
                  car_image_data : await prepare_data_json(car_img_data) , 
                  comment_data : await prepare_data_json(comment_data) , 
                  permission : permission , 
                  dayjs : dayjs
                } )
  
                function set_permission(document_data , approver_document_data){
                  return new Promise( ( resolve , reject ) => {
                    let permission = "viewer"
  
                    let creater = document_data.filter( function(e){
                      return  e.cdm_create_by_email == req.cookies.cr_user_app_email
                    } )
  
                    let approver = approver_document_data.filter( function(e){
                      return  e.dap_approver_email == req.cookies.cr_user_app_email
                    } )
  
                    console.log("creater")
                    console.log(creater)
                    console.log("approver")
                    console.log(approver)
  
                    if( approver.length > 0 ){
                      permission = "approver"
                      resolve(permission)
                    }else if( creater.length > 0 ){
                      permission = "creater"
                      resolve(permission)
                    }else{
                      permission = "viewer"
                      resolve(permission)
                    }
                  } )
                }
  
              } )
            } )
          } )
        } )
      } )
    } )
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/submit_comment" , function(req , res){
  if( req.cookies.cr_user_app_email == null || req.cookies.cr_user_app_email == "" ){
    res.cookie( "cr_save_old_url", `/car_rent_document_view/${req.params.document_id}` );
    res.redirect( powerapps_link )

  }else{
    let sql_1 = `INSERT INTO tb_car_rent_document_comment (cdc_create_by_user_app_id , cdc_create_by_name , cdc_create_by_email , cdc_create_by_division , cdc_create_timestamp , cdc_document_id , cdc_comment) VALUES ( ? , ? , ? , ? , ? , ? , ? )`
    let input_1 = [
      req.cookies.cr_user_app_id , 
      req.cookies.cr_user_app_name_en + " " + req.cookies.cr_user_app_surname_en , 
      req.cookies.cr_user_app_email , 
      req.cookies.cr_user_app_division , 
      Date.now() , 
      req.body.document_id , 
      req.body.comment
    ]

    condb.query( sql_1 , input_1 , function(err , result){
      if(err){throw err}
      res.end();
    } )
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/approve_car_rent_document" , function(req , res){
  let sql_1 = `UPDATE tb_car_rent_document_main SET cdm_status = ? , cdm_approver_id = ? , cdm_approver_name = ? , cdm_approver_email = ? , cdm_approver_division = ? , cdm_approve_date = ? WHERE tb_car_rent_document_main.cdm_id = ?`
  let sql_2 = `UPDATE tb_car_rent_document_sub SET cds_status = ? WHERE tb_car_rent_document_sub.cds_join_cdm_id = ?`
  let sql_3 = `SELECT * FROM tb_car_rent_document_main WHERE tb_car_rent_document_main.cdm_id = ?`


  let input_1 = [
    req.body.action , 
    req.cookies.cr_user_app_id , 
    req.cookies.cr_user_app_name_en + " " + req.cookies.cr_user_app_surname_en , 
    req.cookies.cr_user_app_email , 
    req.cookies.cr_user_app_division , 
    new Date() , 
    req.body.document_id
  ]

  let input_2 = [
    req.body.action , 
    req.body.document_id
  ]

  condb.query( sql_1 , input_1 , function(err , result){
    if(err){throw err}

    condb.query( sql_2 , input_2 , async function(err , result){
      if(err){throw err}

      await send_email_to_approver()
        
      res.end();
    } )
  } )

  function send_email_to_approver(){
    return new Promise( (resolve , reject) => {
      let sql_7 = `SELECT * FROM tb_car_rent_document_main WHERE tb_car_rent_document_main.cdm_id = ?`

      condb.query( sql_7 , req.body.document_id , function(err , result){
        if(err){throw err}
        let main_document_data = result

        if( req.body.action == "อนุมัติแล้ว" ){
          send_email( 
            `${main_document_data[0].cdm_create_by_email}; ${main_document_data[0].cdm_for_person_email}` , 
            `เรียน ${main_document_data[0].cdm_create_by_name} (ผู้สร้าง) , ${main_document_data[0].cdm_for_person} (ผู้ขอ)` , 
            "อัพเดท : เอกสารขอยืมรถยนต์" , 
    
            `เอกสารขอยืมรถยนต์ของคุณ ได้รับการอนุมัติโดย ${main_document_data[0].cdm_approver_name} ณ วันที่ ${dayjs(main_document_data[0].cdm_approve_date).format("DD/MM/YYYY")} <br><br>
            ผู้สร้างเอกสาร : ${main_document_data[0].cdm_create_by_name} / ${main_document_data[0].cdm_create_by_division} / ${main_document_data[0].cdm_create_by_email} <br> 
            ผู้ขอใช้ : ${main_document_data[0].cdm_for_person} / ${main_document_data[0].cdm_for_person_division} / ${main_document_data[0].cdm_for_person_email} <br>
            <br>
            มีความประสงค์ขอใช้รถไปยังสถานที่ : ${main_document_data[0].cdm_destination_location} <br> 
            เพื่อ : ${main_document_data[0].cdm_for_what} <br>
            ประเภทการขับ/ชื่อคนขับ : ${main_document_data[0].cdm_driver_type} / ${main_document_data[0].cdm_driver_name} <br>` , 
    
            `เอกสารขอยืมรถยนต์` , 
            `${url_now}/car_rent_document_approve_view/${btoa(main_document_data[0].cdm_id)}` , 
    
            "สามารถกดที่ปุ่มด้านบนนี้ เพื่อเข้าสู่ระบบ" 
          )
        }else if( req.body.action == "ถูกตีกลับ" ){
          send_email( 
            `${main_document_data[0].cdm_create_by_email}; ${main_document_data[0].cdm_for_person_email}` , 
            `เรียน ${main_document_data[0].cdm_create_by_name} (ผู้สร้าง) , ${main_document_data[0].cdm_for_person} (ผู้ขอ)` , 
            "อัพเดท : เอกสารขอยืมรถยนต์" , 
    
            `เอกสารขอยืมรถยนต์ของคุณ ถูกตีกลับโดย ${main_document_data[0].cdm_approver_name} ณ วันที่ ${dayjs(main_document_data[0].cdm_approve_date).format("DD/MM/YYYY")} <br><br>
            ผู้สร้างเอกสาร : ${main_document_data[0].cdm_create_by_name} / ${main_document_data[0].cdm_create_by_division} / ${main_document_data[0].cdm_create_by_email} <br> 
            ผู้ขอใช้ : ${main_document_data[0].cdm_for_person} / ${main_document_data[0].cdm_for_person_division} / ${main_document_data[0].cdm_for_person_email} <br>
            <br>
            มีความประสงค์ขอใช้รถไปยังสถานที่ : ${main_document_data[0].cdm_destination_location} <br> 
            เพื่อ : ${main_document_data[0].cdm_for_what} <br>
            ประเภทการขับ/ชื่อคนขับ : ${main_document_data[0].cdm_driver_type} / ${main_document_data[0].cdm_driver_name} <br>` , 
    
            `เอกสารขอยืมรถยนต์` , 
            `${url_now}/car_rent_document_approve_view/${btoa(main_document_data[0].cdm_id)}` , 
    
            "สามารถกดที่ปุ่มด้านบนนี้ เพื่อเข้าสู่ระบบ" 
          )
        }
      } )

      resolve()

    } )
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/division_list" , function(req , res){
  let sql_1 = `SELECT * FROM tb_division`
  let sql_2 = `SELECT * FROM tb_division_approver`

  condb.query( sql_1 , async function(err , result){
    if(err){throw err}
    let division_list_data = result

    condb.query( sql_2 , async function(err , result){
      if(err){throw err}
      let approver_division_data = result
  
      res.render( "division_list" , 
      {
        user_data : req.cookies , 
        division_list_data : await prepare_data_json(division_list_data) , 
        approver_division_data : await prepare_data_json(approver_division_data)
      } )
    } )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/add_new_approver" , function (req , res){

  if( req.cookies.cr_user_app_email == null || req.cookies.cr_user_app_email == "" ){
    res.cookie( "cr_save_old_url", `/car_rent_document_view/${req.params.document_id}` );
    res.redirect( powerapps_link )
  }else{
    let sql_1 = `SELECT * FROM tb_division_approver WHERE tb_division_approver.dap_join_div_id = ? AND tb_division_approver.dap_approver_email = ?`
    let sql_2 = `INSERT INTO tb_division_approver (dap_create_by_user_app_id , dap_create_by_name , dap_create_by_email , dap_create_by_division , dap_create_timestamp , dap_join_div_id , dap_approver_name , dap_approver_email , dap_approver_division_id , dap_approver_division_name) 
    VALUES ( ? , ? , ? , ? , ? , ? , ? , ? , ? , ? )`
  
    let approver_division_array = req.body.new_approver_division.split("__")
  
    condb.query( sql_1 , [ req.body.division_selected_id , req.body.new_approver_email ] , function(err , result){
      if(err){throw err}
  
      if( result.length == 0 ){
        let input_2 = [
          req.cookies.cr_user_app_id , 
          req.cookies.cr_user_app_name_en + " " + req.cookies.cr_user_app_surname_en , 
          req.cookies.cr_user_app_email , 
          req.cookies.cr_user_app_division , 
          Date.now() , 
          req.body.division_selected_id , 
          req.body.new_approver_name , 
          req.body.new_approver_email , 
          approver_division_array[0] , 
          approver_division_array[1] 
        ]
  
        condb.query( sql_2 , input_2 , function (err , result){
          if(err){throw err}
  
          res.contentType('application/json');
          let nextPage = JSON.stringify(`Success`)
          res.header('Content-Length', nextPage.length);
          res.end(nextPage);
        } )
      }else{
        res.contentType('application/json');
        let nextPage = JSON.stringify(`Error`)
        res.header('Content-Length', nextPage.length);
        res.end(nextPage);
      }
  
    } )
  }

} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/delete_approver" , function(req , res){
  let sql_1 = `DELETE FROM tb_division_approver WHERE tb_division_approver.dap_id = ? `

  condb.query( sql_1 , req.body.approver_id , function(err , ressult){
    if(err){throw err}
    res.end();
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/document_data_update" , function(req , res){
  let sql_1 = `UPDATE tb_car_rent_document_main SET ${req.body.column} = ? WHERE tb_car_rent_document_main.cdm_id = ? `
  let sql_2 = `SELECT * FROM tb_division WHERE tb_division.div_id = ?`
  let sql_3 = `UPDATE tb_car_rent_document_main SET cdm_for_person_division = ? WHERE tb_car_rent_document_main.cdm_id = ?`
  let sql_4 = `SELECT * FROM tb_driver_main WHERE tb_driver_main.dm_id = ?`
  let sql_5 = `UPDATE tb_car_rent_document_main SET tb_car_rent_document_main.cdm_driver_name = ? WHERE tb_car_rent_document_main.cdm_id = ?`

  if( req.body.column == "cdm_for_person_division_id" ){
    condb.query( sql_2 , req.body.value , function(err , result){
      if(err){throw err}
      if( result.length == 0 ){

      }else{
        condb.query( sql_3 , [ result[0].div_name , req.body.document_id ] , function(err , result){
          if(err){throw err}

          condb.query( sql_1 , [ req.body.value , req.body.document_id ] , function(err , result){
            if(err){throw err}
            
            res.end();
          } ) 
        } )
      }
    } )
  }else if( req.body.column == "cdm_driver_id" && req.body.value != "0" && req.body.value != "-" ){
    condb.query( sql_4 , req.body.value , function(err , result){
      if(err){throw err}
      let driver_data = result

      condb.query( sql_5 , [ `${driver_data[0].dm_name_th} (${driver_data[0].dm_nickname_th})` , req.body.document_id ] , function(err , result){
        if(err){throw err}
        
        condb.query( sql_1 , [ req.body.value , req.body.document_id ] , function(err , result){
          if(err){throw err}
          
          res.end();
        } ) 
      } ) 
    } )
  }else{
    condb.query( sql_1 , [ req.body.value , req.body.document_id ] , function(err , result){
      if(err){throw err}
      
      res.end();
    } )  
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/update_remark" , function(req , res){
  let sql_1 = `UPDATE tb_car_rent_document_main SET cdm_remark = ? WHERE tb_car_rent_document_main.cdm_id = ? `

  condb.query( sql_1 , [ req.body.remark , req.body.document_id ] , function(err , result){
    if(err){throw err}

    res.end();
  } )  
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/check_status_driver" , function(req , res){
  let sql_1 = `SELECT * FROM tb_car_rent_document_sub WHERE tb_car_rent_document_sub.cds_join_cdm_id = ?`
  let sql_2 = `SELECT * FROM tb_driver_main 
  LEFT JOIN tb_driver_sub ON tb_driver_main.dm_id = tb_driver_sub.ds_join_dm_id 
  LEFT JOIN tb_car_rent_document_sub ON tb_driver_sub.ds_join_doc_id = tb_car_rent_document_sub.cds_join_cdm_id`
  let sql_3 = `SELECT * FROM tb_driver_main`

  condb.query( sql_1 , req.body.document_id , function(err , result){
    if(err){throw err}
    let sub_date_document_data = result

    condb.query( sql_2 , req.body.document_id , function(err , result){
      if(err){throw err}
      let data = result

      condb.query( sql_3 , async function(err , result){
        if(err){throw err}
        let driver_data = result
  
        for( let i = 0 ; i < driver_data.length ; i++ ){
          await check_status(driver_data[i])
        }

        console.log("driver_data")
        console.log(driver_data)

        res.send(driver_data)

        function check_status( driver_data_1 ){
          return new Promise ( (resolve , reject) => {
            for( let i = 0 ; i < sub_date_document_data.length ; i++ ){

              driver_data_1.status = "free"

              let sql_4 = `SELECT * FROM tb_driver_main 
              LEFT JOIN tb_driver_sub ON tb_driver_main.dm_id = tb_driver_sub.ds_join_dm_id 
              LEFT JOIN tb_car_rent_document_sub ON tb_driver_sub.ds_join_doc_id = tb_car_rent_document_sub.cds_join_cdm_id 
              WHERE tb_driver_main.dm_id = ? AND tb_car_rent_document_sub.cds_date = ? AND tb_car_rent_document_sub.cds_phase = ? AND tb_car_rent_document_sub.cds_status <> "ถูกตีกลับ"`

              condb.query( sql_4 , [ driver_data_1.dm_id , sub_date_document_data[i].cds_date , sub_date_document_data[i].cds_phase ] , function(err , result){
                if(err){throw err}
                let find_driver_id_and_date = result

                console.log("result")
                console.log(result)

                if(find_driver_id_and_date.length > 0){
                  driver_data_1.status = "busy"
                }

                if(i == sub_date_document_data.length - 1){
                  resolve()
                }
              } )
            }
          } )
        }

        // console.log("driver_data")
        // console.log(driver_data)

        // console.log("sub_date_document_data")
        // console.log(sub_date_document_data)
  
        // console.log("data")
        // console.log(data)


        res.end()
      } )
    } )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/ticket_request_document_create" , function(req , res){

  if( req.cookies.cr_user_app_email == null || req.cookies.cr_user_app_email == "" ){
    res.cookie( "cr_save_old_url", `/home` );
    res.redirect( powerapps_link )
  }else{
    let sql_1 = `INSERT INTO tb_ticket_document_main ( tdm_create_by_user_app_id , 	tdm_create_by_name , tdm_create_by_email , tdm_create_by_division , tdm_create_date , tdm_create_timestamp , tdm_status ) VALUES ( ? , ? , ? , ? , ? , ? , ? )`
    let sql_2 = `SELECT * FROM tb_ticket_document_main WHERE tb_ticket_document_main.tdm_create_timestamp = ? AND tb_ticket_document_main.tdm_create_by_email = ?`

    let timestamp = Date.now()
    let input_1 = [
      req.cookies.cr_user_app_id , 
      req.cookies.cr_user_app_name_en + " " + req.cookies.cr_user_app_surname_en , 
      req.cookies.cr_user_app_email , 
      req.cookies.cr_user_app_division , 
      new Date() , 
      timestamp , 
      "สร้าง"
    ]

    condb.query( sql_1 , input_1 , function(err , result){
      if(err){throw err}
      
      condb.query( sql_2 , [ timestamp , req.cookies.cr_user_app_email ] , function(err , result){
        if(err){throw err}
        let ticket_document = result

        if( ticket_document.length == 0 ){
          res.send("error")
        }else{
          res.redirect( `/ticket_request_document_edit/${btoa(ticket_document[0].tdm_id)}` )
        }
      } )
    } )
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/ticket_request_document_edit/:document_code" , function(req , res){

  if( req.cookies.cr_user_app_email == null || req.cookies.cr_user_app_email == "" ){
    res.cookie( "cr_save_old_url", `/home` );
    res.redirect( powerapps_link )
  }else{

    let document_id = atob(req.params.document_code)
    let sql_1 = `SELECT * FROM tb_ticket_document_main WHERE tb_ticket_document_main.tdm_id = ?`
    let sql_2 = `SELECT * FROM tb_ticket_document_sub WHERE tb_ticket_document_sub.tds_join_jdm_id = ?`
    let sql_3 = `SELECT * FROM tb_division`

    condb.query( sql_1 , document_id , function(err , result){
      if(err){throw err}
      let ticket_document_main = result
      
      condb.query( sql_2 , document_id , async function(err , result){
        if(err){throw err}
        let ticket_document_sub = result

        condb.query( sql_3 , async function(err , result){
          if(err){throw err}
          let division_data = result
  
          if( ticket_document_main.length == 0 ){
            res.send("error")
          }else{
            res.render( "ticket_request_document_edit" , {user_data : req.cookies , division_data : await prepare_data_json(division_data) , ticket_document_main : await prepare_data_json(ticket_document_main) , ticket_document_sub : await prepare_data_json(ticket_document_sub) , dayjs : dayjs} )
          }
        } )
      } )
    } )
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/ticket_insert_sub_row" , function(req , res){
  let sql_1 = `INSERT INTO tb_ticket_document_sub (tds_create_by_user_app_id , tds_create_by_name , tds_create_by_email , tds_create_by_division , tds_create_date , tds_create_timestamp , tds_join_jdm_id , tds_want_date , tds_want_brand , tds_want_remark , tds_status) 
  VALUES ( ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? )`

  let input_1 = [
    req.cookies.cr_user_app_id , 
    req.cookies.cr_user_app_name_en + " " + req.cookies.cr_user_app_surname_en , 
    req.cookies.cr_user_app_email , 
    req.cookies.cr_user_app_division , 
    new Date() , 
    Date.now() , 
    req.body.tdm_id , 
    req.body.tds_want_date , 
    req.body.tds_want_brand , 
    req.body.tds_want_remark , 
    "สร้าง"
  ]

  condb.query( sql_1 , input_1 , function(err , result){
    if(err){throw err}
    res.end();
  } ) 
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/ticket_request_document_submit" , function(req , res){
  let sql_1 = `SELECT * FROM tb_division WHERE tb_division.div_id = ?`
  let sql_2 = `UPDATE tb_ticket_document_main SET tdm_user_name = ? , tdm_user_email = ? , tdm_user_division_id = ? , tdm_user_division_name = ? , tdm_for_what = ? , tdm_status = ? 
  WHERE tb_ticket_document_main.tdm_id = ?`
  let sql_3 = `UPDATE tb_ticket_document_sub SET tds_status = ? WHERE tb_ticket_document_sub.tds_join_jdm_id = ?`

  condb.query( sql_1 , req.body.tdm_user_division_id , function(err , result){
    if(err){throw err}

    let division_name_selected = ""

    if( result.length == 0 ){
      division_name_selected = ""
    }else{
      division_name_selected = result[0].div_name
    }

    condb.query( sql_2 , [req.body.tdm_user_name , req.body.tdm_user_email , req.body.tdm_user_division_id , division_name_selected , req.body.tdm_for_what , req.body.status  , req.body.tdm_id] , function(err , result){
      if(err){throw err}
      
      condb.query( sql_3 , [req.body.status  , req.body.tdm_id] , async function(err , result){
        if(err){throw err}
        
        if( req.body.status == "บันทึกแล้ว" ){
          await ticket_req_send_email_to_approver( req.body.tdm_id )
        }

        res.send("/car_rent_document_list");
      } )
    } )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function ticket_req_send_email_to_approver( ticket_req_document_id ){
  return new Promise( (resolve , reject) => {
    let sql_1 = `SELECT * FROM tb_ticket_document_main WHERE tb_ticket_document_main.tdm_id = ?`
    let sql_2 = `SELECT * FROM tb_ticket_document_sub WHERE tb_ticket_document_sub.tds_join_jdm_id = ?`
    let sql_3 = `SELECT * FROM tb_division_approver WHERE tb_division_approver.dap_join_div_id = ?`

    condb.query( sql_1 , ticket_req_document_id , function(err , result){
      if(err){throw err}
      let main_document_data = result

      condb.query( sql_2 , ticket_req_document_id , function(err , result){ 
        if(err){throw err}
        let sub_document_data = result

        condb.query( sql_3 , main_document_data[0].tdm_user_division_id , function(err , result){
          if(err){throw err}
          let approver_data = result
  
          if( approver_data.length > 0 ){
            let approver_emails = approver_data.map(item => item.dap_approver_email).join('; ');
            let approver_name = approver_data.map(item => item.dap_approver_name).join(', ');
  
            send_email( 
              approver_emails , 
              "เรียน " + approver_name , 
              "ต้องอนุมัติ : เอกสารการขอตั๋วเดินทาง Grab" , 
  
              `เอกสารการขอตั๋วเดินทาง Grab รออนุมัติจากคุณ  <br><br>
              ผู้สร้างเอกสาร : ${main_document_data[0].tdm_create_by_name} / ${main_document_data[0].tdm_create_by_division} / ${main_document_data[0].tdm_create_by_email} <br> 
              ผู้ขอใช้ : ${main_document_data[0].tdm_user_name} / ${main_document_data[0].tdm_user_division_name} / ${main_document_data[0].tdm_user_email} <br>
              <br>
              เพื่อ : ${main_document_data[0].tdm_for_what} <br>
              จำนวนตั๋วที่ขอ : ${sub_document_data.length} รอบตั๋ว <br>` , 
  
              `เอกสารการขอตั๋วเดินทาง Grab` , 
              `${url_now}/ticket_requset_document_view/${btoa(main_document_data[0].tdm_id)}` , 
  
              "สามารถกดที่ปุ่มด้านบนนี้ เพื่อเข้าสู่ระบบ" 
            )
  
            resolve()
          }else{
            resolve()
          }
        } )
      } )
    } )
  } )
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/ticket_requset_document_view/:document_id" , function(req , res){

  if( req.cookies.cr_user_app_email == null || req.cookies.cr_user_app_email == "" ){
    res.cookie( "cr_save_old_url", `/ticket_requset_document_view/${ req.params.document_id }` );
    res.redirect( powerapps_link )
  }else{
    let sql_1 = `SELECT * FROM tb_ticket_document_main WHERE tb_ticket_document_main.tdm_id = ?`
    let sql_2 = `SELECT * FROM tb_ticket_document_sub WHERE tb_ticket_document_sub.tds_join_jdm_id = ?`
    let sql_3 = `SELECT * FROM tb_ticket_document_comment WHERE tb_ticket_document_comment.tdc_join_tdm_id = ?`
    let sql_4 = `SELECT * FROM tb_division_approver WHERE tb_division_approver.dap_join_div_id = ?`
  
    let document_id = atob(req.params.document_id)
  
    condb.query( sql_1 , document_id , function(err , result){
      if(err){throw err}
      let document_main_data = result
  
      condb.query( sql_2 , document_id , function(err , result){
        if(err){throw err}
        let document_sub_data = result
    
        condb.query( sql_3 , document_id , function(err , result){
          if(err){throw err}
          let document_comment_data = result
      
          condb.query( sql_4 , document_main_data[0].tdm_user_division_id , async function(err , result){
            if(err){throw err}
            let approver_document_data = result
        
            let permission = await set_permission(document_main_data , approver_document_data)
  
            console.log("permission")
            console.log(permission)
  
            res.render( "ticket_requset_document_view" , 
            {
              user_data : req.cookies , 
              document_main_data : await prepare_data_json(document_main_data) , 
              document_sub_data : await prepare_data_json(document_sub_data) , 
              document_comment_data : await prepare_data_json(document_comment_data) , 
              approver_document_data : await prepare_data_json(approver_document_data) , 
              permission : permission , 
              dayjs : dayjs
            } )
  
            function set_permission(document_data , approver_document_data){
              return new Promise( ( resolve , reject ) => {
                let permission = "viewer"
  
                let creater = document_data.filter( function(e){
                  return  e.tdm_create_by_email == req.cookies.cr_user_app_email
                } )
  
                let approver = approver_document_data.filter( function(e){
                  return  e.dap_approver_email == req.cookies.cr_user_app_email
                } )
  
                if( approver.length > 0 ){
                  permission = "approver"
                  resolve(permission)
                }else if( creater.length > 0 ){
                  permission = "creater"
                  resolve(permission)
                }else{
                  permission = "viewer"
                  resolve(permission)
                }
              } )
            }
          } )
        } )
      } )
    } )
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post("/ticket_request_insert_comment" , function(req , res){
  let sql_1 = `INSERT INTO tb_ticket_document_comment (tdc_create_by_user_app_id , tdc_create_by_name , tdc_create_by_email , tdc_create_by_division , tdc_create_date , tdc_create_timestamp , tdc_join_tdm_id , tdc_comment) 
  VALUES ( ? , ? , ? , ? , ? , ? , ? , ? )`

  let input_1 = [
    req.cookies.cr_user_app_id , 
    req.cookies.cr_user_app_name_en + " " + req.cookies.cr_user_app_surname_en , 
    req.cookies.cr_user_app_email , 
    req.cookies.cr_user_app_division , 
    new Date() , 
    Date.now() , 
    req.body.document_id , 
    req.body.comment , 
  ]

  condb.query( sql_1 , input_1 , function(err , result){
    if(err){throw err}

    res.end();
  } )
})

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/approve_ticket_request_document" , function(req, res){
  let sql_1 = `UPDATE tb_ticket_document_main SET tdm_status = ? , tdm_approver_id = ? , tdm_approver_name = ? , tdm_approver_email = ? , tdm_approver_division = ? , tdm_approver_date = ? WHERE tb_ticket_document_main.tdm_id = ?`
  let sql_2 = `UPDATE tb_ticket_document_sub SET tds_status = ? WHERE tb_ticket_document_sub.tds_join_jdm_id = ?`

  let input_1 = [
    req.body.action , 
    req.cookies.cr_user_app_id , 
    req.cookies.cr_user_app_name_en + " " + req.cookies.cr_user_app_surname_en , 
    req.cookies.cr_user_app_email , 
    req.cookies.cr_user_app_division , 
    new Date() , 
    req.body.document_id
  ]

  let input_2 = [
    req.body.action , 
    req.body.document_id 
  ]

  condb.query( sql_1 , input_1 , function(err , result){
    if(err){throw err}

    condb.query( sql_2 , input_2 , async function(err , result){
      if(err){throw err}

      if( req.body.action == "อนุมัติแล้ว" ){
        await notification_update_status_ticket_req_doc( "ได้รับการอนุมัติ" , req.body.document_id )
      }else{
        await notification_update_status_ticket_req_doc( "ถูกปฎิเสธ" , req.body.document_id )
      }
      res.end();
    } )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function notification_update_status_ticket_req_doc( text_status , main_document_id ){
  return new Promise( (resolve , reject) => {

    let sql_1 = `SELECT * FROM tb_ticket_document_main WHERE tb_ticket_document_main.tdm_id = ?`
    let sql_2 = `SELECT * FROM tb_ticket_document_sub WHERE tb_ticket_document_sub.tds_join_jdm_id = ?`

    condb.query( sql_1 , main_document_id , function(err , result){
      if(err){throw err}
      let main_document_data = result

      condb.query( sql_2 , main_document_id , function(err , result){
        if(err){throw err}
        let sub_document_data = result

        if( main_document_data.length == 0 || sub_document_data.length == 0 ){
          resolve()
        }else{
          send_email( 
            `${main_document_data[0].tdm_create_by_email}; ${main_document_data[0].tdm_user_email}` , 
            `เรียน ${main_document_data[0].tdm_create_by_name} (ผู้สร้าง) , ${main_document_data[0].tdm_user_name} (ผู้ขอ)` , 
            "อัพเดท : เอกสารการขอตั๋วเดินทาง Grab" , 
          
            `เอกสารการขอตั๋วเดินทาง Grab ของคุณ ${text_status}โดย ${main_document_data[0].tdm_approver_name} ณ วันที่ ${dayjs(main_document_data[0].tdm_approver_date).format("DD/MM/YYYY")} <br><br>
            ผู้สร้างเอกสาร : ${main_document_data[0].tdm_create_by_name} / ${main_document_data[0].tdm_create_by_division} / ${main_document_data[0].tdm_create_by_email} <br> 
            ผู้ขอใช้ : ${main_document_data[0].tdm_user_name} / ${main_document_data[0].tdm_user_division_name} / ${main_document_data[0].tdm_user_email} <br>
            <br>
            เพื่อ : ${main_document_data[0].tdm_for_what} <br>
            จำนวนตั๋วที่ขอ : ${sub_document_data.length} รอบตั๋ว <br>` , 
  
            `เอกสารการขอตั๋วเดินทาง Grab` , 
            `${url_now}/ticket_requset_document_view/${btoa(main_document_data[0].tdm_id)}` , 
  
            "สามารถกดที่ปุ่มด้านบนนี้ เพื่อเข้าสู่ระบบ" 
          )
  
          resolve()
        }
      } )
    } )
  } )
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/approval_config" , function(req , res){
  let sql_1 = `SELECT * FROM tb_approval_config GROUP BY tb_approval_config.ac_division`

  condb.query( sql_1 , async function(err , result){
    if(err){throw err}
    let approval_cofig_data = result
    console.log("approval_cofig_data")
    console.log(approval_cofig_data)
    res.render( "approval_config" , {user_data : req.cookies , approval_cofig_data : await prepare_data_json(approval_cofig_data)} )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/driver_list" , function( req , res ){
  let sql_1 = `SELECT * FROM tb_driver_main ORDER BY tb_driver_main.dm_id DESC`

  condb.query( sql_1 , async function(err , result){
    if(err){throw err}

    let car_driver_data = result

    res.render( "driver_list" , {user_data : req.cookies , car_driver_data : await prepare_data_json(car_driver_data)} )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/admin_job_schedule_today" , function(req , res){

  let sql_1 = `SELECT * FROM tb_car_rent_document_main 
  LEFT JOIN tb_car_rent_document_sub ON tb_car_rent_document_main.cdm_id = tb_car_rent_document_sub.cds_join_cdm_id 
  LEFT JOIN tb_car_list ON tb_car_list.car_id = tb_car_rent_document_sub.cds_join_car_id 
  WHERE (tb_car_rent_document_sub.cds_status = "อนุมัติแล้ว" OR tb_car_rent_document_sub.cds_status = "ส่งรถแล้ว" OR tb_car_rent_document_sub.cds_status = "รับรถแล้ว" OR tb_car_rent_document_sub.cds_status = "คืนรถแล้ว" OR tb_car_rent_document_sub.cds_status = "สำเร็จแล้ว") 
  AND tb_car_rent_document_sub.cds_date = ? AND tb_car_rent_document_sub.cds_phase = "ช่วงเช้า"`
  let sql_2 = `SELECT * FROM tb_car_rent_document_main 
  LEFT JOIN tb_car_rent_document_sub ON tb_car_rent_document_main.cdm_id = tb_car_rent_document_sub.cds_join_cdm_id 
  LEFT JOIN tb_car_list ON tb_car_list.car_id = tb_car_rent_document_sub.cds_join_car_id 
  WHERE (tb_car_rent_document_sub.cds_status = "อนุมัติแล้ว" OR tb_car_rent_document_sub.cds_status = "ส่งรถแล้ว" OR tb_car_rent_document_sub.cds_status = "รับรถแล้ว" OR tb_car_rent_document_sub.cds_status = "คืนรถแล้ว" OR tb_car_rent_document_sub.cds_status = "สำเร็จแล้ว") 
  AND tb_car_rent_document_sub.cds_date = ? AND tb_car_rent_document_sub.cds_phase = "ช่วงบ่าย"`
  let sql_3 = `SELECT * FROM tb_ticket_document_main LEFT JOIN tb_ticket_document_sub ON tb_ticket_document_main.tdm_id = tb_ticket_document_sub.tds_join_jdm_id WHERE tb_ticket_document_main.tdm_status = "อนุมัติแล้ว" AND tb_ticket_document_sub.tds_want_date = ?`

  let now = new Date(new Date().setHours(0,0,0,0))
  
  condb.query( sql_1 , now , function(err , result){
    if(err){throw err}
    let document_morning_data = result

    condb.query( sql_2 , now , async function(err , result){
      if(err){throw err}
      let document_afternoon_data = result

      condb.query( sql_3 , now , async function(err , result){
        if(err){throw err}
        let ticket_request_document_data = result

        console.log("ticket_request_document_data")
        console.log(ticket_request_document_data)

        res.render( "admin_job_schedule_today" , {user_data : req.cookies , ticket_request_document_data : await prepare_data_json(ticket_request_document_data) , document_morning_data : await prepare_data_json(document_morning_data) , document_afternoon_data : await prepare_data_json(document_afternoon_data) , dayjs : dayjs} )

      } )
    } )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/generate_ticket" , async function(req , res){
  let return_value = await generate_ticket( req.body.ticket_doc_sub_id )

  res.send(return_value);
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function auto_generate_ticket(){
  let sql_1 = `SELECT * FROM tb_ticket_document_sub WHERE tb_ticket_document_sub.tds_status = "อนุมัติแล้ว" AND tb_ticket_document_sub.tds_want_date = ?`
  let now = new Date(new Date().setHours(0,0,0,0))

  console.log("function auto_generate_ticket is running")

  condb.query( sql_1 , now , async function(err , result){
    if(err){throw err}
    
    let ticket_today_data = result
    
    for( let i = 0 ; i < ticket_today_data.length ; i++ ){
      await generate_ticket( ticket_today_data[i].tds_id )
    }
  } )
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function generate_ticket( ticket_doc_sub_id ){
  return new Promise( (resolve , reject) => {
    let sql_1 = `SELECT * FROM tb_ticket_document_sub WHERE tb_ticket_document_sub.tds_id = ?`
    let sql_2 = `SELECT * FROM th_ticket WHERE th_ticket.tk_brand = ? AND th_ticket.tk_status = "ใช้งานได้" ORDER BY tk_id ASC`

    let sql_3 = `UPDATE tb_ticket_document_sub SET tds_status = ? , tds_ticket_id_generated = ? , tds_ticket_code_generated = ? WHERE tb_ticket_document_sub.tds_id = ?`
    let sql_4 = `UPDATE th_ticket SET tk_status = ? WHERE th_ticket.tk_id = ?`

    condb.query( sql_1 , ticket_doc_sub_id , function(err , result){
      if(err){throw err}
      let ticket_doc_sub_data = result

      if( ticket_doc_sub_data.length == 0 ){
        resolve("error 001")
      }else{
        condb.query( sql_2 , ticket_doc_sub_data[0].tds_want_brand , function(err , result){
          if(err){throw err}
          let ticket_code_data = result

          if( ticket_code_data.length == 0 ){
            resolve("error 002")
          }else{
            condb.query( sql_3 , [ "ใส่โค้ดแล้ว" , ticket_code_data[0].tk_id , ticket_code_data[0].tk_code , ticket_doc_sub_id ] , function(err , result){
              if(err){throw err}

              condb.query( sql_4 , [ "ถูกใช้แล้ว" , ticket_code_data[0].tk_id ] , function(err , result){
                if(err){throw err}

                resolve("success")
              } )
            } )
          }
        } )
      }
    } )
  } )
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/admin_job_schedule_alltime" , function(req , res){

  let sql_1 = `SELECT * FROM tb_car_rent_document_main 
  LEFT JOIN tb_car_rent_document_sub ON tb_car_rent_document_main.cdm_id = tb_car_rent_document_sub.cds_join_cdm_id 
  LEFT JOIN tb_car_list ON tb_car_list.car_id = tb_car_rent_document_sub.cds_join_car_id 
  WHERE ( tb_car_rent_document_sub.cds_status = "ส่งรถแล้ว" OR tb_car_rent_document_sub.cds_status = "อนุมัติแล้ว" OR tb_car_rent_document_sub.cds_status = "ส่งรถแล้ว" 
  OR tb_car_rent_document_sub.cds_status = "รับรถแล้ว" OR tb_car_rent_document_sub.cds_status = "คืนรถแล้ว" OR tb_car_rent_document_sub.cds_status = "สำเร็จแล้ว" ) 
  ORDER BY tb_car_rent_document_sub.cds_id DESC`
  
  condb.query( sql_1 , async function(err , result){
    if(err){throw err}
    let document_alltime_data = result

    res.render( "admin_job_schedule_alltime" , {user_data : req.cookies , document_alltime_data : await prepare_data_json(document_alltime_data) , dayjs : dayjs} )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/admin_send_car" , function(req , res){
  let sql_1 = `UPDATE tb_car_rent_document_sub SET cds_status = ? , cds_admin_sender_id = ? , cds_admin_sender_name = ? , cds_admin_sender_email = ? , cds_admin_sender_division = ? , cds_admin_sender_date = ? , cds_admin_sender_last_miles = ? WHERE tb_car_rent_document_sub.cds_id = ?`
  let sql_2 = `UPDATE tb_car_list SET car_last_miles = ? WHERE tb_car_list.car_id = ?`

  let input_1 = [
    "ส่งรถแล้ว" , 
    req.cookies.cr_user_app_id , 
    req.cookies.cr_user_app_name_en + " " + req.cookies.cr_user_app_surname_en , 
    req.cookies.cr_user_app_email , 
    req.cookies.cr_user_app_division , 
    new Date() , 
    req.body.last_miles ,
    req.body.document_id
  ]
  let input_2 = [
    req.body.last_miles ,
    req.body.car_id
  ]

  condb.query( sql_1 , input_1 , function(err , result){
    if(err){throw err}

    condb.query( sql_2 , input_2 , function(err , result){
      if(err){throw err}
      
      res.end();
    } )
  } )

} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/admin_setup_ticket" , function(req , res){

  let sql_1 = `SELECT * FROM th_ticket ORDER BY th_ticket.tk_id DESC`
  
  condb.query( sql_1 , async function(err , result){
    if(err){throw err}
    let ticket_data = result

    res.render( "admin_setup_ticket" , {user_data : req.cookies , ticket_data : await prepare_data_json(ticket_data) , dayjs : dayjs} )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/add_new_ticket" , async function(req , res){
  let sql_1 = `INSERT INTO th_ticket (tk_create_by_user_id , tk_create_by_name , tk_create_by_email , tk_create_by_division , tk_create_date , tk_create_timestamp , tk_brand , tk_code , tk_detail , tk_start_use , tk_end_use , tk_status) 
  VALUE (? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ?)`

  let now_date = new Date()
  let start_date = new Date(new Date(req.body.tk_start_use).setHours(0,0,0,0))
  let end_date = new Date(new Date(req.body.tk_end_use).setHours(0,0,0,0))

  let now_date_timestamp = now_date.getTime()
  let start_date_timestamp = start_date.getTime()
  let end_date_timestamp = end_date.getTime()

  let status_ticket = ""

  if( start_date_timestamp > end_date_timestamp ){
    res.send("erorr 80237")
  }else if( start_date_timestamp > now_date_timestamp ){
    console.log("ยังไม่ถึงกำหนด")
    status_ticket = "ยังไม่ถึงกำหนด"
    await insert_ticket(status_ticket)
    res.send("success")
  }else if( end_date_timestamp < now_date_timestamp ){
    console.log("หมดอายุแล้ว")
    status_ticket = "หมดอายุแล้ว"
    await insert_ticket(status_ticket)
    res.send("success")
  }else if( start_date_timestamp < now_date_timestamp && now_date_timestamp < end_date_timestamp ){
    console.log("ใช้งานได้")
    status_ticket = "ใช้งานได้"
    await insert_ticket(status_ticket)
    console.log("success")
    res.send("success")
  }else{
    console.log("?")
    res.send("erorr 80237")
  }

  function insert_ticket(status_ticket){
    return new Promise((resolve , reject) => {
      let input_1 = [
        req.cookies.cr_user_app_id , 
        req.cookies.cr_user_app_name_en + " " + req.cookies.cr_user_app_surname_en , 
        req.cookies.cr_user_app_email , 
        req.cookies.cr_user_app_division , 
        new Date() ,
        Date.now() , 
        req.body.tk_brand , 
        req.body.tk_code , 
        req.body.tk_detail , 
        req.body.tk_start_use , 
        req.body.tk_end_use , 
        status_ticket
      ]
      condb.query( sql_1 , input_1 , function(err , result){
        if(err){throw err}

        resolve()
      } )
    })
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/ticket_refresh_status_today" , async function(req , res){
  let return_result_1 = await ticket_refresh_status_today_open_ticket()
  let return_result_2 = await ticket_refresh_status_today_close_ticket()
  res.send({ return_result_1 : return_result_1 , return_result_2 : return_result_2 });
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function ticket_refresh_status_today_close_ticket(){
  return new Promise( (resolve , reject) => {

    let sql_1 = `SELECT * FROM th_ticket WHERE th_ticket.tk_status = "ใช้งานได้" OR th_ticket.tk_status = "ยังไม่ถึงกำหนด"`
    let sql_2 = `UPDATE th_ticket SET tk_status = "หมดอายุแล้ว" WHERE th_ticket.tk_id = ?`

    let now_date = new Date()
    let now_date_timestamp = now_date.getTime()

    condb.query( sql_1 , function(err , result){
      if(err){throw err}
      let ticket_data = result

      if( ticket_data.length == 0 ){
        resolve("success")
      }else{
        for( let i = 0 ; i < ticket_data.length ; i++ ){
          let start_date = new Date(ticket_data[i].tk_start_use)
          let end_date = new Date(ticket_data[i].tk_end_use)
      
          let start_date_timestamp = start_date.getTime()
          let end_date_timestamp = end_date.getTime()

          if( now_date_timestamp > end_date_timestamp ){
            condb.query( sql_2 , ticket_data[i].tk_id , function(err , result){
              if(err){throw err}
            })
          }

          if( i == ticket_data.length - 1 ){
            resolve("success")
          }
        }
      }
    } )
  } )
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function ticket_refresh_status_today_open_ticket(){
  return new Promise( (resolve , reject) => {
    let sql_1 = `SELECT * FROM th_ticket WHERE th_ticket.tk_status = "ยังไม่ถึงกำหนด"`
    let sql_2 = `UPDATE th_ticket SET tk_status = "ใช้งานได้" WHERE th_ticket.tk_id = ?`
    let now_date = new Date()
    let now_date_timestamp = now_date.getTime()

    condb.query( sql_1 , function(err , result){
      if(err){throw err}
      let ticket_data = result

      if( ticket_data.length == 0 ){
        resolve("success")
      }else{
        for( let i = 0 ; i < ticket_data.length ; i++ ){
          let start_date = new Date(ticket_data[i].tk_start_use)
          let end_date = new Date(ticket_data[i].tk_end_use)
      
          let start_date_timestamp = start_date.getTime()
          let end_date_timestamp = end_date.getTime()

          if( start_date_timestamp < now_date_timestamp && now_date_timestamp < end_date_timestamp ){
            condb.query( sql_2 , ticket_data[i].tk_id , function(err , result){
              if(err){throw err}
              
            })
          }

          if( i == ticket_data.length - 1 ){
            resolve("success")
          }
        }
      }
    } )
  } )
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/expressway_list" , function(req , res){
  let sql_1 = `SELECT * FROM tb_expressway`

  condb.query( sql_1 , async function(err , result){
    if(err){throw err}
    let expressway_data = result

    res.render( "expressway_list" , {user_data : req.cookies , expressway_data : await prepare_data_json(expressway_data) , dayjs : dayjs} )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/add_new_expressway" , function(req , res){
  let sql_1 = `SELECT * FROM tb_expressway WHERE tb_expressway.epw_expressway_name = ?`
  let sql_2 = `INSERT INTO tb_expressway (epw_create_by_user_app_id , epw_create_by_name , epw_create_by_email , epw_create_by_division , epw_create_date , epw_create_timestamp , epw_expressway_name , epw_expressway_price , epw_expressway_description) 
  VALUES (? , ? , ? , ? , ? , ? , ? , ? , ?)`

  let input_2 = [
    req.cookies.cr_user_app_id , 
    req.cookies.cr_user_app_name_en + " " + req.cookies.cr_user_app_surname_en , 
    req.cookies.cr_user_app_email , 
    req.cookies.cr_user_app_division , 
    new Date() ,
    Date.now() , 
    req.body.epw_expressway_name , 
    req.body.epw_expressway_price , 
    req.body.epw_expressway_description , 
  ]

  condb.query( sql_1 , req.body.epw_expressway_name , function(err , result){
    if(err){throw err}

    if(result.length == 0){
      condb.query( sql_2 , input_2 , function(err , result){
        if(err){throw err}

        res.send("success");
      } )
    }else{
      res.send("error same name");
    }
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/easy_pass_list" , function(req , res){
  let sql_1 = `SELECT * FROM tb_easy_pass`

  condb.query( sql_1 , async function(err , result){
    if(err){throw err}
    let easy_pass_data = result

    res.render( "easy_pass_list" , {user_data : req.cookies , easy_pass_data : await prepare_data_json(easy_pass_data) , dayjs : dayjs} )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/add_new_easy_pass" , function(req , res){

  let sql_1 = `SELECT * FROM tb_easy_pass WHERE tb_easy_pass.ezp_easy_pass_code = ?`
  let sql_2 = `INSERT INTO tb_easy_pass (ezp_create_by_user_app_id , ezp_create_by_name , ezp_create_by_email , ezp_create_by_division , ezp_create_date , ezp_create_timestamp , ezp_easy_pass_code , ezp_easy_pass_money , ezp_easy_pass_remark) 
  VALUES (? , ? , ? , ? , ? , ? , ? , ? , ?)`

  let input_2 = [
    req.cookies.cr_user_app_id , 
    req.cookies.cr_user_app_name_en + " " + req.cookies.cr_user_app_surname_en , 
    req.cookies.cr_user_app_email , 
    req.cookies.cr_user_app_division , 
    new Date() ,
    Date.now() , 
    req.body.ezp_easy_pass_code , 
    "0" , 
    req.body.ezp_easy_pass_remark , 
  ]

  condb.query( sql_1 , req.body.ezp_easy_pass_code , function(err , result){
    if(err){throw err}

    if(result.length == 0){
      condb.query( sql_2 , input_2 , function(err , result){
        if(err){throw err}

        res.send("success");
      } )
    }else{
      res.send("error same code");
    }
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/add_new_recharge" , function(req , res){
  
  let sql_1 = `INSERT INTO tb_easy_pass_recharge (epr_create_by_user_app_id , epr_create_by_name , epr_create_by_email , epr_create_by_division , epr_create_date , epr_create_timestamp , epr_join_ezp_id , epr_money , epr_remark) 
  VALUES (? , ? , ? , ? , ? , ? , ? , ? , ?)`
  let sql_2 = `SELECT * FROM tb_easy_pass WHERE tb_easy_pass.ezp_id = ?`
  let sql_3 = `UPDATE tb_easy_pass SET ezp_easy_pass_money = ? WHERE tb_easy_pass.ezp_id = ?`

  let input_1 = [
    req.cookies.cr_user_app_id , 
    req.cookies.cr_user_app_name_en + " " + req.cookies.cr_user_app_surname_en , 
    req.cookies.cr_user_app_email , 
    req.cookies.cr_user_app_division , 
    new Date() ,
    Date.now() , 
    req.body.recharge_ezp_id , 
    req.body.recharge_epw_expressway_price , 
    req.body.recharge_ezp_easy_pass_remark , 
  ]

  condb.query( sql_1 , input_1 , function(err , result){
    if(err){throw err}

    condb.query( sql_2 , req.body.recharge_ezp_id , function(err , result){
      if(err){throw err}
      let easy_pass_data = result
      
      condb.query( sql_3 , [((+easy_pass_data[0].ezp_easy_pass_money) + (+req.body.recharge_epw_expressway_price)) , req.body.recharge_ezp_id] , function(err , result){
        if(err){throw err}
        
        res.send("success");
      } )
    } )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/easy_pass_recharge_history_list/:easy_pass_code" , function(req , res){
  let sql_1 = `SELECT * FROM tb_easy_pass_recharge WHERE tb_easy_pass_recharge.epr_join_ezp_id = ? ORDER BY tb_easy_pass_recharge.epr_id DESC`
  let sql_2 = `SELECT * FROM tb_easy_pass WHERE tb_easy_pass.ezp_id = ?`

  condb.query( sql_1 , atob( req.params.easy_pass_code ) , async function(err , result){
    if(err){throw err}
    let easy_pass_recharge_history_data = result

    condb.query( sql_2 , atob( req.params.easy_pass_code ) , async function(err , result){
      if(err){throw err}
      let easy_pass_data = result
  
      res.render( "easy_pass_recharge_history_list" , {user_data : req.cookies , easy_pass_recharge_history_data : await prepare_data_json(easy_pass_recharge_history_data) , easy_pass_data : await prepare_data_json(easy_pass_data) , dayjs : dayjs} )
    } )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/add_new_drive" , function(req , res){
  let sql_1 = `INSERT INTO tb_driver_main (dm_nickname_th , dm_name_th , dm_nickname_en , dm_name_en , dm_status) VALUES ( ? , ? , ? , ? , "ใช้งาน" )`
  let input_1 = [
    req.body.nickname_th , 
    req.body.name_th , 
    req.body.nickname_en , 
    req.body.name_en , 
  ]

  condb.query( sql_1 , input_1 , function(err , result){
    if(err){throw err}
    res.end();
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/approval_division_create" , function(req , res){
  let division = (req.body.division).toUpperCase()

  res.contentType('application/json');
  let nextPage = JSON.stringify(`/approval_division_edit/${btoa(division)}`)
  res.header('Content-Length', nextPage.length);
  res.end(nextPage);

} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/approval_division_edit/:division_code" , function(req , res){
  let division = req.params.division_code

  // res.send( btoa(btoa(division)) )

  let sql_1 = `SELECT * FROM tb_approval_config WHERE tb_approval_config.ac_division = ? `

  condb.query( sql_1 , atob(division) , async function(err , result){
    if(err){throw err}
    console.log("atob(division)")
    console.log(atob(division))
    let division_approval_data = result
    console.log("division_approval_data")
    console.log(division_approval_data)

    let flow_approve = await set_data_flow_approve(division_approval_data)
    console.log("flow_approve")
    console.log(flow_approve)

    res.render( "approval_division_edit" , {user_data : req.cookies , division : atob(division) , flow_approve : flow_approve , division_approval_data : await prepare_data_json(division_approval_data)} )

    function set_data_flow_approve( data ){
      return new Promise( (resolve , reject) => {
        let array_object = []
        if( data.length == 0 ){
          resolve(array_object)
        }else{
          let step_approve = [...new Set(data.map(item => item.ac_ordering))].sort();
          for( let i = 0 ; i < step_approve.length ; i++ ){
            let step_approve_one = data.filter( function(e){
              return  e.ac_ordering == step_approve[i]
            } )

            if( step_approve_one.length == 1 && step_approve_one[0].ac_approval_email == "" ){
              array_object.push( { step_approve : step_approve[i] , approve : [] } )
            }else{
              array_object.push( { step_approve : step_approve[i] , approve : step_approve_one } )
            }

            if(i == step_approve.length - 1){
              resolve(array_object)
            }
          }
        }
      } )
    }

  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/qr_code" , function(req , res){
  res.render("qr_code" , { user_data : req.cookies } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/page_new" , function(req , res){
  res.render("page_new" )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/test_json" , async function(req , res){
  let sql_1 = `SELECT * FROM tb_asset`

  condb.query( sql_1 , async function(err , result){
    if(err){throw err}
    let comment_test = result
    console.log("comment_test")
    console.log(comment_test)

    res.render("index" , { user_data : req.cookies , comment_test : await prepare_data_json(comment_test) })
  } )
} )

function prepare_data_json(array_obj) {
  return new Promise((resolve, reject) => {
    try {
      array_obj.forEach(obj => {
        Object.entries(obj).forEach(([key, value]) => {
          if (typeof value === 'string') {
            obj[key] = value.replace(/["\\]/g, ' ');
          }
        });
      });
      resolve(array_obj);
    } catch (error) {
      reject(error);
    }
  });
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/report_refueling_per_month" , async function(req , res){

  let sql_1 = `SELECT * FROM tb_report_refueling_per_month`

  condb.query( sql_1 , async function(err , result){
    if(err){throw err}
    let report_refueling_per_month_data = result

    const filter_as_of = [...new Set(report_refueling_per_month_data.map(item => item.rrm_header_As_Of))];
    const filter_car_registration_code = [...new Set(report_refueling_per_month_data.map(item => item.rrm_License_Plate_Number))];
    const filter_fleet_card_number = [...new Set(report_refueling_per_month_data.map(item => item.rrm_Fleet_Card_Number))];
    const filter_cost_centre = [...new Set(report_refueling_per_month_data.map(item => item.rrm_Cost_Centre))];

    res.render( "report_refueling_per_month" , 
    {
      user_data : req.cookies , 
      report_refueling_per_month_data : await prepare_data_json(report_refueling_per_month_data) , 
      filter_as_of : await prepare_data_json(filter_as_of) , 
      filter_car_registration_code : await prepare_data_json(filter_car_registration_code) , 
      filter_fleet_card_number : await prepare_data_json(filter_fleet_card_number) , 
      filter_cost_centre : await prepare_data_json(filter_cost_centre) , 
      dayjs : dayjs} )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/find_main_document_from_sub_document_id" , function( req , res ){
  let sql_1 = `SELECT * FROM tb_car_rent_document_sub WHERE tb_car_rent_document_sub.cds_id = ?`
  let sql_2 = `SELECT * FROM tb_car_rent_document_main WHERE tb_car_rent_document_main.cdm_id = ?`

  condb.query( sql_1 , req.body.sub_document_id , function(err , result){
    if(err){throw err}
    let sub_document_data = result
    
    if(sub_document_data.length == 0){
      res.send({ message : "error_1" , link : "" });
    }else{
      condb.query( sql_2 , sub_document_data[0].cds_join_cdm_id , function(err , result){
        if(err){throw err}
        let main_document_data = result

        if( main_document_data.length == 0 ){
          res.send({ message : "error_2" , link : "" });
        }else{
          res.send({ message : "success" , link : `/car_rent_document_approve_view/${btoa(main_document_data[0].cdm_id)}` });
        }
      } )
    }
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const fileUpload = require('express-fileupload');
const uploadOpts = {
  useTempFiles : true , 
  tempFileDir : "/tmp/"
}

// const multer = require('multer');
const XLSX = require('xlsx')
// const fs = require('fs')

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/uploads_refueling_excel" , upload.single('fileupload') , async function(req , res){
  console.log("+++")

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log("worksheet[10].NULL")
    console.log(worksheet[10].NULL)

    // if( worksheet[10].NULL == undefined ){
    //   console.log("Can Check")
    // }

    let excel_header = worksheet.slice(0, 4);
    let excel_detail = worksheet.slice(4, worksheet.length - 1);
    let excel_footer = worksheet.slice(worksheet.length - 1 , worksheet.length);

    console.log("excel_header")
    console.log(excel_header)

    console.log("excel_detail")
    console.log(excel_detail)

    console.log("excel_detail.length")
    console.log(excel_detail.length)

    console.log("excel_footer")
    console.log(excel_footer)

    let return_value = await insert_data_excel_to_sql( excel_header , excel_detail , excel_footer , req )

    if( return_value.message == "success" ){
      await join_report_to_sub_document( return_value.As_Of )
      res.redirect( "/report_refueling_per_month" );
    }else{
      res.redirect( "/report_refueling_per_month" );
    }

    console.log("return_value")
    console.log(return_value)

    res.redirect( "/report_refueling_per_month" );

  } catch (error) {
    console.log(error)
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function join_report_to_sub_document( As_Of ){
  return new Promise( (resolve , reject) => {
    let sql_1 = `SELECT * FROM tb_report_refueling_per_month WHERE tb_report_refueling_per_month.rrm_header_As_Of = ?`

    condb.query( sql_1 , As_Of , async function(err , result){
      if(err){throw err}
      let report_this_as_of = result

      if(report_this_as_of.length == 0){
        resolve()
      }else{
        for( let i = 0 ; i < report_this_as_of.length ; i++ ){
          let morning_or_afternoon = await set_morning_or_afternoon( report_this_as_of[i].rrm_Transaction_Time ) 

          let sql_2 = `SELECT * FROM tb_car_rent_document_sub LEFT JOIN tb_car_list ON tb_car_list.car_id = tb_car_rent_document_sub.cds_join_car_id 
          WHERE tb_car_rent_document_sub.cds_date = ? AND tb_car_rent_document_sub.cds_phase = ? AND 
          ( tb_car_rent_document_sub.cds_status = ? OR tb_car_rent_document_sub.cds_status = ? OR tb_car_rent_document_sub.cds_status = ? OR tb_car_rent_document_sub.cds_status = ? OR tb_car_rent_document_sub.cds_status = ? )`
          let sql_3 = `UPDATE tb_report_refueling_per_month SET rrm_join_cds_id = ? WHERE tb_report_refueling_per_month.rrm_id = ?`

          let input_2 = [
            report_this_as_of[i].rrm_Settlement_Date , 
            morning_or_afternoon , 
            "อนุมัติแล้ว" , 
            "ส่งรถแล้ว" , 
            "รับรถแล้ว" , 
            "คืนรถแล้ว" , 
            "สำเร็จแล้ว" , 
          ]
          condb.query( sql_2 , input_2 , function(err , result){
            if(err){throw err}
            
            if( result.length == 0 ){
              if( i == report_this_as_of.length - 1 ){
                resolve()
              }
            }else{
              condb.query( sql_3 , [result[0].cds_id , report_this_as_of[i].rrm_id] , function(err , result){
                if(err){throw err}
                if( i == report_this_as_of.length - 1 ){
                  resolve()
                }
              } )
            }
          } )
        }
      }
    } )
  } )
}

function set_morning_or_afternoon( time ){
  return new Promise ( (resolve , reject) => {
    let array_time = time.split(":")
    if( +array_time[0] < 12 ){
      resolve("ช่วงเช้า")
    }else{
      resolve("ช่วงบ่าย")
    }
  } )
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function insert_data_excel_to_sql( excel_header , excel_detail , excel_footer , req ){
  return new Promise( (resolve , reject) => {
    if( excel_header.length == 0 || excel_detail.length == 0 ){
      resolve({ 
        message : "error" , 
        As_Of : ""
      })
    }else{

      let sql_1 = `SELECT * FROM tb_report_refueling_per_month WHERE tb_report_refueling_per_month.rrm_header_As_Of = ?`

      condb.query( sql_1 , excel_header[3].__EMPTY_1 , function (err , result){
        if(err){throw err}

        if( result.length > 0 ){
          resolve({ 
            message : "duplicate As Of" , 
            As_Of : ""
          })
        }else{
          let sql_2 = `INSERT INTO tb_report_refueling_per_month 
          ( 
            rrm_create_by_user_app_id , rrm_create_by_name , rrm_create_by_email , rrm_create_by_division , rrm_create_date , rrm_create_timestamp , 
            rrm_header_Account_Name , rrm_header_Account_No , rrm_header_Report_Name , rrm_header_As_Of , 
            rrm_Account_Number , rrm_Company_Tax_ID , rrm_Account_Name, rrm_Company_Br, rrm_Settlement_Date, rrm_Transaction_Date, rrm_Transaction_Time, rrm_License_Plate_Number, rrm_Fleet_Card_Number, 
            rrm_Cardholder_Name, rrm_Card_Credit_Limit_BHT, rrm_Card_Credit_Limit_LITRE, rrm_Cost_Centre, rrm_Department, rrm_Invoice_Number, rrm_Termial_ID, rrm_Merchant_ID, rrm_Tax_ID_of_Merchant, 
            rrm_Merchant_Name, rrm_Merchant_Br, rrm_Register_Address, rrm_Merchant_Address, rrm_Amount_Before_VAT, rrm_VAT_BHT, rrm_Total_Amount, rrm_Product, rrm_Liter, rrm_Odometer, rrm_HDO, rrm_All_Total_Amount
           ) VALUES ( ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? )`
           let Account_Name = `บริษัท ซินเท็ค คอนสตรัคชั่น จำกัด (มหาชน)`
          for( let i = 0 ; i < excel_detail.length ; i++ ){
            let excel_header_0 = excel_header[0]
            let excel_header_1 = excel_header[1]
            let excel_header_2 = excel_header[2]
            let input_2 = [
              req.cookies.cr_user_app_id , 
              req.cookies.cr_user_app_name_en + " " + req.cookies.cr_user_app_surname_en , 
              req.cookies.cr_user_app_email , 
              req.cookies.cr_user_app_division , 
              new Date() ,
              Date.now() , 

              Account_Name , 
              excel_header_0[Account_Name] , 
              excel_header_1[Account_Name] , 
              excel_header_2[Account_Name] , 

              excel_detail[i]['Account Name'] , 
              excel_detail[i]['บริษัท ซินเท็ค คอนสตรัคชั่น จำกัด (มหาชน)'] , 
              excel_detail[i].__EMPTY , 
              excel_detail[i].__EMPTY_1 , 
              new Date(`${((excel_detail[i].__EMPTY_2).split("/"))[2]}-${((excel_detail[i].__EMPTY_2).split("/"))[1]}-${((excel_detail[i].__EMPTY_2).split("/"))[0]}`) , 
              new Date(`${((excel_detail[i].__EMPTY_3).split("/"))[2]}-${((excel_detail[i].__EMPTY_3).split("/"))[1]}-${((excel_detail[i].__EMPTY_3).split("/"))[0]}`) , 
              excel_detail[i].__EMPTY_4 , 
              excel_detail[i].__EMPTY_5 , 
              excel_detail[i].__EMPTY_6 , 
              excel_detail[i].__EMPTY_7 , 
              excel_detail[i].__EMPTY_8 , 
              excel_detail[i].__EMPTY_9 , 
              excel_detail[i].__EMPTY_10 , 
              excel_detail[i].__EMPTY_11 , 
              excel_detail[i].__EMPTY_12 , 
              excel_detail[i].__EMPTY_13 , 
              excel_detail[i].__EMPTY_14 , 
              excel_detail[i].__EMPTY_15 , 
              excel_detail[i].__EMPTY_16 , 
              excel_detail[i].__EMPTY_17 , 
              excel_detail[i].__EMPTY_18 , 
              excel_detail[i].__EMPTY_19 , 
              excel_detail[i].__EMPTY_20 , 
              excel_detail[i].__EMPTY_21 , 
              excel_detail[i].__EMPTY_22 , 
              excel_detail[i].__EMPTY_23 , 
              excel_detail[i].__EMPTY_24 , 
              excel_detail[i].__EMPTY_25 , 
              excel_detail[i].__EMPTY_27 , 

              excel_footer[0].__EMPTY_22
            ]

            condb.query( sql_2 , input_2 , function(err , result){
              if(err){throw err}
              if( i == excel_detail.length - 1 ){
                resolve({ 
                  message : "success" , 
                  As_Of : excel_header_2[Account_Name]
                })
              }
            } )
          }
        }
      } )
    }
  } )
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/uploads_ticket_excel" , upload.single('fileupload') , async function(req , res){
  console.log("+++")

  if( req.cookies.cr_user_app_email == null || req.cookies.cr_user_app_email == "" ){
    res.cookie( "cr_save_old_url", `/admin_setup_ticket` );
    res.redirect( powerapps_link )
  }else{
    try {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
  
      console.log("worksheet")
      console.log(worksheet)
  
      if( worksheet[0].Brand == undefined ){
        res.send("คอลัมม์ Brand ผิด")
  
      }else if( worksheet[0].Code_Ticket == undefined ){
        res.send("คอลัมม์ Code_Ticket ผิด")
  
      }else if( worksheet[0].Remark == undefined ){
        res.send("คอลัมม์ Remark ผิด")
  
      }else if( worksheet[0].Start_Using == undefined ){
        res.send("คอลัมม์ Start_Using ผิด")
  
      }else if( worksheet[0].End_Using == undefined ){
        res.send("คอลัมม์ End_Using ผิด")
  
      }else{
        let result_checking = await checking_data_ticket_excel( worksheet )
        if( result_checking == "success" ){
          await insert_data_ticket_excel_to_sql( worksheet , req )
          res.redirect("/admin_setup_ticket")
        }else{
          res.send(result_checking)
        }
      }
  
    } catch (error) {
      console.log(error)
    }
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function checking_data_ticket_excel( data_obj ){
  return new Promise( (resolve , reject) => {

    let result_checking = "success"

    for( let i = 0 ; i < data_obj.length ; i++ ){
      if( data_obj[i].Brand != "Grab" && data_obj[i].Brand != "Bolt" ){
        result_checking = "Brand ต้องเป็น Grab หรือ Bolt เท่านั้น"
        resolve(result_checking)

      }else if( data_obj[i].Code_Ticket == "" || data_obj[i].Code_Ticket == " " || data_obj[i].Code_Ticket == "  " || data_obj[i].Code_Ticket == undefined ){
        result_checking = "Code_Ticket ไม่สามารถเป็นค่าว่างได้"
        resolve(result_checking)

      }else if( data_obj[i].Start_Using == "" || data_obj[i].Start_Using == " " || data_obj[i].Start_Using == "  " || data_obj[i].Start_Using == undefined ){
        result_checking = "Start_Using ไม่สามารถเป็นค่าว่างได้"
        resolve(result_checking)

      }else if( data_obj[i].End_Using == "" || data_obj[i].End_Using == " " || data_obj[i].End_Using == "  " || data_obj[i].End_Using == undefined ){
        result_checking = "End_Using ไม่สามารถเป็นค่าว่างได้"
        resolve(result_checking)

      }else if( i == data_obj.length - 1 ){
        resolve(result_checking)

      }
    }
  } )
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function insert_data_ticket_excel_to_sql( data_obj , req ){
  return new Promise( (resolve , reject) => {

    console.log( "come in to fucntion insert_data_ticket_excel_to_sql" )

    let sql_1 = `INSERT INTO th_ticket (tk_create_by_user_id , tk_create_by_name , tk_create_by_email , tk_create_by_division , tk_create_date , tk_create_timestamp , 
    tk_brand , tk_code , tk_detail , tk_start_use , tk_end_use , tk_status) VALUES ( ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , "ยังไม่ถึงกำหนด")`

    for( let i = 0 ; i < data_obj.length ; i++ ){

      let start_date = (data_obj[i].Start_Using).split("/")
      let start_date_day = start_date[0]
      let start_date_maonth = start_date[1]
      let start_date_year = start_date[2]
      let start_date_gene = new Date((new Date( `${start_date_year}-${start_date_maonth}-${start_date_day}` ).setHours(0,0,0,0)))

      let end_date = (data_obj[i].End_Using).split("/") 
      let end_date_day = end_date[0]
      let end_date_maonth = end_date[1]
      let end_date_year = end_date[2]
      let end_date_gene = new Date(new Date( `${end_date_year}-${end_date_maonth}-${end_date_day}` ).setHours(0,0,0,0))

      let input_1 = [
        req.cookies.cr_user_app_id , 
        req.cookies.cr_user_app_name_en + " " + req.cookies.cr_user_app_surname_en , 
        req.cookies.cr_user_app_email , 
        req.cookies.cr_user_app_division , 
        new Date() ,
        Date.now() , 
        data_obj[i].Brand , 
        data_obj[i].Code_Ticket , 
        data_obj[i].Remark , 
        start_date_gene , 
        end_date_gene
      ]

      condb.query( sql_1 , input_1 , function(err , result){
        if(err){throw err}

        if( i == data_obj.length - 1 ){
          ticket_refresh_status_today_open_ticket()
          resolve()
        }
      } )
    }
  } )
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/test_multi_files_upload" , upload.array('files') , function(req , res){

  res.send('Files uploaded successfully.');
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////// ADMIN SETUP ////////////////////////////////////////////////////////////////

router.get( "/admin_system_control_user" , function(req , res){

  if( req.cookies.css_user_id == null || req.cookies.css_user_email == null ){
    res.cookie( "css_save_page_url", `/admin_system_control_user` );
    res.redirect( powerapps_link )
  }else{

    req.session.css_now_page = "admin"

    let sql_1 = `SELECT * FROM tb_user`
  
    condb.query( sql_1 , function(err , result){
      if(err){throw err}
      let user_list = result
  
      res.render( "admin_system_control_user" , { user_data : req.cookies , user_list : user_list } )
    } )
  }
} )

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get('/', function(req, res, next) {
  if( req.cookies.css_user_id == null ){
    res.cookie( "css_save_page_url", `/home` );
    res.redirect( powerapps_link )
  }else{
    res.render('index' , { user_data : req.cookies });
  }
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/api_project_code" , function(req , res){
  let sql_1 = `SELECT * FROM tb_project_information`

  condb.query( sql_1 , function(err , result){
    if(err){throw err}

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/login_from_powerapps/:fullname/:division/:email/:powerapps_id" , async function(req , res){

  let fullname = req.params.fullname
  let division = req.params.division
  let email = (req.params.email).toLowerCase()
  let powerapps_id = req.params.powerapps_id

  let sql_2 = `SELECT * FROM tb_user WHERE tb_user.us_email = ?`
  let sql_3 = `INSERT INTO tb_user ( us_email , us_fullname_th , us_fullname_en , us_division , us_powerapps_id , us_employee_id , us_employee_id_2 ) VALUE ( ? , ? , ? , ? , ? , ? , ? )`
  let sql_4 = `SELECT * FROM tb_user_iso WHERE tb_user_iso.iso_email = ?`
  let sql_5 = `SELECT * FROM tb_user_coo WHERE tb_user_coo.coo_email = ?`

  try {
    let employee_ite_data = await axios.get(url_api_employee_ite);
    console.log(employee_ite_data);

    let employee_id_and_employee_id_2_and_name_th = (employee_ite_data.data).filter( function(e){
        return  e.ed_email_ite == email
    } )

    console.log(employee_id_and_employee_id_2_and_name_th)

    if(employee_id_and_employee_id_2_and_name_th.length > 0){
      await check_user_in_system_with_data( sql_2 , email )
    }else{
      await check_user_in_system_without_data( sql_2 , email )
    }

    condb.query( sql_4 , email , function(err , result){
      if(err){throw err}

      if(result.length > 0){
        res.cookie( "css_user_iso", "ISO" );

      }else{
        res.cookie( "css_user_iso", "NO ISO" );

      }

      condb.query( sql_5 , email , function(err , result){
        if(err){throw err}
  
        if(result.length > 0){
          res.cookie( "css_user_coo", "COO" );
  
        }else{
          res.cookie( "css_user_coo", "NO COO" );
  
        }

        condb.query( sql_2 , email , function( err , result ){
          if(err){throw err}
      
          if( result.length == 0 ){
            res.redirect( powerapps_link )
          }else{
              res.cookie( "css_user_id", result[0].us_id );
              res.cookie( "css_employee_id", result[0].us_employee_id );
              res.cookie( "css_employee_id_2", result[0].us_employee_id_2 );
              res.cookie( "css_user_email", result[0].us_email );
              res.cookie( "css_user_fullname_th" , result[0].us_fullname_th );
              res.cookie( "css_user_fullname_en", result[0].us_fullname_en );
              res.cookie( "css_user_division", result[0].us_division );
              res.cookie( "css_user_row", result[0].us_row );
              res.cookie( "css_user_enable", result[0].us_enable );
              res.cookie( "css_user_view_report", result[0].us_view_report );
      
              if( req.cookies.css_save_page_url == null || req.cookies.css_save_page_url == "null" ){
                res.redirect( "/home" )
              }else{
                if( req.cookies.css_save_page_url != "" ){
                  res.cookie( "css_save_page_url", "" );
                  res.redirect( req.cookies.css_save_page_url )
                }else{
                  res.redirect( "/home" )
                }
              }
          }
        } )
      } )
    } )

    function check_user_in_system_with_data( sql , value ) {
      return new Promise((resolve, reject) => {
        condb.query( sql , value , async function(err , result){
          if(err){reject(err);}
  
          if( result.length == 0 ){
            condb.query( sql_3 , 
              [ 
                email , 
                employee_id_and_employee_id_2_and_name_th[0].ed_name_th + " " + employee_id_and_employee_id_2_and_name_th[0].ed_surname_th , 
                fullname , 
                division , 
                powerapps_id , 
                employee_id_and_employee_id_2_and_name_th[0].ed_id , 
                employee_id_and_employee_id_2_and_name_th[0].ed_employee_id 
              ] , async function(err , result){
              if(err){reject(err);}
              resolve()
            } )
          }else{
            let sql_6 = `UPDATE tb_user SET us_fullname_th = ? , us_fullname_en = ? , us_division = ? , us_powerapps_id = ? , us_employee_id = ? , us_employee_id_2 = ? WHERE us_email = ? `
            condb.query( sql_6 , 
              [ 
                employee_id_and_employee_id_2_and_name_th[0].ed_name_th + " " + employee_id_and_employee_id_2_and_name_th[0].ed_surname_th , 
                fullname , 
                division , 
                powerapps_id , 
                employee_id_and_employee_id_2_and_name_th[0].ed_id , 
                employee_id_and_employee_id_2_and_name_th[0].ed_employee_id , 
                email
              ] , async function(err , result){
              if(err){reject(err);}
              resolve()
            } )
          }
        } )
      });
    }
  
    function check_user_in_system_without_data( sql , value ) {
      return new Promise((resolve, reject) => {
        condb.query( sql , value , async function(err , result){
          if(err){reject(err);}
  
          if( result.length == 0 ){
            condb.query( sql_3 , 
              [ 
                email , 
                "ไม่พบข้อมูลในฐานข้อมูลพนักงาน" , 
                fullname , 
                division , 
                powerapps_id , 
                "ไม่พบข้อมูลในฐานข้อมูลพนักงาน" , 
                "ไม่พบข้อมูลในฐานข้อมูลพนักงาน"
              ] , async function(err , result){
              if(err){reject(err);}
              resolve()
            } )
          }else{
            resolve()
          }
  
        } )
      });
    }

  } catch (error) {
    console.error(error);
  }

} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/action_plan_approve_list_approve" , async function(req , res){

  let array_project_id = (req.body.array_document_id).split(",")
  let comment_approve = (req.body.approve_comment).replace(/[`'"\\]/g, ' ')

  let sql_1 = `SELECT * FROM tb_project_information WHERE tb_project_information.pj_id = ?`
  let sql_2 = `SELECT * FROM tb_user_iso`
  let sql_3 = `SELECT * FROM tb_user_coo`

  console.log( "array_project_id" )
  console.log( array_project_id )
  console.log( "comment_approve" )
  console.log( comment_approve )

  condb.query( sql_2 , function(err , result){
    if(err){throw err}
    let user_iso_object = result
    let user_iso_emails = user_iso_object.map(item => item.iso_email).join('; ');

    condb.query( sql_3 , async function(err , result){
      if(err){throw err}
      let user_coo_object = result
      let user_coo_emails = user_coo_object.map(item => item.coo_email).join('; ');

      console.log("user_iso_emails")
      console.log(user_iso_emails)
      console.log("user_coo_emails")
      console.log(user_coo_emails)
      
      for( let i = 0 ; i < array_project_id.length ; i++ ){
        let project_data = await query_data(sql_1 , array_project_id[i])
        await split_way_approve(project_data[0])
        await send_email_to_admin_and_sm_project(project_data[0])

        if( i == array_project_id.length - 1 ){
          res.end();
        }
      }

      function split_way_approve( project_data ) {
        return new Promise((resolve, reject) => {
    
          if( project_data.pj_status_css_doc == "รอ PM อนุมัติ Action Plan ครั้งที่ 1" ){
            let sql_1 = `UPDATE tb_project_information SET pj_status_css_doc = "รอ BU อนุมัติ Action Plan ครั้งที่ 1" , pj_action_plan_1_pm_approve_date = ? , pj_action_plan_1_pm_approve_remark = ? WHERE tb_project_information.pj_id = ? `
            condb.query( sql_1 , [ new Date() , comment_approve , project_data.pj_id ] , function( err , result ){
              if(err){throw err}
    
              send_email( 
                project_data.BUEmail , 
                project_data.BU_name , 
                `ต้องอนุมัติ : Action Plan ครั้งที่ 1 ของโครงการ ${project_data.ProjectCode}` , 
                `เรียน ${project_data.BU_name} <br><br>
                ---------------------------- <br><br>
                Action Plan ครั้งที่ 1 ของโครงการ ${project_data.ProjectCode} ได้รับการสรุปผลการประเมินความพึงพอใจของลูกค้าแล้ว และได้ทำ Action Plan แล้วดังนี้ <br><br>
                คอมเมนต์จาก PM : ${comment_approve} <br><br>
                ---------------------------- <br><br>
                Action Plan : ${project_data.pj_action_plan_1} <br><br>
                จัดทำโดย : ${project_data.pj_action_plan_1_submit_by_name_th} (${project_data.pj_action_plan_1_submit_by_name_en}) <br><br>
                จัดทำเมื่อ : ${dayjs(project_data.pj_action_plan_1_submit_by_date).format('DD/MM/YYYY')} <br><br>` , 
                `คลิกเพื่อเข้าหน้าอนุมัติ` , 
                `${url_now}/project_information/${btoa(project_data.pj_id)}` , 
                "" 
              )

              resolve()
            } )
    
          }else if( project_data.pj_status_css_doc == "รอ BU อนุมัติ Action Plan ครั้งที่ 1" ){
            let sql_1 = `UPDATE tb_project_information SET pj_status_css_doc = "รอ ISO อนุมัติ Action Plan ครั้งที่ 1" , pj_action_plan_1_bu_approve_date = ? , pj_action_plan_1_bu_approve_remark = ? WHERE tb_project_information.pj_id = ? `
            condb.query( sql_1 , [ new Date() , comment_approve , project_data.pj_id ] , function( err , result ){
              if(err){throw err}
    
              send_email( 
                user_iso_emails , 
                user_iso_emails , 
                `ต้องอนุมัติ : Action Plan ครั้งที่ 1 ของโครงการ ${project_data.ProjectCode}` , 
                `เรียน ทีม ISO <br><br>
                ---------------------------- <br><br>
                Action Plan ครั้งที่ 1 ของโครงการ ${project_data.ProjectCode} ได้รับการสรุปผลการประเมินความพึงพอใจของลูกค้าแล้ว และได้ทำ Action Plan แล้วดังนี้ <br><br>
                คอมเมนต์จาก BU : ${comment_approve} <br><br>
                ---------------------------- <br><br>
                Action Plan : ${project_data.pj_action_plan_1} <br><br>
                จัดทำโดย : ${project_data.pj_action_plan_1_submit_by_name_th} (${project_data.pj_action_plan_1_submit_by_name_en}) <br><br>
                จัดทำเมื่อ : ${dayjs(project_data.pj_action_plan_1_submit_by_date).format('DD/MM/YYYY')} <br><br>` , 
                `คลิกเพื่อเข้าหน้าอนุมัติ` , 
                `${url_now}/project_information/${btoa(project_data.pj_id)}` , 
                "" 
              )

              resolve()
            } )
    
          }else if( project_data.pj_status_css_doc == "รอ ISO อนุมัติ Action Plan ครั้งที่ 1" ){
            let sql_1 = `UPDATE tb_project_information SET pj_status_css_doc = "รอ COO อนุมัติ Action Plan ครั้งที่ 1" , pj_action_plan_1_iso_approve_date = ? , 
            pj_action_plan_1_iso_approve_remark = ? , pj_action_plan_1_iso_approve_name_th = ? , pj_action_plan_1_iso_approve_name_en = ? , pj_action_plan_1_iso_approve_email = ? 
            WHERE tb_project_information.pj_id = ? `
            condb.query( sql_1 , [ new Date() , comment_approve , req.cookies.css_user_fullname_th , req.cookies.css_user_fullname_en , req.cookies.css_user_email , project_data.pj_id ] , function( err , result ){
              if(err){throw err}
    
              send_email( 
                user_coo_emails , 
                user_coo_emails , 
                `ต้องอนุมัติ : Action Plan ครั้งที่ 1 ของโครงการ ${project_data.ProjectCode}` , 
                `เรียน COO <br><br>
                ---------------------------- <br><br>
                Action Plan ครั้งที่ 1 ของโครงการ ${project_data.ProjectCode} ได้รับการสรุปผลการประเมินความพึงพอใจของลูกค้าแล้ว และได้ทำ Action Plan แล้วดังนี้ <br><br>
                คอมเมนต์จาก ISO : ${comment_approve} <br><br>
                ---------------------------- <br><br>
                Action Plan : ${project_data.pj_action_plan_1} <br><br>
                จัดทำโดย : ${project_data.pj_action_plan_1_submit_by_name_th} (${project_data.pj_action_plan_1_submit_by_name_en}) <br><br>
                จัดทำเมื่อ : ${dayjs(project_data.pj_action_plan_1_submit_by_date).format('DD/MM/YYYY')} <br><br>` , 
                `คลิกเพื่อเข้าหน้าอนุมัติ` , 
                `${url_now}/project_information/${btoa(project_data.pj_id)}` , 
                "" 
              )

              resolve()
            } )
            
          }else if( project_data.pj_status_css_doc == "รอ COO อนุมัติ Action Plan ครั้งที่ 1" ){
            let sql_1 = `UPDATE tb_project_information SET pj_status_css_doc = "ประเมินและทำ Action Plan ครั้งที่ 1 สำเร็จแล้ว" , pj_action_plan_1_coo_approve_date = ? , 
            pj_action_plan_1_coo_approve_remark = ? , pj_action_plan_1_coo_approve_name_th = ? , pj_action_plan_1_coo_approve_name_en = ? , pj_action_plan_1_coo_approve_email = ? 
            WHERE tb_project_information.pj_id = ? `
            condb.query( sql_1 , [ new Date() , comment_approve , req.cookies.css_user_fullname_th , req.cookies.css_user_fullname_en , req.cookies.css_user_email , project_data.pj_id ] , function( err , result ){
              if(err){throw err}

              resolve()
            } )

          }else if( project_data.pj_status_css_doc == "รอ PM อนุมัติ Action Plan ครั้งที่ 2" ){
            let sql_1 = `UPDATE tb_project_information SET pj_status_css_doc = "รอ BU อนุมัติ Action Plan ครั้งที่ 2" , pj_action_plan_2_pm_approve_date = ? , pj_action_plan_2_pm_approve_remark = ? WHERE tb_project_information.pj_id = ? `
            condb.query( sql_1 , [ new Date() , comment_approve , project_data.pj_id ] , function( err , result ){
              if(err){throw err}
    
              send_email( 
                project_data.BUEmail , 
                project_data.BU_name , 
                `ต้องอนุมัติ : Action Plan ครั้งที่ 2 ของโครงการ ${project_data.ProjectCode}` , 
                `เรียน ${project_data.BU_name} <br><br>
                ---------------------------- <br><br>
                Action Plan ครั้งที่ 2 ของโครงการ ${project_data.ProjectCode} ได้รับการสรุปผลการประเมินความพึงพอใจของลูกค้าแล้ว และได้ทำ Action Plan แล้วดังนี้ <br><br>
                คอมเมนต์จาก PM : ${comment_approve} <br><br>
                ---------------------------- <br><br>
                Action Plan : ${project_data.pj_action_plan_2} <br><br>
                จัดทำโดย : ${project_data.pj_action_plan_2_submit_by_name_th} (${project_data.pj_action_plan_2_submit_by_name_en}) <br><br>
                จัดทำเมื่อ : ${dayjs(project_data.pj_action_plan_2_submit_by_date).format('DD/MM/YYYY')} <br><br>` , 
                `คลิกเพื่อเข้าหน้าอนุมัติ` , 
                `${url_now}/project_information/${btoa(project_data.pj_id)}` , 
                "" 
              )

              resolve()
            } )
          }else if( project_data.pj_status_css_doc == "รอ BU อนุมัติ Action Plan ครั้งที่ 2" ){
            let sql_1 = `UPDATE tb_project_information SET pj_status_css_doc = "รอ ISO อนุมัติ Action Plan ครั้งที่ 2" , pj_action_plan_2_bu_approve_date = ? , pj_action_plan_2_bu_approve_remark = ? WHERE tb_project_information.pj_id = ? `
            condb.query( sql_1 , [ new Date() , comment_approve , project_data.pj_id ] , function( err , result ){
              if(err){throw err}
    
              send_email( 
                user_iso_emails , 
                user_iso_emails , 
                `ต้องอนุมัติ : Action Plan ครั้งที่ 2 ของโครงการ ${project_data.ProjectCode}` , 
                `เรียน ทีม ISO <br><br>
                ---------------------------- <br><br>
                Action Plan ครั้งที่ 2 ของโครงการ ${project_data.ProjectCode} ได้รับการสรุปผลการประเมินความพึงพอใจของลูกค้าแล้ว และได้ทำ Action Plan แล้วดังนี้ <br><br>
                คอมเมนต์จาก BU : ${comment_approve} <br><br>
                ---------------------------- <br><br>
                Action Plan : ${project_data.pj_action_plan_2} <br><br>
                จัดทำโดย : ${project_data.pj_action_plan_2_submit_by_name_th} (${project_data.pj_action_plan_2_submit_by_name_en}) <br><br>
                จัดทำเมื่อ : ${dayjs(project_data.pj_action_plan_2_submit_by_date).format('DD/MM/YYYY')} <br><br>` , 
                `คลิกเพื่อเข้าหน้าอนุมัติ` , 
                `${url_now}/project_information/${btoa(project_data.pj_id)}` , 
                "" 
              )

              resolve()
            } )

          }else if( project_data.pj_status_css_doc == "รอ ISO อนุมัติ Action Plan ครั้งที่ 2" ){
            let sql_1 = `UPDATE tb_project_information SET pj_status_css_doc = "รอ COO อนุมัติ Action Plan ครั้งที่ 2" , pj_action_plan_2_iso_approve_date = ? , 
            pj_action_plan_2_iso_approve_remark = ? , pj_action_plan_2_iso_approve_name_th = ? , pj_action_plan_2_iso_approve_name_en = ? , pj_action_plan_2_iso_approve_email = ? 
            WHERE tb_project_information.pj_id = ? `
            condb.query( sql_1 , [ new Date() , comment_approve , req.cookies.css_user_fullname_th , req.cookies.css_user_fullname_en , req.cookies.css_user_email , project_data.pj_id ] , function( err , result ){
              if(err){throw err}
    
              send_email( 
                user_coo_emails , 
                user_coo_emails , 
                `ต้องอนุมัติ : Action Plan ครั้งที่ 2 ของโครงการ ${project_data.ProjectCode}` , 
                `เรียน COO <br><br>
                ---------------------------- <br><br>
                Action Plan ครั้งที่ 2 ของโครงการ ${project_data.ProjectCode} ได้รับการสรุปผลการประเมินความพึงพอใจของลูกค้าแล้ว และได้ทำ Action Plan แล้วดังนี้ <br><br>
                คอมเมนต์จาก ISO : ${comment_approve} <br><br>
                ---------------------------- <br><br>
                Action Plan : ${project_data.pj_action_plan_2} <br><br>
                จัดทำโดย : ${project_data.pj_action_plan_2_submit_by_name_th} (${project_data.pj_action_plan_2_submit_by_name_en}) <br><br>
                จัดทำเมื่อ : ${dayjs(project_data.pj_action_plan_2_submit_by_date).format('DD/MM/YYYY')} <br><br>` , 
                `คลิกเพื่อเข้าหน้าอนุมัติ` , 
                `${url_now}/project_information/${btoa(project_data.pj_id)}` , 
                "" 
              )

              resolve()
            } )

          }else if( project_data.pj_status_css_doc == "รอ COO อนุมัติ Action Plan ครั้งที่ 2" ){
            let sql_1 = `UPDATE tb_project_information SET pj_status_css_doc = "สำเร็จ (ประเมิน 2 ครั้ง)" , pj_action_plan_2_coo_approve_date = ? , 
            pj_action_plan_2_coo_approve_remark = ? , pj_action_plan_2_coo_approve_name_th = ? , pj_action_plan_2_coo_approve_name_en = ? , pj_action_plan_2_coo_approve_email = ? 
            WHERE tb_project_information.pj_id = ? `
            condb.query( sql_1 , [ new Date() , comment_approve , req.cookies.css_user_fullname_th , req.cookies.css_user_fullname_en , req.cookies.css_user_email , project_data.pj_id ] , function( err , result ){
              if(err){throw err}

              resolve()
            } )

          }else{
            resolve()
          }
    
        });
      }

      function send_email_to_admin_and_sm_project( project_data ) {
        return new Promise((resolve, reject) => {

          let sql_1 = `SELECT * FROM tb_division_admin WHERE tb_division_admin.da_ref_division_name = ? `
          let sql_2 = `SELECT * FROM tb_site_manager WHERE tb_site_manager.sm_project_id = ? `

          condb.query( sql_1 , project_data.Fulldepartment , function( err , result ){
            if(err){throw err}
            let admin = result
  
            condb.query( sql_2 , project_data.pj_id , function( err , result ){
              if(err){throw err}
              let sm = result

              let admin_email = ""
              let sm_email = ""

              if( admin.length ==  0){
                admin_email = ""
              }else{
                admin_email = admin.map(item => item.da_admin_email).join('; ');
              }
              
              if( sm.length ==  0){
                sm_email = ""
              }else{
                sm_email = sm.map(item => item.sm_email).join('; ');
              }
              
              if( project_data.pj_status_css_doc == "รอ PM อนุมัติ Action Plan ครั้งที่ 1" ){
                send_email( 
                  admin_email + " " + sm_email , 
                  admin_email + " " + sm_email , 
                  `อัพเดท : PM อนุมัติแล้ว Action Plan ครั้งที่ 1 ของโครงการ ${project_data.ProjectCode}` , 
                  `เรียน Admin และ SM ของโครงการ ${project_data.ProjectCode} <br><br>
                  ---------------------------- <br><br>
                  Action Plan ครั้งที่ 1 ของโครงการ ${project_data.ProjectCode} ได้รับการอนุมัติจาก PM แล้ว <br><br>
                  คอมเมนต์จาก PM : ${comment_approve} <br><br>
                  ---------------------------- <br><br>
                  Action Plan : ${project_data.pj_action_plan_1} <br><br>
                  จัดทำโดย : ${project_data.pj_action_plan_1_submit_by_name_th} (${project_data.pj_action_plan_1_submit_by_name_en}) <br><br>
                  จัดทำเมื่อ : ${dayjs(project_data.pj_action_plan_1_submit_by_date).format('DD/MM/YYYY')} <br><br>` , 
                  `คลิกเพื่อเข้าหน้าอนุมัติ` , 
                  `${url_now}/project_information/${btoa(project_data.pj_id)}` , 
                  "" 
                )

                resolve()
        
              }else if( project_data.pj_status_css_doc == "รอ BU อนุมัติ Action Plan ครั้งที่ 1" ){
                send_email( 
                  admin_email + " " + sm_email , 
                  admin_email + " " + sm_email , 
                  `อัพเดท : BU อนุมัติแล้ว Action Plan ครั้งที่ 1 ของโครงการ ${project_data.ProjectCode}` , 
                  `เรียน Admin และ SM ของโครงการ ${project_data.ProjectCode} <br><br>
                  ---------------------------- <br><br>
                  Action Plan ครั้งที่ 1 ของโครงการ ${project_data.ProjectCode} ได้รับการอนุมัติจาก BU แล้ว <br><br>
                  คอมเมนต์จาก BU : ${comment_approve} <br><br>
                  ---------------------------- <br><br>
                  Action Plan : ${project_data.pj_action_plan_1} <br><br>
                  จัดทำโดย : ${project_data.pj_action_plan_1_submit_by_name_th} (${project_data.pj_action_plan_1_submit_by_name_en}) <br><br>
                  จัดทำเมื่อ : ${dayjs(project_data.pj_action_plan_1_submit_by_date).format('DD/MM/YYYY')} <br><br>` , 
                  `คลิกเพื่อเข้าหน้าอนุมัติ` , 
                  `${url_now}/project_information/${btoa(project_data.pj_id)}` , 
                  "" 
                )

                resolve()
        
              }else if( project_data.pj_status_css_doc == "รอ ISO อนุมัติ Action Plan ครั้งที่ 1" ){
                send_email( 
                  admin_email + " " + sm_email , 
                  admin_email + " " + sm_email , 
                  `อัพเดท : ISO อนุมัติแล้ว Action Plan ครั้งที่ 1 ของโครงการ ${project_data.ProjectCode}` , 
                  `เรียน Admin และ SM ของโครงการ ${project_data.ProjectCode} <br><br>
                  ---------------------------- <br><br>
                  Action Plan ครั้งที่ 1 ของโครงการ ${project_data.ProjectCode} ได้รับการอนุมัติจาก ISO แล้ว <br><br>
                  คอมเมนต์จาก ISO : ${comment_approve} <br><br>
                  ---------------------------- <br><br>
                  Action Plan : ${project_data.pj_action_plan_1} <br><br>
                  จัดทำโดย : ${project_data.pj_action_plan_1_submit_by_name_th} (${project_data.pj_action_plan_1_submit_by_name_en}) <br><br>
                  จัดทำเมื่อ : ${dayjs(project_data.pj_action_plan_1_submit_by_date).format('DD/MM/YYYY')} <br><br>` , 
                  `คลิกเพื่อเข้าหน้าอนุมัติ` , 
                  `${url_now}/project_information/${btoa(project_data.pj_id)}` , 
                  "" 
                )

                resolve()
                
              }else if( project_data.pj_status_css_doc == "รอ COO อนุมัติ Action Plan ครั้งที่ 1" ){
                send_email( 
                  admin_email + " " + sm_email , 
                  admin_email + " " + sm_email , 
                  `อัพเดท : COO อนุมัติแล้ว Action Plan ครั้งที่ 1 ของโครงการ ${project_data.ProjectCode}` , 
                  `เรียน Admin และ SM ของโครงการ ${project_data.ProjectCode} <br><br>
                  ---------------------------- <br><br>
                  Action Plan ครั้งที่ 1 ของโครงการ ${project_data.ProjectCode} ได้รับการอนุมัติจาก COO แล้ว <br><br>
                  คอมเมนต์จาก COO : ${comment_approve} <br><br>
                  ---------------------------- <br><br>
                  Action Plan : ${project_data.pj_action_plan_1} <br><br>
                  จัดทำโดย : ${project_data.pj_action_plan_1_submit_by_name_th} (${project_data.pj_action_plan_1_submit_by_name_en}) <br><br>
                  จัดทำเมื่อ : ${dayjs(project_data.pj_action_plan_1_submit_by_date).format('DD/MM/YYYY')} <br><br>` , 
                  `คลิกเพื่อเข้าหน้าอนุมัติ` , 
                  `${url_now}/project_information/${btoa(project_data.pj_id)}` , 
                  "" 
                )

                resolve()
    
              }else if( project_data.pj_status_css_doc == "รอ PM อนุมัติ Action Plan ครั้งที่ 2" ){
                send_email( 
                  admin_email + " " + sm_email , 
                  admin_email + " " + sm_email , 
                  `อัพเดท : PM อนุมัติแล้ว Action Plan ครั้งที่ 2 ของโครงการ ${project_data.ProjectCode}` , 
                  `เรียน Admin และ SM ของโครงการ ${project_data.ProjectCode} <br><br>
                  ---------------------------- <br><br>
                  Action Plan ครั้งที่ 2 ของโครงการ ${project_data.ProjectCode} ได้รับการอนุมัติจาก PM แล้ว <br><br>
                  คอมเมนต์จาก PM : ${comment_approve} <br><br>
                  ---------------------------- <br><br>
                  Action Plan : ${project_data.pj_action_plan_2} <br><br>
                  จัดทำโดย : ${project_data.pj_action_plan_2_submit_by_name_th} (${project_data.pj_action_plan_2_submit_by_name_en}) <br><br>
                  จัดทำเมื่อ : ${dayjs(project_data.pj_action_plan_2_submit_by_date).format('DD/MM/YYYY')} <br><br>` , 
                  `คลิกเพื่อเข้าหน้าอนุมัติ` , 
                  `${url_now}/project_information/${btoa(project_data.pj_id)}` , 
                  "" 
                )

                resolve()

              }else if( project_data.pj_status_css_doc == "รอ BU อนุมัติ Action Plan ครั้งที่ 2" ){
                send_email( 
                  admin_email + " " + sm_email , 
                  admin_email + " " + sm_email , 
                  `อัพเดท : BU อนุมัติแล้ว Action Plan ครั้งที่ 2 ของโครงการ ${project_data.ProjectCode}` , 
                  `เรียน Admin และ SM ของโครงการ ${project_data.ProjectCode} <br><br>
                  ---------------------------- <br><br>
                  Action Plan ครั้งที่ 2 ของโครงการ ${project_data.ProjectCode} ได้รับการอนุมัติจาก BU แล้ว <br><br>
                  คอมเมนต์จาก BU : ${comment_approve} <br><br>
                  ---------------------------- <br><br>
                  Action Plan : ${project_data.pj_action_plan_2} <br><br>
                  จัดทำโดย : ${project_data.pj_action_plan_2_submit_by_name_th} (${project_data.pj_action_plan_2_submit_by_name_en}) <br><br>
                  จัดทำเมื่อ : ${dayjs(project_data.pj_action_plan_2_submit_by_date).format('DD/MM/YYYY')} <br><br>` , 
                  `คลิกเพื่อเข้าหน้าอนุมัติ` , 
                  `${url_now}/project_information/${btoa(project_data.pj_id)}` , 
                  "" 
                )

                resolve()

              }else if( project_data.pj_status_css_doc == "รอ ISO อนุมัติ Action Plan ครั้งที่ 2" ){
                send_email( 
                  admin_email + " " + sm_email , 
                  admin_email + " " + sm_email , 
                  `อัพเดท : ISO อนุมัติแล้ว Action Plan ครั้งที่ 2 ของโครงการ ${project_data.ProjectCode}` , 
                  `เรียน Admin และ SM ของโครงการ ${project_data.ProjectCode} <br><br>
                  ---------------------------- <br><br>
                  Action Plan ครั้งที่ 2 ของโครงการ ${project_data.ProjectCode} ได้รับการอนุมัติจาก ISO แล้ว <br><br>
                  คอมเมนต์จาก ISO : ${comment_approve} <br><br>
                  ---------------------------- <br><br>
                  Action Plan : ${project_data.pj_action_plan_2} <br><br>
                  จัดทำโดย : ${project_data.pj_action_plan_2_submit_by_name_th} (${project_data.pj_action_plan_2_submit_by_name_en}) <br><br>
                  จัดทำเมื่อ : ${dayjs(project_data.pj_action_plan_2_submit_by_date).format('DD/MM/YYYY')} <br><br>` , 
                  `คลิกเพื่อเข้าหน้าอนุมัติ` , 
                  `${url_now}/project_information/${btoa(project_data.pj_id)}` , 
                  "" 
                )

                resolve()

              }else if( project_data.pj_status_css_doc == "รอ COO อนุมัติ Action Plan ครั้งที่ 2" ){
                send_email( 
                  admin_email + " " + sm_email , 
                  admin_email + " " + sm_email , 
                  `อัพเดท : COO อนุมัติแล้ว Action Plan ครั้งที่ 2 ของโครงการ ${project_data.ProjectCode}` , 
                  `เรียน Admin และ SM ของโครงการ ${project_data.ProjectCode} <br><br>
                  ---------------------------- <br><br>
                  Action Plan ครั้งที่ 2 ของโครงการ ${project_data.ProjectCode} ได้รับการอนุมัติจาก COO แล้ว <br><br>
                  คอมเมนต์จาก COO : ${comment_approve} <br><br>
                  ---------------------------- <br><br>
                  Action Plan : ${project_data.pj_action_plan_1} <br><br>
                  จัดทำโดย : ${project_data.pj_action_plan_1_submit_by_name_th} (${project_data.pj_action_plan_1_submit_by_name_en}) <br><br>
                  จัดทำเมื่อ : ${dayjs(project_data.pj_action_plan_1_submit_by_date).format('DD/MM/YYYY')} <br><br>` , 
                  `คลิกเพื่อเข้าหน้าอนุมัติ` , 
                  `${url_now}/project_information/${btoa(project_data.pj_id)}` , 
                  "" 
                )

                resolve()
              }else{
                resolve()
              }
            } )
          } )
        });
      }
    } )
  } )
} )

function query_data( sql , value ) {
  return new Promise((resolve, reject) => {
    condb.query( sql , value , async function(err , result){
      if(err){throw reject(err)}
        resolve(result);
    } )
  });
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


router.post( "/action_plan_approve_list_reject" , async function(req , res){

  let array_project_id = (req.body.array_document_id).split(",")
  let comment_reject = (req.body.reject_comment).replace(/[`'"\\]/g, ' ')

  let sql_1 = `SELECT * FROM tb_project_information WHERE tb_project_information.pj_id = ?`

  for( let i = 0 ; i < array_project_id.length ; i++ ){
    let project_data = await query_data(sql_1 , array_project_id[i])
    await update_status_document_reject(project_data[0])
    await send_email_to_admin_and_sm_project(project_data[0])

    if( i == array_project_id.length - 1 ){
      res.end();
    }
  }

  function update_status_document_reject( project_data ){
    return new Promise((resolve, reject) =>{

      let next_status = ""
      let sql_2 = ``

      if( project_data.pj_status_css_doc == "รอ PM อนุมัติ Action Plan ครั้งที่ 1" 
      || project_data.pj_status_css_doc == "รอ BU อนุมัติ Action Plan ครั้งที่ 1" 
      || project_data.pj_status_css_doc == "รอ ISO อนุมัติ Action Plan ครั้งที่ 1" 
      || project_data.pj_status_css_doc == "รอ COO อนุมัติ Action Plan ครั้งที่ 1" ){
        next_status = "ปฏิเสธ Action Plan ครั้งที่ 1"
        sql_2 = `UPDATE tb_project_information SET pj_status_css_doc = ? , pj_action_plan_1_reject_comment = ? , pj_action_plan_1_reject_by = ? , pj_action_plan_1_reject_by_email = ? , pj_action_plan_1_reject_date = ? 
        WHERE tb_project_information.pj_id = ? `
      }else if( project_data.pj_status_css_doc == "รอ PM อนุมัติ Action Plan ครั้งที่ 2" 
      || project_data.pj_status_css_doc == "รอ BU อนุมัติ Action Plan ครั้งที่ 2" 
      || project_data.pj_status_css_doc == "รอ ISO อนุมัติ Action Plan ครั้งที่ 2" 
      || project_data.pj_status_css_doc == "รอ COO อนุมัติ Action Plan ครั้งที่ 2" ){
        next_status = "ปฏิเสธ Action Plan ครั้งที่ 2"
        sql_2 = `UPDATE tb_project_information SET pj_status_css_doc = ? , pj_action_plan_2_reject_comment = ? , pj_action_plan_2_reject_by = ? , pj_action_plan_2_reject_by_email = ? , pj_action_plan_2_reject_date = ? 
        WHERE tb_project_information.pj_id = ?`
      }else{
        next_status = project_data.pj_status_css_doc
        sql_2 = `UPDATE tb_project_information SET pj_status_css_doc = ? , pj_action_plan_1_reject_comment = ? , pj_action_plan_1_reject_by = ? , pj_action_plan_1_reject_by_email = ? , pj_action_plan_1_reject_date = ? 
        WHERE tb_project_information.pj_id = ?`
      }

      let input_2 = [
        next_status , 
        comment_reject , 
        req.cookies.css_user_fullname_th + " (" + req.cookies.css_user_fullname_en + ")" , 
        req.cookies.css_user_email , 
        new Date() , 
        project_data.pj_id
      ]

      condb.query(sql_2 , input_2 , function(err , result){
        if(err){reject(err)}

        resolve()
      } )
    })
  }

  function send_email_to_admin_and_sm_project( project_data ) {
    return new Promise((resolve, reject) => {

      let time_action_plan = "0"

      if( project_data.pj_status_css_doc == "รอ PM อนุมัติ Action Plan ครั้งที่ 1" 
      || project_data.pj_status_css_doc == "รอ BU อนุมัติ Action Plan ครั้งที่ 1" 
      || project_data.pj_status_css_doc == "รอ ISO อนุมัติ Action Plan ครั้งที่ 1" 
      || project_data.pj_status_css_doc == "รอ COO อนุมัติ Action Plan ครั้งที่ 1" ){
        time_action_plan = "1"
      }else if( project_data.pj_status_css_doc == "รอ PM อนุมัติ Action Plan ครั้งที่ 2" 
      || project_data.pj_status_css_doc == "รอ BU อนุมัติ Action Plan ครั้งที่ 2" 
      || project_data.pj_status_css_doc == "รอ ISO อนุมัติ Action Plan ครั้งที่ 2" 
      || project_data.pj_status_css_doc == "รอ COO อนุมัติ Action Plan ครั้งที่ 2" ){
        time_action_plan = "2"
      }else{
        time_action_plan = "0"
      }

      let sql_1 = `SELECT * FROM tb_division_admin WHERE tb_division_admin.da_ref_division_name = ? `
      let sql_2 = `SELECT * FROM tb_site_manager WHERE tb_site_manager.sm_project_id = ? `

      condb.query( sql_1 , project_data.Fulldepartment , function( err , result ){
        if(err){throw err}
        let admin = result

        condb.query( sql_2 , project_data.pj_id , function( err , result ){
          if(err){throw err}
          let sm = result

          let admin_email = ""
          let sm_email = ""

          if( admin.length ==  0){
            admin_email = ""
          }else{
            admin_email = admin.map(item => item.da_admin_email).join('; ');
          }
          
          if( sm.length ==  0){
            sm_email = ""
          }else{
            sm_email = sm.map(item => item.sm_email).join('; ');
          }

          send_email( 
            admin_email + " " + sm_email , 
            admin_email + " " + sm_email , 
            `อัพเดท : ถูกปฏิเสธ Action Plan ครั้งที่ ${time_action_plan} ของโครงการ ${project_data.ProjectCode}` , 
            `เรียน Admin และ SM ของโครงการ ${project_data.ProjectCode} <br><br>
            ---------------------------- <br><br>
            Action Plan ครั้งที่ ${time_action_plan} ของโครงการ ${project_data.ProjectCode} ถูกปฏิเสธ โปรดตรวจสอบ แก้ไข และส่งอนุมัติใหม่ <br><br>
            สาเหตุในการปฏิเสธ : ${comment_reject} <br>
            ปฏิเสธโดย : ${req.cookies.css_user_fullname_th} (${req.cookies.css_user_fullname_en}) <br><br>
            ---------------------------- <br><br>
            Action Plan : ${project_data.pj_action_plan_1} <br><br>
            จัดทำโดย : ${project_data.pj_action_plan_1_submit_by_name_th} (${project_data.pj_action_plan_1_submit_by_name_en}) <br><br>
            จัดทำเมื่อ : ${dayjs(project_data.pj_action_plan_1_submit_by_date).format('DD/MM/YYYY')} <br><br>` , 
            `คลิกเพื่อเข้าหน้าอนุมัติ` , 
            `${url_now}/project_information/${btoa(project_data.pj_id)}` , 
            "" 
          )

          resolve()
        } )
      } )
    });
  }

} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/satasfiction_document_reject" , async function(req , res){

  if( req.cookies.css_user_id == null || req.cookies.css_user_email == null ){
    res.cookie( "css_save_page_url", `` );
    res.redirect( powerapps_link )
  }else{
    
    let array_css_document = (req.body.array_document_id).split(',')
  
    let sql_1 = `SELECT * FROM tb_satisfaction_document WHERE tb_satisfaction_document.sd_id = ?`
    let sql_2 = `UPDATE tb_satisfaction_document SET sd_status = ? , sd_approve_name_th = ? , sd_approve_name_en = ? , sd_approve_email = ? , sd_approve_date = ? , sd_approve_comment = ? 
    WHERE tb_satisfaction_document.sd_id = ?`
  
    for( let i = 0 ; i < array_css_document.length ; i++ ){
  
      await action_function(array_css_document[i])
  
    }
  
    res.end();
  
    function action_function( array_css_document ){
      return new Promise ( ( resolve , reject ) => {
        condb.query( sql_1 , array_css_document , function(err , result){
          if(err){reject(err)}
          let css_doc_data = result
    
          let input_2 = [
            "ถูกปฎิเสธ" , 
            req.cookies.css_user_fullname_th , 
            req.cookies.css_user_fullname_en , 
            req.cookies.css_user_email , 
            new Date() , 
            (req.body.reject_comment).replace(/[`'"\\]/g, ' ') , 
            array_css_document
          ]
    
          condb.query( sql_2 , input_2 , function(err , result){
            if(err){reject(err)}
    
            send_email( 
              css_doc_data[0].sd_create_by_email , 
              css_doc_data[0].sd_create_by_name_en , 
              "อัพเดท : ถูกปฎิเสธการส่งใบประเมินความพึงพอใจ" , 
              `การขออนุมัติส่งเอกสารใบประเมินความพึงพอใจของลูกค้า ถูกปฎิเสธ <br>
              โครงการ : ${css_doc_data[0].sd_project_code} <br> 
              ผู้ประเมิน : ${css_doc_data[0].sd_sent_to_name} <br> 
              ครั้งที่ : ${css_doc_data[0].sd_part} <br><br>
              โดย : ${req.cookies.css_user_fullname_en} <br> 
              วันที่ : ${dayjs(new Date()).format('DD/MM/YYYY')} <br>
              สาเหตุ : ${req.body.reject_comment} <br>` , 
              `เอกสารประเมินความพึงพอใจของลูกค้า` , 
              `${url_now}/project_information/${btoa(css_doc_data[0].sd_project_id)}` , 
              "สามารถกดที่ปุ่มด้านบนนี้ เพื่อเข้าสู่เว็บประเมินความพึงพอใจของลูกค้า" 
            )
  
            resolve();
  
          } )
        } )
      } )
    }
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/satasfiction_document_approve" , function(req , res){

  if( req.cookies.css_user_id == null || req.cookies.css_user_email == null ){
    res.cookie( "css_save_page_url", `` );
    res.redirect( powerapps_link )
  }else{
    
    let sql_1 = `UPDATE tb_satisfaction_document SET sd_status = ? , sd_approve_name_th = ? , sd_approve_name_en = ? , sd_approve_email = ? , sd_approve_date = ? , sd_approve_comment = ? 
    WHERE tb_satisfaction_document.sd_id = ?`
  
    let array_css_document = (req.body.array_document_id).split(',')
  
    for( let i = 0 ; i < array_css_document.length ; i++ ){
      let input_1 = [
        "อนุมัติแล้ว (ยังไม่ได้ประเมิน)" , 
        req.cookies.css_user_fullname_th , 
        req.cookies.css_user_fullname_en , 
        req.cookies.css_user_email , 
        new Date() , 
        (req.body.approve_comment).replace(/[`'"\\]/g, ' ') , 
        array_css_document[i]
      ]
      
      condb.query( sql_1 , input_1 , async function(err , result){
        if(err){throw err}
  
        await send_email_function( array_css_document[i] )
  
        if( i == array_css_document.length - 1 ){
          loop_send_email(array_css_document)
          res.end()
        }
      } )
    }
  
    function send_email_function( array_css_document ){
      return new Promise ( ( resolve , reject ) => {
  
        let sql_2 = `SELECT * FROM tb_satisfaction_document WHERE tb_satisfaction_document.sd_id = ?`
  
        condb.query( sql_2 , array_css_document , function(err , result){
          if(err){reject(err)}
          let css_doc_data = result
    
          send_email( 
            css_doc_data[0].sd_create_by_email , 
            css_doc_data[0].sd_create_by_name_en , 
            "อัพเดท : ได้รับอนุมัติการส่งใบประเมินความพึงพอใจ" , 
            `การขออนุมัติส่งเอกสารใบประเมินความพึงพอใจของลูกค้า ได้รับอนุมัติ <br>
            โครงการ : ${css_doc_data[0].sd_project_code} <br> 
            ผู้ประเมิน : ${css_doc_data[0].sd_sent_to_name} <br> 
            ครั้งที่ : ${css_doc_data[0].sd_part} <br><br>
            โดย : ${req.cookies.css_user_fullname_en} <br> 
            วันที่ : ${dayjs(new Date()).format('DD/MM/YYYY')} <br>
            ความคิดเห็น : ${req.body.approve_comment} <br>` , 
            `เอกสารประเมินความพึงพอใจของลูกค้า` , 
            `${url_now}/project_information/${btoa(css_doc_data[0].sd_project_id)}` , 
            "สามารถกดที่ปุ่มด้านบนนี้ เพื่อเข้าสู่เว็บประเมินความพึงพอใจของลูกค้า" 
          )
  
          resolve();
        } )
      } )
    }
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function loop_send_email(array_css_document){
  for( let i = 0 ; i < array_css_document.length ; i++ ){
    await set_send_email_th( array_css_document[i] )
  }
}

async function set_send_email_th( array_css_document ){
  return new Promise((resolve, reject) => {

    let sql_1 = `SELECT * FROM tb_satisfaction_document WHERE tb_satisfaction_document.sd_id = ?`
    let sql_2 = `SELECT * FROM tb_project_information WHERE tb_project_information.pj_id = ?`

    condb.query( sql_1 , array_css_document , async function(err , result){
      if(err){throw err}
      let satisfaction_document = result

      condb.query( sql_2 , satisfaction_document[0].sd_project_id , async function(err , result){
        if(err){throw err}
        let project_data = result

        if( satisfaction_document[0].sd_language_email == "อังกฤษ" ){
          await send_email_en(satisfaction_document[0] , project_data[0])
          resolve();
        }else{
          await send_email_th(satisfaction_document[0] , project_data[0])
          resolve();
        }
      } )
    } )
  })
}

function send_email_th(satisfaction_document , project_data){
  return new Promise((resolve, reject) => {

    const dateObject = new Date(project_data.ContractSignDate);
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDate = dateObject.toLocaleDateString('th-TH', options);

    setTimeout(function(){
      send_email_satisfaction_document( 
        satisfaction_document.sd_sent_to_email , 
        satisfaction_document.sd_sent_to_name , 
        satisfaction_document.sd_sent_to_position , 
        project_data.ContractNo , 
        formattedDate , 
        project_data.ProjectNameEN , 
        `การสํารวจความพึงพอใจลูกค้าโครงการ ${project_data.ProjectNameEN} (ครั้งที่ ${satisfaction_document.sd_part})` , 
        `${url_now}/satisfaction_document/${btoa(satisfaction_document.sd_id)}/${btoa(satisfaction_document.sd_project_id)}/${btoa(satisfaction_document.sd_part)}/${btoa(satisfaction_document.sd_sent_to_email)}` , 
        `นาย${project_data.BU_name_th}` , 
        "รองกรรมการผู้จัดการ - กลุ่มธุรกิจงานระบบ" 
      )
      resolve()
    }, 5000);
  } )
}

function send_email_en(satisfaction_document , project_data){
  return new Promise((resolve, reject) => {

    const dateObject = new Date(project_data.ContractSignDate);
    let months = [
      "January", "February", "March", "April", "May", "June", "July",
      "August", "September", "October", "November", "December"
    ];
    
    setTimeout(function(){
      send_email_satisfaction_document_en( 
        satisfaction_document.sd_sent_to_email , 
        satisfaction_document.sd_sent_to_name , 
        satisfaction_document.sd_sent_to_position , 
        project_data.ContractNo , 
        `${months[dateObject.getMonth()]} ${dateObject.getDate()}, ${dateObject.getFullYear()}` , 
        project_data.ProjectNameEN , 
        `Customer Satisfaction Survey for ${project_data.ProjectNameEN} (Round ${satisfaction_document.sd_part})` , 
        `${url_now}/satisfaction_document/${btoa(satisfaction_document.sd_id)}/${btoa(satisfaction_document.sd_project_id)}/${btoa(satisfaction_document.sd_part)}/${btoa(satisfaction_document.sd_sent_to_email)}` , 
        `${project_data.BU_name}` , 
        "Executive Vice President - Utility Group " 
      )
      resolve()
    }, 5000);
  } )
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/form_upload_action_plan_p1/:part/:project_id/:project_code" , function(req , res){

  let part = req.params.part
  let project_id = req.params.project_id
  let project_code = req.params.project_code
  let timestamp = Date.now()

  let dir = 'public/assets/action_plan_file/' + project_code + "/part_" + part

  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
  }

  let form = new formidable.IncomingForm();

  form.parse( req , function(error , fields , file ){
    if (error) {
      res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
      res.end(String(err));
      return;
    }

    
    let filepath = file.fileupload.filepath
    console.log("filepath")
    console.log(filepath)
    let newpath = 'public/assets/action_plan_file/' + project_code + "/part_" + part + "/";
    let newpath1 = '/assets/action_plan_file/' + project_code + "/part_" + part + "/";
    newpath += timestamp + "-" + file.fileupload.originalFilename;
    newpath1 += timestamp + "-" + file.fileupload.originalFilename;

    fs.copyFile( filepath , newpath , function(err){
      if( err ){
        throw err 
      }else{
        let sql_1 = `INSERT INTO tb_action_plan_file( apf_create_name_th , apf_create_name_en , apf_create_email , apf_create_timestamp , apf_project_id , apf_project_code , apf_part , apf_old_name , apf_new_name , apf_delete_name )
        VALUE( ? , ? , ? , ? , ? , ? , ? , ? , ? , ? )`
        let now = new Date()
        let input_1 = [
          req.cookies.css_user_fullname_th , 
          req.cookies.css_user_fullname_en , 
          req.cookies.css_user_email , 
          timestamp , 
          project_id , 
          project_code , 
          part , 
          file.fileupload.originalFilename , 
          url_now + newpath1 , 
          newpath 
        ]
        condb.query( sql_1 , input_1 , function( err , result ){
          if( err ){ throw err }

          res.redirect( `/project_information/${btoa(project_id)}` )
        } )
      }
    } )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/delete_action_plan_file" , function(req , res){
  let sql_1 = `SELECT * FROM tb_action_plan_file WHERE tb_action_plan_file.apf_id = ?`
  let sql_2 = `DELETE FROM tb_action_plan_file WHERE tb_action_plan_file.apf_id = ?`

  condb.query( sql_1 , req.body.action_plan_file_id , function(err , result){
    if(err){throw err}
    let file_data = result

    if( file_data.length > 0 ){
      try {
        fs.unlinkSync(file_data[0].apf_delete_name);
        condb.query( sql_2 , req.body.action_plan_file_id ,function( err , result ){
          if(err){ throw err }
          res.end();
        } )
      } catch (error) {
        console.log(error);
      }
    }else{
      res.end();
    }
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/satisfaction_document_submit" , function(req , res){
  let sql_1 = `UPDATE tb_satisfaction_document SET sd_do_by_name = ? , sd_do_by_position = ? , sd_do_date = ? , sd_point_1 = ? , sd_point_2 = ? , sd_point_3 = ? , sd_point_4 = ? , sd_point_5 = ? , sd_point_6 = ? , 
  sd_point_7 = ? , sd_point_8 = ? , sd_point_9 = ? , sd_point_10 = ? , sd_point_11 = ? , sd_point_12 = ? , sd_surveyor_comment = ? , sd_status = "ประเมินแล้ว" WHERE tb_satisfaction_document.sd_id = ? `
  let sql_2 = `SELECT * FROM tb_satisfaction_document WHERE tb_satisfaction_document.sd_id = ?`
  let sql_3 = `SELECT * FROM tb_project_information WHERE tb_project_information.pj_id = ?`

  let input_1 = [
    req.body.surveyor_name , 
    req.body.surveyor_position , 
    new Date() , 
    req.body.point_1 , 
    req.body.point_2 , 
    req.body.point_3 , 
    req.body.point_4 , 
    req.body.point_5 , 
    req.body.point_6 , 
    req.body.point_7 , 
    req.body.point_8 , 
    req.body.point_9 , 
    req.body.point_10 , 
    req.body.point_11 , 
    req.body.point_12 , 
    (req.body.surveyor_comment).replace(/[`'"\\]/g, ' ') , 
    req.body.doc_id
  ]

  condb.query( sql_1 , input_1 , function(err , result){
    if(err){throw err}

    condb.query( sql_2 , req.body.doc_id , async function(err , result){
      if(err){throw err}
      let css_document = result

      let email_responsible_project = await concat_email_responsible_project( css_document[0].sd_project_id )
      let summary_point = ( +req.body.point_1 ) + ( +req.body.point_2 ) + ( +req.body.point_3 ) + ( +req.body.point_4 ) + ( +req.body.point_5 ) + ( +req.body.point_6 ) + ( +req.body.point_7 ) + ( +req.body.point_8 ) + ( +req.body.point_9 ) + ( +req.body.point_10 ) + ( +req.body.point_11 ) + ( +req.body.point_12 )
      let summary_point_avg = Math.round((summary_point * 100)/(1 * 120))

      send_email( 
        email_responsible_project , 
        `เรียน Admin , PM , SM และ BU ของโครงการ ${css_document[0].sd_project_code}` , 
        "ผลการประเมิน : ลูกค้าส่งกลับผลการประเมินความพึงพอใจ" , 
        `เรียน Admin , PM , SM และ BU ของโครงการ ${css_document[0].sd_project_code} <br><br> 
        ลูกค้าตอบแบบสอบถามความประเมินความพึงพอใจเรียบร้อยแล้ว <br>
        โครงการ : ${css_document[0].sd_project_code} <br> 
        ครั้งที่ : ${css_document[0].sd_part} <br><br>
        ผู้ประเมิน (ชื่อ) : ${css_document[0].sd_do_by_name} <br> 
        ตำแหน่ง : ${css_document[0].sd_do_by_position} <br> 
        บริษัท : ${css_document[0].sd_sent_to_company} <br> 
        คะแนนที่ได้ (%) : ${summary_point_avg} % <br> 
        ความคิดเห็นจากลูกค้า : ${css_document[0].sd_surveyor_comment} <br>
        วันที่ : ${dayjs(css_document[0].sd_do_date).format('DD/MM/YYYY')} <br>` , 
        `เอกสารประเมินความพึงพอใจของลูกค้า` , 
        `${url_now}/project_information/${btoa(css_document[0].sd_project_id)}` , 
        "สามารถกดที่ปุ่มด้านบนนี้ เพื่อเข้าสู่เว็บโครงการที่ระบุ" 
      )

      res.end()
    } )
  } )
} )

function concat_email_responsible_project( project_id ){
  return new Promise( (resolve , reject) => {
    
    let sql_1 = `SELECT * FROM tb_division_admin WHERE tb_division_admin.da_ref_division_name = ?`
    let sql_2 = `SELECT * FROM tb_site_manager WHERE tb_site_manager.sm_project_id = ?`
    let sql_3 = `SELECT * FROM tb_project_information WHERE tb_project_information.pj_id = ?`

    let admin_email = ""
    let sm_email = ""

    condb.query( sql_3 , project_id , async function(err , result){
      if(err){throw err}
      let project_data = result

      condb.query( sql_1 , project_data[0].Fulldepartment , function(err , result){
        if(err){throw err}
        let admin_array = result
  
        if(admin_array.length == 0){
          admin_email = ""
        }else{
          admin_email = admin_array.map(item => item.da_admin_email).join('; ')
        }
  
        condb.query( sql_2 , project_id , function(err , result){
          if(err){throw err}
          let sitemanager_array = result
  
          if(sitemanager_array.length == 0){
            sm_email = ""
          }else{
            sm_email = sitemanager_array.map(item => item.sm_email).join('; ')
          }

          let email_responsible_project = `${project_data[0].PMEmail}; ${project_data[0].BUEmail}; ${admin_email} ${sm_email}`
          resolve(email_responsible_project)

        } )
      } )
    } )
  } )
} 

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/project_information/:project_id_code" , async function(req , res){

  if( req.cookies.css_user_id == null || req.cookies.css_user_email == null ){

    res.cookie( "css_save_page_url", `/project_information/${req.params.project_id_code}` );
    res.redirect( powerapps_link )

  }else{
    
    try {
      let employee_ite_data = await axios.get(url_api_employee_ite);
      console.log(employee_ite_data);
  
      let project_id = atob(req.params.project_id_code)
      let sql_1 = `SELECT * FROM tb_project_information WHERE tb_project_information.pj_id = ? ORDER BY tb_project_information.pj_id DESC;`
      let sql_2 = `SELECT * FROM tb_satisfaction_document WHERE tb_satisfaction_document.sd_project_id = ? AND tb_satisfaction_document.sd_status <> "สร้าง" AND tb_satisfaction_document.sd_part = "1" 
      ORDER BY tb_satisfaction_document.sd_id DESC;`
      let sql_3 = `SELECT * FROM tb_contact WHERE tb_contact.MasterID = ?`
      let sql_4 = `SELECT * FROM tb_consult WHERE tb_consult.MasterID = ?`
      let sql_5 = `SELECT * FROM tb_division_admin WHERE tb_division_admin.da_ref_division_name = ?`
      let sql_6 = `SELECT * FROM tb_site_manager WHERE tb_site_manager.sm_project_id = ?`
      let sql_7 = `SELECT * FROM tb_action_plan_file WHERE tb_action_plan_file.apf_project_id = ? AND tb_action_plan_file.apf_part = "1" ORDER BY tb_action_plan_file.apf_id DESC`
      let sql_8 = `SELECT * FROM tb_action_plan_file WHERE tb_action_plan_file.apf_project_id = ? AND tb_action_plan_file.apf_part = "2" ORDER BY tb_action_plan_file.apf_id DESC`
      let sql_9 = `SELECT * FROM tb_satisfaction_document WHERE tb_satisfaction_document.sd_project_id = ? AND tb_satisfaction_document.sd_status <> "สร้าง" AND tb_satisfaction_document.sd_part = "2" 
      ORDER BY tb_satisfaction_document.sd_id DESC;`
  
      condb.query( sql_1 , project_id , function(err , result){
        if(err){throw err}
        let project_information = result
        console.log("project_information")
        console.log(project_information)
  
        condb.query( sql_2 , project_id , function(err , result){
          if(err){throw err}
          let satisfaction_document_p1_data = result
  
          condb.query( sql_3 ,  project_id , function(err , result){
            if(err){throw err}
            let contact_data = result
  
            condb.query( sql_4 ,  project_id , function(err , result){
              if(err){throw err}
              let consult_data = result
  
              condb.query( sql_5 ,  project_information[0].Fulldepartment , function(err , result){
                if(err){throw err}
                let admin_site_data = result
  
                condb.query( sql_6 ,  project_id , function(err , result){
                  if(err){throw err}
                  let manager_site_data = result

                  condb.query( sql_7 , project_id , function(err , result){
                    if(err){throw err}
                    let action_plan_file_p1 = result
            
                    condb.query( sql_8 , project_id , async function(err , result){
                      if(err){throw err}
                      let action_plan_file_p2 = result

                      let user_ability = await set_user_ability( admin_site_data , manager_site_data , project_information )
                      console.log("user_ability")
                      console.log(user_ability)

                      condb.query( sql_9 , project_id , function(err , result){
                        if(err){throw err}
                        let satisfaction_document_p2_data = result 

                        res.render( "project_information" , { user_ability : user_ability , satisfaction_document_p2_data : satisfaction_document_p2_data , action_plan_file_p1 : action_plan_file_p1 , action_plan_file_p2 : action_plan_file_p2 , manager_site_data : manager_site_data , admin_site_data : admin_site_data , employee_ite_data : employee_ite_data.data , user_data : req.cookies , contact_data : contact_data , consult_data : consult_data , satisfaction_document_p1_data : satisfaction_document_p1_data , project_information : project_information , dayjs : dayjs } )
                      } )
                    } )
                  } )
                } )
              } )
            } )
          } )
        } )
      } )
    } catch (error) {
      console.error(error);
    }

    function set_user_ability( admin , site_manager , project_info ){
      return new Promise ( (resolve, reject) => {

        let user_ability = {
          admin : false , 
          sm : false , 
          pm : false , 
          bu : false , 
          iso : false , 
          coo : false , 
          master_admin : false
        }

        admin_row = admin.filter( function(e){
          return  e.da_admin_email == req.cookies.css_user_email 
        } )

        if( admin_row.length == 0 ){
          user_ability.admin = false
        }else{
          user_ability.admin = true
        }

        sm_row = site_manager.filter( function(e){
          return  e.sm_email == req.cookies.css_user_email 
        } )

        if( sm_row.length == 0 ){
          user_ability.sm = false
        }else{
          user_ability.sm = true
        }

        if( project_info[0].PMEmail == req.cookies.css_user_email ){
          user_ability.pm = true
        }else{
          user_ability.pm = false
        }

        if( project_info[0].BUEmail == req.cookies.css_user_email ){
          user_ability.bu = true
        }else{
          user_ability.bu = false
        }

        if( req.cookies.css_user_row == "master admin" ){
          user_ability.master_admin = true
        }else{
          user_ability.master_admin = false
        }

        let sql_1 = `SELECT * FROM tb_user_iso WHERE tb_user_iso.iso_email = ?`
        let sql_2 = `SELECT * FROM tb_user_coo WHERE tb_user_coo.coo_email = ?`

        condb.query( sql_1 , req.cookies.css_user_email , function(err , result){
          if(err){throw err}

          if( result.length == 0 ){
            user_ability.iso = false
          }else{
            user_ability.iso = true
          }

          condb.query( sql_2 , req.cookies.css_user_email , function(err , result){
            if(err){throw err}
  
            if( result.length == 0 ){
              user_ability.coo = false
            }else{
              user_ability.coo = true
            }
  
            resolve(user_ability)
          } )
        } )
      } )
    }
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/close_css_doc_p1" , function( req , res ){

  let sql_1 = `UPDATE tb_satisfaction_document SET sd_status = "ปิดการประเมิน" WHERE tb_satisfaction_document.sd_project_id = ? AND tb_satisfaction_document.sd_part = ? AND (tb_satisfaction_document.sd_status = "รอ Head BU อนุมัติ" OR tb_satisfaction_document.sd_status = "อนุมัติแล้ว (ยังไม่ได้ประเมิน)")`
  let sql_2 = ``
  let sql_3 = `SELECT * FROM tb_project_information WHERE tb_project_information.pj_id = ?`
  let sql_4 = `SELECT * FROM tb_site_manager WHERE tb_site_manager.sm_project_id = ?`

  if( req.body.part == "1" ){
    sql_2 = `UPDATE tb_project_information SET pj_status_css_doc = "สรุปผลการประเมินครั้งที่ ${req.body.part}" , pj_close_css_1 = ? WHERE tb_project_information.pj_id = ?`
  }else{
    sql_2 = `UPDATE tb_project_information SET pj_status_css_doc = "สรุปผลการประเมินครั้งที่ ${req.body.part}" , pj_close_css_2 = ? WHERE tb_project_information.pj_id = ?`
  }

  condb.query( sql_1 , [req.body.project_id , req.body.part] , function(err , result){
    if(err){throw err}

    condb.query( sql_2 , [ new Date() , req.body.project_id ] , function(err , result){
      if(err){throw err}

      condb.query( sql_3 , req.body.project_id , function(err , result){
        if(err){throw err} 
        let project_data = result
        
        condb.query( sql_4 , req.body.project_id , function(err , result){
          if(err){throw err} 
          let site_manager_data = result

          if( site_manager_data.length == 0 ){

          }else{
            send_email( 
              site_manager_data.map(item => item.sm_email).join('; ') , 
              `เรียน SM ของโครงการ ${project_data[0].ProjectCode}` , 
              `วิเคราะห์ผลการประเมินความพึงพอใจลูกค้าโครงการ (${project_data[0].ProjectCode})` , 
              `เรียน SM ${project_data[0].ProjectCode} <br><br> 
              โปรดพิจารณาผลการประเมินความพึงพอใจของลูกค้าของโครงการ ${project_data[0].ProjectCode}<br>` , 
              `เอกสารประเมินความพึงพอใจของลูกค้า` , 
              `${url_now}/project_information/${btoa(project_data[0].pj_id)}` , 
              "สามารถกดที่ปุ่มด้านบนนี้ เพื่อเข้าสู่เว็บโครงการที่ระบุ" 
            )
          }

          res.end();
        } )
      } )
    } )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/project_information_change_bu" , async function(req , res){

  if( req.cookies.css_user_id == null || req.cookies.css_user_email == null ){
    res.cookie( "css_save_page_url", `` );
    res.redirect( powerapps_link )
  }else{
    try {
      let employee_ite_data = await axios.get(url_api_employee_ite);
      console.log(employee_ite_data);
  
      let employee_selected = (employee_ite_data.data).filter( function(e){
        return  e.ed_id == req.body.emp_id_bu
      } )
  
      console.log("employee_selected")
      console.log(employee_selected)
      
      if( employee_selected.length == 0 ){
        res.end()
      }else{
        let sql_1 = `UPDATE tb_project_information SET BU_us_id = ? , BU_emp_id = ? , BU_name = ? , BUEmail = ? , BU_division = ? WHERE tb_project_information.pj_id = ? `
        let input_1 = [
          employee_selected[0].ed_id , 
          employee_selected[0].ed_employee_id , 
          employee_selected[0].ed_name_en + " " + employee_selected[0].ed_surname_en , 
          employee_selected[0].ed_email_ite , 
          employee_selected[0].ed_division_id , 
          req.body.project_id
        ]
  
        condb.query( sql_1 , input_1 , function(err , result){
          if(err){throw err}
  
          res.end();
        } )
      }
      
    } catch (error) {
      console.error(error);
    }
  }
  
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/project_information_change_pm" , async function(req , res){
  if( req.cookies.css_user_id == null || req.cookies.css_user_email == null ){
    res.cookie( "css_save_page_url", `` );
    res.redirect( powerapps_link )
  }else{
    
    try {
      let employee_ite_data = await axios.get(url_api_employee_ite);
      console.log(employee_ite_data);
  
      let employee_selected = (employee_ite_data.data).filter( function(e){
        return  e.ed_id == req.body.emp_id_pm
      } )
  
      console.log("employee_selected")
      console.log(employee_selected)
      
      if( employee_selected.length == 0 ){
        res.end()
      }else{
        let sql_1 = `UPDATE tb_project_information SET PM_us_id = ? , PM_emp_id = ? , PMName = ? , PMEmail = ? , PM_division = ? WHERE tb_project_information.pj_id = ? `
        let input_1 = [
          employee_selected[0].ed_id , 
          employee_selected[0].ed_employee_id , 
          employee_selected[0].ed_name_en + " " + employee_selected[0].ed_surname_en , 
          employee_selected[0].ed_email_ite , 
          employee_selected[0].ed_division_id , 
          req.body.project_id
        ]
  
        condb.query( sql_1 , input_1 , function(err , result){
          if(err){throw err}
  
          res.end();
        } )
      }
      
    } catch (error) {
      console.error(error);
    }
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/action_plan_p1_save" , function(req , res){
  let sql_1 = `UPDATE tb_project_information SET pj_action_plan_1 = ? , pj_action_plan_1_submit_by_name_th = ? , pj_action_plan_1_submit_by_name_en = ? , pj_action_plan_1_submit_by_email = ? , 
  pj_action_plan_1_submit_by_date = ? , pj_action_plan_1_status = ? WHERE tb_project_information.pj_id = ? `

  let input_1 = [
    (req.body.textArea_action_plan_p1).replace(/[`'"\\]/g, ' ') , 
    req.cookies.css_user_fullname_th , 
    req.cookies.css_user_fullname_en , 
    req.cookies.css_user_email , 
    new Date() , 
    "save" , 
    req.body.project_id
  ]

  condb.query( sql_1 , input_1 , function(err , result){
    if(err){throw err}

    res.end();
  } )

} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/action_plan_p2_save" , function(req , res){
  let sql_1 = `UPDATE tb_project_information SET pj_action_plan_2 = ? , pj_action_plan_2_submit_by_name_th = ? , pj_action_plan_2_submit_by_name_en = ? , pj_action_plan_2_submit_by_email = ? , 
  pj_action_plan_2_submit_by_date = ? , pj_action_plan_2_status = ? WHERE tb_project_information.pj_id = ? `

  let input_1 = [
    (req.body.textArea_action_plan_p2).replace(/[`'"\\]/g, ' ') , 
    req.cookies.css_user_fullname_th , 
    req.cookies.css_user_fullname_en , 
    req.cookies.css_user_email , 
    new Date() , 
    "save" , 
    req.body.project_id
  ]

  condb.query( sql_1 , input_1 , function(err , result){
    if(err){throw err}

    res.end();
  } )

} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/submit_action_plan_p1" , function(req , res){
  let sql_1 = `SELECT * FROM tb_project_information WHERE tb_project_information.pj_id = ?`
  let sql_2 = ``
  let next_status = ""
  let input_2 = []
  let next_approve_name = ""
  let next_approve_email = ""

  condb.query( sql_1 , req.body.project_id , function(err , result){
    if(err){throw err}
    let project_data = result

    if( project_data[0].PMEmail == req.cookies.css_user_email ){
      next_status = "รอ BU อนุมัติ Action Plan ครั้งที่ 1"
      sql_2 = `UPDATE tb_project_information SET pj_status_css_doc = ? , pj_action_plan_1_status = "submit" , pj_action_plan_1_pm_approve_date = ? , pj_action_plan_1_pm_approve_remark = "PM เป็นผู้ส่งอนุมัติ" WHERE tb_project_information.pj_id = ?`
      input_2 = [
        next_status , 
        new Date() ,
        req.body.project_id
      ]
      next_approve_email = project_data[0].BUEmail
      next_approve_name = project_data[0].BU_name
    }else{
      next_status = "รอ PM อนุมัติ Action Plan ครั้งที่ 1"
      sql_2 = `UPDATE tb_project_information SET pj_status_css_doc = ? , pj_action_plan_1_status = "submit" WHERE tb_project_information.pj_id = ?`
      input_2 = [
        next_status , 
        req.body.project_id
      ]
      next_approve_email = project_data[0].PMEmail
      next_approve_name = project_data[0].PMName
    }

    condb.query( sql_2 , input_2 , function(err , result){ 
      if(err){throw err}

      send_email( 
        next_approve_email , 
        next_approve_name , 
        `ต้องอนุมัติ : Action Plan ครั้งที่ 1 ของโครงการ ${project_data[0].ProjectCode}` , 
        `เรียน ${next_approve_name} <br><br><br>
        Action Plan ครั้งที่ 1 ของโครงการ ${project_data[0].ProjectCode} ได้รับการสรุปผลการประเมินความพึงพอใจของลูกค้าแล้ว และได้ทำ Action Plan แล้วดังนี้ <br><br>
        Action Plan : ${project_data[0].pj_action_plan_1} <br><br>
        จัดทำโดย : ${project_data[0].pj_action_plan_1_submit_by_name_th} (${project_data[0].pj_action_plan_1_submit_by_name_en}) <br><br>
        จัดทำเมื่อ : ${dayjs(project_data[0].pj_action_plan_1_submit_by_date).format('DD/MM/YYYY')} <br><br>` , 
        `คลิกเพื่อเข้าหน้าอนุมัติ` , 
        `${url_now}/project_information/${btoa(project_data[0].pj_id)}` , 
        "" 
      )

      res.end();
    } )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/submit_action_plan_p2" , function(req , res){
  let sql_1 = `SELECT * FROM tb_project_information WHERE tb_project_information.pj_id = ?`
  let sql_2 = ``
  let next_status = ""
  let input_2 = []
  let next_approve_name = ""
  let next_approve_email = ""

  condb.query( sql_1 , req.body.project_id , function(err , result){
    if(err){throw err}
    let project_data = result

    if( project_data[0].PMEmail == req.cookies.css_user_email ){
      next_status = "รอ BU อนุมัติ Action Plan ครั้งที่ 2"
      sql_2 = `UPDATE tb_project_information SET pj_status_css_doc = ? , pj_action_plan_2_status = "submit" , pj_action_plan_2_pm_approve_date = ? , pj_action_plan_2_pm_approve_remark = "PM เป็นผู้ส่งอนุมัติ" WHERE tb_project_information.pj_id = ?`
      input_2 = [
        next_status , 
        new Date() ,
        req.body.project_id
      ]
      next_approve_email = project_data[0].BUEmail
      next_approve_name = project_data[0].BU_name
    }else{
      next_status = "รอ PM อนุมัติ Action Plan ครั้งที่ 2"
      sql_2 = `UPDATE tb_project_information SET pj_status_css_doc = ? , pj_action_plan_2_status = "submit" WHERE tb_project_information.pj_id = ?`
      input_2 = [
        next_status , 
        req.body.project_id
      ]
      next_approve_email = project_data[0].PMEmail
      next_approve_name = project_data[0].PMName
    }

    condb.query( sql_2 , input_2 , function(err , result){ 
      if(err){throw err}

      send_email( 
        next_approve_email , 
        next_approve_name , 
        `ต้องอนุมัติ : Action Plan ครั้งที่ 2 ของโครงการ ${project_data[0].ProjectCode}` , 
        `เรียน ${next_approve_name} <br><br><br>
        Action Plan ครั้งที่ 2 ของโครงการ ${project_data[0].ProjectCode} ได้รับการสรุปผลการประเมินความพึงพอใจของลูกค้าแล้ว และได้ทำ Action Plan แล้วดังนี้ <br><br>
        Action Plan : ${project_data[0].pj_action_plan_2} <br><br>
        จัดทำโดย : ${project_data[0].pj_action_plan_2_submit_by_name_th} (${project_data[0].pj_action_plan_2_submit_by_name_en}) <br><br>
        จัดทำเมื่อ : ${dayjs(project_data[0].pj_action_plan_2_submit_by_date).format('DD/MM/YYYY')} <br><br>` , 
        `คลิกเพื่อเข้าหน้าอนุมัติ` , 
        `${url_now}/project_information/${btoa(project_data[0].pj_id)}` , 
        "" 
      )

      res.end();
    } )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/confirm_dont_have_css_p2" , function( req , res ){
  let sql_1 = `UPDATE tb_project_information SET pj_status_css_doc = "สำเร็จ (ประเมิน 1 ครั้ง)" WHERE tb_project_information.pj_id = ?`

  condb.query( sql_1 , req.body.project_id , function(err , result){
    if(err){throw err}

    res.end();
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/confirm_have_css_p2" , function( req , res ){
  let sql_1 = `UPDATE tb_project_information SET pj_status_css_doc = "ประเมินและทำ Action Plan ครั้งที่ 1 สำเร็จแล้ว" WHERE tb_project_information.pj_id = ?`

  condb.query( sql_1 , req.body.project_id , function(err , result){
    if(err){throw err}

    res.end();
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/admin_system_control_sm_admin" , async function( req , res ){

  if( req.cookies.css_user_id == null || req.cookies.css_user_email == null ){
    res.cookie( "css_save_page_url", `/admin_system_control_sm_admin` );
    res.redirect( powerapps_link )
  }else{

    req.session.css_now_page = "admin"

    // let sql_1 = `SELECT * FROM tb_project_code_control WHERE tb_project_code_control.RequestStatus = "New" AND tb_project_code_control.Status = "Completed" ORDER BY tb_project_code_control.ID DESC`
    let sql_1 = `SELECT * FROM tb_project_information ORDER BY tb_project_information.pj_id DESC`
    let sql_2 = `SELECT * FROM tb_site_manager ORDER BY tb_site_manager.sm_id DESC`
    let sql_4 = `SELECT * FROM tb_site_admin ORDER BY tb_site_admin.sa_id DESC`
    let sql_5 = `SELECT pj_id , ProjectCode FROM tb_project_information ORDER BY tb_project_information.pj_id DESC`
  
    try {
      let employee_ite_data = await axios.get(url_api_employee_ite);
      console.log(employee_ite_data);
  
      condb.query( sql_1 , function(err , result){
        if(err){throw err}
        let project_code = result
    
        condb.query( sql_2 , function(err , result){
          if(err){throw err}
          let site_manager = result
          let employee_data = employee_ite_data.data
  
          condb.query( sql_4 , function(err , result){
            if(err){throw err}
            let site_admin = result

            condb.query( sql_5 , function(err , result){
              if(err){throw err}
              let project_data_for_trasfer = result

              res.render( "admin_system_control_sm_admin" , { user_data : req.cookies , project_data_for_trasfer : project_data_for_trasfer , site_admin : site_admin , employee_data : employee_data , project_code : project_code , site_manager : site_manager , dayjs : dayjs } )
            } )

          } )
        } )
      } )
  
    }catch (error) {
      console.log(error)
    }
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/add_sm" , function(req , res){

  if( req.cookies.css_user_id == null || req.cookies.css_user_email == null ){
    res.cookie( "css_save_page_url", `` );
    res.redirect( powerapps_link )
  }else{
    
    let sql_1 = `DELETE FROM tb_site_manager WHERE tb_site_manager.sm_project_id = ? AND tb_site_manager.sm_email = ?`
    let sql_2 = `INSERT INTO tb_site_manager (sm_create_by_id , sm_create_by_name_th , sm_create_by_name_en , sm_create_by_email , sm_project_id , sm_project_code , sm_employee_id , sm_employee_code , sm_name_th , sm_name_en , sm_email , sm_division )
    VALUE ( ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? )`
  
    condb.query( sql_1 , [req.body.project_id , req.body.email] , function(err , result){
      if(err){throw err}
  
      condb.query( sql_2 , 
        [
          req.cookies.css_user_id , 
          req.cookies.css_user_fullname_th , 
          req.cookies.css_user_fullname_en , 
          req.cookies.css_user_email , 
          req.body.project_id , 
          req.body.project_code , 
          req.body.employee_id , 
          req.body.employee_code , 
          req.body.name_th , 
          req.body.name_en , 
          req.body.email ,
          req.body.division 
        ] , function(err , result){
        if(err){throw err}
    
          res.end();
      } )
    } )
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/add_new_contact" , function(req , res){
  let sql_1 = `DELETE FROM tb_contact WHERE tb_contact.Payer_Email = ? AND tb_contact.MasterID = ?`
  let sql_2 = `INSERT INTO tb_contact (MasterID , Payer_Contactname , Payer_Position , Payer_Phno , Payer_Email) VALUE ( ? , ? , ? , ? , ?)`

  condb.query( sql_1 , [ req.body.new_contact_email , req.body.project_id ] , function(err , result){
    if(err){throw err}

    condb.query( sql_2 , [ req.body.project_id , req.body.new_contact_name , req.body.new_contact_position , req.body.new_contact_phone_number , req.body.new_contact_email ] , function(err , result){
      if(err){throw err}
  
      res.end();
    } )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/create_css_document_part_1" , function(req , res){

  if( req.cookies.css_user_id == null || req.cookies.css_user_email == null ){
    res.cookie( "css_save_page_url", `` );
    res.redirect( powerapps_link )
  }else{
    let sql_1 = `INSERT INTO tb_satisfaction_document 
    ( sd_create_by_id , sd_create_by_name_th , sd_create_by_name_en , sd_create_by_email , sd_create_date , sd_create_timestamp , sd_project_id , sd_project_code , sd_part , sd_status ) 
    VALUE ( ? , ? , ? , ? , ? , ? , ? , ? , ? , "สร้าง" )`
    let sql_2 = `SELECT * FROM tb_contact WHERE tb_contact.MasterID = ?`
    let sql_3 = `INSERT INTO tb_satisfaction_document 
    ( sd_create_by_id , sd_create_by_name_th , sd_create_by_name_en , sd_create_by_email , sd_create_date , sd_create_timestamp , sd_project_id , sd_project_code , sd_part , sd_status , sd_sent_to_name , sd_sent_to_email , sd_sent_to_position , sd_sent_to_company ) 
    VALUE ( ? , ? , ? , ? , ? , ? , ? , ? , ? , "สร้าง" , ? , ? , ? , ? )`
    let sql_4 = `SELECT * FROM tb_project_information WHERE tb_project_information.pj_id = ?`
    let sql_5 = `SELECT * FROM tb_satisfaction_document WHERE tb_satisfaction_document.sd_part = ? AND tb_satisfaction_document.sd_project_id = ? AND tb_satisfaction_document.sd_sent_to_email = ? AND tb_satisfaction_document.sd_status <> "สร้าง"`

    let timestamp = Date.now()
    let date = new Date()
    let input_1 = [
      req.cookies.css_user_id , 
      req.cookies.css_user_fullname_th , 
      req.cookies.css_user_fullname_en , 
      req.cookies.css_user_email , 
      date , 
      timestamp , 
      req.body.project_id , 
      req.body.project_code , 
      req.body.part
    ]

    condb.query( sql_2 , req.body.project_id , function(err , result){
      if(err){throw err}
      let contact_array = result

      if( contact_array.length == 0 ){
        condb.query( sql_1 , input_1 , function(err , result){
          if(err){throw err}
      
          res.contentType('application/json');
          let nextPage = JSON.stringify(`/satisfaction_document_create/${btoa(timestamp)}/${btoa(req.body.project_id)}/${btoa(req.body.part)}`)
          res.header('Content-Length', nextPage.length);
          res.end(nextPage);
        } )
      }else{
        condb.query( sql_4 , req.body.project_id , async function(err , result){
          if(err){throw err}

          await insert_contact(contact_array , result[0].OwnerNameTH);

          condb.query( sql_1 , input_1 , function(err , result){
            if(err){throw err}
        
            res.contentType('application/json');
            let nextPage = JSON.stringify(`/satisfaction_document_create/${btoa(timestamp)}/${btoa(req.body.project_id)}/${btoa(req.body.part)}`)
            res.header('Content-Length', nextPage.length);
            res.end(nextPage);
          } )
        } )
      }
    } )

    function insert_contact(contact_array , owner_name_th ){
      return new Promise((resolve, reject) => {
        for(let i = 0 ; i < contact_array.length ; i++){
          let input_3 = [
            req.cookies.css_user_id , 
            req.cookies.css_user_fullname_th , 
            req.cookies.css_user_fullname_en , 
            req.cookies.css_user_email , 
            date , 
            timestamp , 
            req.body.project_id , 
            req.body.project_code , 
            req.body.part , 
            contact_array[i].Payer_Contactname , 
            contact_array[i].Payer_Email , 
            contact_array[i].Payer_Position , 
            owner_name_th
          ]

          condb.query( sql_5 , [req.body.part , req.body.project_id , contact_array[i].Payer_Email] , function(err , result){
            if(err){ reject(err) }

            if( result.length == 0 ){
              condb.query( sql_3 , input_3 , function(err , result){
                if(err){ reject(err) }
                if( i == contact_array.length - 1 ){
                  resolve()
                }
              } )
            }else{
              if( i == contact_array.length - 1 ){
                resolve()
              }
            }
          } )
        }
      })
    }
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/satisfaction_document_create/:timestamp_code/:project_id_code/:part_code" , async function(req , res){

  if( req.cookies.css_user_id == null || req.cookies.css_user_email == null ){
    res.cookie( "css_save_page_url", `/satisfaction_document_create/${req.params.timestamp_code}/${req.params.project_id_code}/${req.params.part_code}` );
    res.redirect( powerapps_link )
  }else{
    
    let timestamp = atob(req.params.timestamp_code)
    let project_id = atob(req.params.project_id_code)
    let part = atob(req.params.part_code)
  
    let sql_1 = `SELECT * FROM tb_satisfaction_document 
    WHERE tb_satisfaction_document.sd_create_timestamp = ? AND tb_satisfaction_document.sd_project_id = ? AND tb_satisfaction_document.sd_part = ? AND tb_satisfaction_document.sd_create_by_email = ?
    ORDER BY tb_satisfaction_document.sd_id DESC`
    let sql_2 = `SELECT * FROM tb_project_information WHERE tb_project_information.pj_id = ?`
    let sql_3 = `SELECT * FROM tb_consult WHERE tb_consult.MasterID = ?`
    let sql_4 = `SELECT * FROM tb_contact WHERE tb_contact.MasterID = ?`
    let sql_5 = `SELECT sd_sent_to_email FROM tb_satisfaction_document 
    WHERE tb_satisfaction_document.sd_project_id = ? AND tb_satisfaction_document.sd_part = ? AND tb_satisfaction_document.sd_status <> "สร้าง" AND tb_satisfaction_document.sd_status <> "ถูกปฎิเสธ"`
  
    let consult_data = await query_data(sql_3 , project_id)
    let contact_data = await query_data(sql_4 , project_id)
    let join_consult_contact_name_data = await join_consult_contact_name(consult_data , contact_data)
    let join_consult_contact_email_data = await join_consult_contact_email(consult_data , contact_data)
    let join_consult_contact_position_data = await join_consult_contact_position(consult_data , contact_data)
    let join_consult_contact_company_data = await join_consult_contact_company(consult_data , contact_data)
  
    let join_consult_contact_data = await join_consult_contact(consult_data , contact_data)
  
    console.log("join_consult_contact_data")
    console.log(join_consult_contact_data)
  
    condb.query( sql_1 , [timestamp , project_id , part , req.cookies.css_user_email] , function(err , result){
      if(err){throw err}
      let satisfaction_document_create = result
  
      condb.query( sql_2 , project_id , function(err , result){
        if(err){throw err}
        let project_data = result

        condb.query( sql_5 , [project_id , part] , function(err , result){
          if(err){throw err}
          let old_css_doc_on_process = result
          console.log("old_css_doc_on_process")
          console.log(old_css_doc_on_process)

          res.render( "satisfaction_document_create" , 
          { 
            user_data : req.cookies , 
            satisfaction_document_create : satisfaction_document_create , 
            project_data : project_data , 
            join_consult_contact_name_data : join_consult_contact_name_data ,
            join_consult_contact_email_data : join_consult_contact_email_data ,
            join_consult_contact_position_data : join_consult_contact_position_data , 
            join_consult_contact_company_data : join_consult_contact_company_data , 
            join_consult_contact_data : join_consult_contact_data , 
            old_css_doc_on_process : old_css_doc_on_process
          } )
        } )
      } )
    } )
  
    function query_data( sql , value ) {
      return new Promise((resolve, reject) => {
        condb.query( sql , value , async function(err , result){
          if(err){throw reject(err)}
            resolve(result);
        } )
      });
    }
  
    function join_consult_contact( consult_data , contact_data ) {
      return new Promise((resolve, reject) => {
  
        let person_1 = consult_data.map(item => {
          return { name : item.Owner_Contactname , email : item.Owner_Email , position : item.Owner_Position , company : item.Owner_Companyname };
        });
  
        let person_2 = consult_data.map(item => {
          return { name : item.Consultant_Contactname , email : item.Consultant_Email , position : item.Consultant_Position , company : item.Consultant_Companyname };
        });
  
        let person_3 = consult_data.map(item => {
          return { name : item.MainContractor_Contactname , email : item.MainContractor_Email , position : item.MainContractor_Position , company : item.MainContractor_Companyname };
        });
  
        let person_4 = contact_data.map(item => {
          return { name : item.Payer_Contactname , email : item.Payer_Email , position : item.Payer_Position , company : "" };
        });
  
        let data_all = person_1.concat(person_2, person_3, person_4);
  
        resolve(data_all);
  
      });
    }
  
    function join_consult_contact_company( consult_data , contact_data ) {
      return new Promise((resolve, reject) => {
  
        let company_1 = consult_data.map(item => {
          return { company : item.Owner_Companyname };
        });
  
        let company_2 = consult_data.map(item => {
          return { company : item.Consultant_Companyname };
        });
  
        let company_3 = consult_data.map(item => {
          return { company : item.MainContractor_Companyname };
        });
  
        let data_all = company_1.concat(company_2, company_3);
  
        resolve(data_all.filter(item => item.company !== 'NA'));
  
      });
    }
  
    function join_consult_contact_position( consult_data , contact_data ) {
      return new Promise((resolve, reject) => {
  
        let position_1 = consult_data.map(item => {
          return { position : item.Owner_Position };
        });
  
        let position_2 = consult_data.map(item => {
          return { position : item.Consultant_Position };
        });
  
        let position_3 = consult_data.map(item => {
          return { position : item.MainContractor_Position };
        });
  
        let position_4 = contact_data.map(item => {
          return { position : item.Payer_Position };
        });
  
        let data_all = position_1.concat(position_2, position_3, position_4);
  
        resolve(data_all.filter(item => item.position !== 'NA'));
  
      });
    }
  
    function join_consult_contact_email( consult_data , contact_data ) {
      return new Promise((resolve, reject) => {
  
        let email_1 = consult_data.map(item => {
          return { email : item.Owner_Email };
        });
  
        let email_2 = consult_data.map(item => {
          return { email : item.Consultant_Email };
        });
  
        let email_3 = consult_data.map(item => {
          return { email : item.MainContractor_Email };
        });
  
        let email_4 = contact_data.map(item => {
          return { email : item.Payer_Email };
        });
  
        let data_all = email_1.concat(email_2, email_3, email_4);
  
        resolve(data_all.filter(item => item.email !== 'NA'));
  
      });
    }
  
    function join_consult_contact_name( consult_data , contact_data ) {
      return new Promise((resolve, reject) => {
  
        let name_1 = consult_data.map(item => {
          return { name : item.Owner_Contactname };
        });
  
        let name_2 = consult_data.map(item => {
          return { name : item.Consultant_Contactname };
        });
  
        let name_3 = consult_data.map(item => {
          return { name : item.MainContractor_Contactname };
        });
  
        let name_4 = contact_data.map(item => {
          return { name : item.Payer_Contactname };
        });
  
        let data_all = name_1.concat(name_2, name_3, name_4);
  
        resolve(data_all.filter(item => item.name !== 'NA'));
  
      });
    }
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/satisfaction_document_create_submit" , function( req , res ){
  let sql_1 = `SELECT * FROM tb_project_information WHERE tb_project_information.pj_id = ?`
  let sql_2 = `SELECT * FROM tb_satisfaction_document 
  WHERE tb_satisfaction_document.sd_create_timestamp = ? AND tb_satisfaction_document.sd_project_id = ? 
  AND tb_satisfaction_document.sd_part = ? AND tb_satisfaction_document.sd_create_by_email = ?`
  let sql_3 = `UPDATE tb_satisfaction_document SET sd_status = "รอ Head BU อนุมัติ" WHERE tb_satisfaction_document.sd_id = ?`
  let sql_6 =  `SELECT * FROM tb_satisfaction_document WHERE tb_satisfaction_document.sd_project_id = ? AND tb_satisfaction_document.sd_part = ? AND tb_satisfaction_document.sd_sent_to_email = ? 
  AND tb_satisfaction_document.sd_id <> ? AND tb_satisfaction_document.sd_status <> 'สร้าง' AND tb_satisfaction_document.sd_status <> 'ถูกปฎิเสธ'`
  let sql_7 = `UPDATE tb_satisfaction_document SET sd_create_by_id = ? , sd_create_by_name_th = ? , sd_create_by_name_en = ? , sd_create_by_email = ? , sd_create_date = ? , 
  sd_sent_to_name = ? , sd_sent_to_position = ? , sd_sent_to_company = ? WHERE tb_satisfaction_document.sd_id = ?`
  let sql_8 = `DELETE FROM tb_satisfaction_document WHERE tb_satisfaction_document.sd_id = ?`
  let sql_9 = `UPDATE tb_project_information SET pj_status_css_doc = "รอผลการประเมินครั้งที่ ${req.body.part}" WHERE tb_project_information.pj_id = ?`

  let input_2 = [
    req.body.create_timestamp , 
    req.body.project_id , 
    req.body.part , 
    req.cookies.css_user_email
  ]

  condb.query( sql_9 , req.body.project_id , function(err , result){
    if(err){throw err}

    condb.query( sql_1 , req.body.project_id , function(err , result){
      if(err){throw err}
      let project_data = result
  
      condb.query( sql_2 , input_2 , async function(err , result){
        if(err){throw err}
        let satisfaction_document = result
        let new_email = 0

        for( let i = 0 ; i < satisfaction_document.length ; i++ ){
  
          let check = await check_with_old_data(satisfaction_document[i].sd_project_id , satisfaction_document[i].sd_part , satisfaction_document[i].sd_sent_to_email , satisfaction_document[i].sd_id , satisfaction_document[i])
          
          if( check == "true"){
            await update_status_document( sql_3 , satisfaction_document[i].sd_id )
            new_email++
          }
  
          if(i == satisfaction_document.length - 1){

            if( new_email > 0 ){
              send_email( 
                project_data[0].BUEmail , 
                project_data[0].BU_name , 
                "ต้องอนุมัติ : การส่งใบประเมินความพึงพอใจใหม่ รออนุมัติ" , 
                `การขออนุมัติส่งเอกสารใบประเมินความพึงพอใจของลูกค้าใหม่ จำนวน ${satisfaction_document.length} ฉบับ รออนุมัติจากคุณ  <br>
                โครงการ : ${satisfaction_document[0].sd_project_code} <br> 
                ครั้งที่ : ${satisfaction_document[0].sd_part} <br><br>
                โดย : ${satisfaction_document[0].sd_create_by_name_en} (${satisfaction_document[0].sd_create_by_name_th}) <br> 
                วันที่ : ${dayjs(satisfaction_document[0].sd_create_date).format('DD/MM/YYYY')} <br>` , 
                `เอกสารประเมินความพึงพอใจของลูกค้า` , 
                `${url_now}/satisfaction_document_bu_approve` , 
                "สามารถกดที่ปุ่มด้านบนนี้ เพื่อเข้าสู่เว็บประเมินความพึงพอใจของลูกค้า" 
              )
            }

            res.contentType('application/json');
            let nextPage = JSON.stringify(`${url_now}/project_information/${btoa(req.body.project_id)}`)
            res.header('Content-Length', nextPage.length);
            res.end(nextPage);
          }
        }
  
        function check_with_old_data(project_id , part , email , doc_id , new_doc){
          return new Promise((resolve, reject) => {
            
            condb.query( sql_6 , [project_id , part , email , doc_id] , function(err , result){
              if(err){ reject(err) }
              let same_email_project_part_data = result
  
              if( same_email_project_part_data.length > 0 ){
                condb.query( sql_8 , new_doc.sd_id , async function(err , result){
                  if(err){ reject(err) }
                  resolve( "false" )
                } )
              }else{
                resolve( "true" )
              }
            } )
          })
        }
  
        function update_status_document(sql , value){
          return new Promise((resolve, reject) => {
            
            condb.query( sql , value , function(err , result){
              if(err){reject(err)}
  
              resolve()
            } )
  
          } )
        }
      } )
    } )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/create_css_document_part_1_add_new_row" , function(req , res){
  let sql_1 = `INSERT INTO tb_satisfaction_document 
  ( sd_create_by_id , sd_create_by_name_th , sd_create_by_name_en , sd_create_by_email , sd_create_date , sd_create_timestamp , sd_project_id , sd_project_code , sd_part , sd_status ) 
  VALUE ( ? , ? , ? , ? , ? , ? , ? , ? , ? , "สร้าง" )`

  let date = new Date()

  let input_1 = [
    req.cookies.css_user_id , 
    req.cookies.css_user_fullname_th , 
    req.cookies.css_user_fullname_en , 
    req.cookies.css_user_email , 
    date , 
    req.body.timestamp , 
    req.body.project_id , 
    req.body.project_code , 
    req.body.part
  ]

  condb.query( sql_1 , input_1 , function(err , result){
    if(err){throw err}

    res.end();
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/report" , async function(req , res){

  req.session.css_now_page = "report"

  condb.query( `SELECT * FROM tb_project_information WHERE tb_project_information.pj_id = "116"` , function(err , result){
    if(err){throw err}
    console.log("result")
    console.log(result)
  })

  let sql_1 = `SELECT pj_id , Fulldepartment , ProjectCode , pj_status_css_doc , OwnerNameTH , OwnerNameEN , pj_close_css_1 FROM tb_project_information 
  WHERE tb_project_information.pj_close_css_1 <> ? OR tb_project_information.pj_close_css_1 <> ?
  ORDER BY tb_project_information.pj_id DESC;`
  let sql_2 = `SELECT * FROM tb_satisfaction_document WHERE tb_satisfaction_document.sd_project_id = ? AND tb_satisfaction_document.sd_status = "ประเมินแล้ว" AND tb_satisfaction_document.sd_part = "1" 
  ORDER BY tb_satisfaction_document.sd_id DESC;`
  let sql_3 = `SELECT * FROM tb_satisfaction_document WHERE tb_satisfaction_document.sd_project_id = ? AND tb_satisfaction_document.sd_status = "ประเมินแล้ว" AND tb_satisfaction_document.sd_part = "2" 
  ORDER BY tb_satisfaction_document.sd_id DESC;`

  sql_1 = await function_check_condition_ability_project()

  console.log("sql_1 sql_1 sql_1")
  console.log(sql_1)

  let project_surveyed_list = await query_data( sql_1 , ["" , null] )

  if( project_surveyed_list.length == 0 ){
    console.log("report_no_data")
    res.render( "report_no_data" , {user_data : req.cookies} )
  }else{
    for( let i = 0 ; i < project_surveyed_list.length ; i++ ){
  
      let css_part_1_list = await query_data( sql_2 , project_surveyed_list[i].pj_id )
      let find_point_avg_part_1 = await find_point_avg_fx( css_part_1_list )
  
      project_surveyed_list[i].point_avg_css_part_1 = (+find_point_avg_part_1)
  
      let css_part_2_list = await query_data( sql_3 , project_surveyed_list[i].pj_id )
      let find_point_avg_part_2 = await find_point_avg_fx( css_part_2_list )
      
      if( project_surveyed_list[i].pj_status_css_doc == "สำเร็จ (ประเมิน 2 ครั้ง)" ){
        project_surveyed_list[i].point_avg_css_part_2 = (+find_point_avg_part_2)
      }else if( project_surveyed_list[i].pj_status_css_doc == "สำเร็จ (ประเมิน 1 ครั้ง)" ){
        project_surveyed_list[i].point_avg_css_part_2 = "ไม่มีการประเมิน"
      }else{
        project_surveyed_list[i].point_avg_css_part_2 = "รอการประเมิน"
      }
  
      let results = await calculate_results( project_surveyed_list[i].pj_status_css_doc , find_point_avg_part_1 , find_point_avg_part_2 )
  
      project_surveyed_list[i].results = results
  
      if( i == project_surveyed_list.length - 1 ){
  
        const division_project_array_obj = [];
      
        project_surveyed_list.forEach(item => {
          const exists = division_project_array_obj.some(({ Fulldepartment , ProjectCode }) => Fulldepartment === item.Fulldepartment && ProjectCode === item.ProjectCode);
      
          if (!exists) {
            division_project_array_obj.push({ division : item.Fulldepartment, project: item.ProjectCode });
          }
        });
  
        console.log("division_project_array_obj")
        console.log(division_project_array_obj)
  
        const division_array = [...new Set(division_project_array_obj.map(item => item.division))]
  
        console.log("project_surveyed_list")
        console.log(project_surveyed_list)
  
        res.render( "report" , {user_data : req.cookies , division_array : division_array , division_project_array_obj : division_project_array_obj , project_surveyed_list : project_surveyed_list} )
      }
    }
  }

  function function_check_condition_ability_project() {
    return new Promise((resolve, reject) => {
      let sql_10 = `SELECT * FROM tb_user WHERE tb_user.us_email = ?`
      let sql_11 = `SELECT * FROM tb_project_information WHERE tb_project_information.PMEmail = ? OR tb_project_information.BUEmail = ?`
      let sql_12 = `SELECT * FROM tb_division_admin WHERE tb_division_admin.da_admin_email = ?`
      let sql_13 = `SELECT * FROM tb_site_manager WHERE tb_site_manager.sm_email = ?`
      condb.query( sql_10 , req.cookies.css_user_email , async function(err , result){
        if(err){throw reject(err)}
          let user_data = result

          if( user_data.length == 0 ){
            throw reject(err)
          }else if( user_data[0].us_view_report == "true" ){
            resolve(`SELECT pj_id , Fulldepartment , ProjectCode , pj_status_css_doc , OwnerNameTH , OwnerNameEN , pj_close_css_1 FROM tb_project_information 
            WHERE (tb_project_information.pj_close_css_1 <> ? OR tb_project_information.pj_close_css_1 <> ?) 
            ORDER BY tb_project_information.pj_id DESC;`);
          }else{
            let array_project_id = []
            let division_auten = ""
            condb.query( sql_11 , [ req.cookies.css_user_email , req.cookies.css_user_email ] , async function(err , result){
              if(err){throw reject(err)}
                let pm_bu_project_obj = result
      
                condb.query( sql_12 , req.cookies.css_user_email , async function(err , result){
                  if(err){throw reject(err)}
                    let sa_project_obj = result
                    
                    condb.query( sql_13 , req.cookies.css_user_email , async function(err , result){
                      if(err){throw reject(err)}
                        let sm_project_obj = result
                        let text = ``
                        
                        if( pm_bu_project_obj.length == 0 && sa_project_obj.length == 0 && sm_project_obj.length == 0 ){

                          resolve(`SELECT pj_id , Fulldepartment , ProjectCode , pj_status_css_doc , OwnerNameTH , OwnerNameEN , pj_close_css_1 FROM tb_project_information 
                          WHERE (tb_project_information.pj_close_css_1 <> ? OR tb_project_information.pj_close_css_1 <> ?) AND tb_project_information.pj_id = "0" 
                          ORDER BY tb_project_information.pj_id DESC;`);
                        }

                        if( pm_bu_project_obj.length == 0 ){

                        }else{
                          array_project_id.push(...pm_bu_project_obj.map(item => item.pj_id))
                        }

                        if( sa_project_obj.length == 0 ){
                          console.log("sa_project_obj.length == 0")
                        }else{
                          division_auten = " OR " + sa_project_obj.map(item => `tb_project_information.Fulldepartment = "${item.da_ref_division_name}" `).join(` OR `);
                          console.log("division_auten")
                          console.log(division_auten)
                        }

                        if( sa_project_obj.length == 0 ){

                        }else{
                          array_project_id.push(...sm_project_obj.map(item => item.sm_project_id))
                        }

                        if( array_project_id.length == 0 ){

                        }else{
                          let uniq_project_id = [...new Set(array_project_id)];
                          let convent_uniq_project_id = " ( " + uniq_project_id.map(num => `tb_project_information.pj_id = "${num}"`).join(' OR ') + " ) ";
                          console.log("convent_uniq_project_id")
                          console.log(convent_uniq_project_id)

                          resolve(`SELECT pj_id , Fulldepartment , ProjectCode , pj_status_css_doc , OwnerNameTH , OwnerNameEN , pj_close_css_1 FROM tb_project_information 
                          WHERE (tb_project_information.pj_close_css_1 <> ? OR tb_project_information.pj_close_css_1 <> ?) AND ( ${convent_uniq_project_id} ${division_auten} ) 
                          ORDER BY tb_project_information.pj_id DESC;`);
                        }
                    } )
                } )
            } )
          }
      } )
    });
  }


  function calculate_results( css_time , point_part_1 , point_part_2 ) {
    return new Promise((resolve, reject) => {
      
      if( css_time == "สำเร็จ (ประเมิน 2 ครั้ง)" ){
        if( +point_part_1 > +point_part_2 ){
          if( +point_part_1 < 75){
            resolve("Unsatisfactory")
          }else if( +point_part_2 < 75){
            resolve("Poor Improvement")
          }else{
            resolve("Fair Improvement")
          }
        }else if( +point_part_1 < +point_part_2 ){
          if( +point_part_2 < 75){
            resolve("Unsatisfactory")
          }else if( +point_part_1 < 75){
            resolve("Better Improvement")
          }else{
            resolve("Better Improvement")
          }
        }else if( +point_part_1 == +point_part_2 ){
          if( +point_part_2 < 75){
            resolve("Unsatisfactory")
          }else{
            resolve("Fair Improvement")
          }
        }else{
          resolve("Out of Condition ติดต่อไอที")
        }
      }else{
        if( +point_part_1 > 75 ){
          resolve("Satisfactory")
        }else{
          resolve("Unsatisfactory")
        }
      }

    });
  }

  function query_data( sql , value ) {
    return new Promise((resolve, reject) => {
      condb.query( sql , value , async function(err , result){
        if(err){throw reject(err)}
          resolve(result);
      } )
    });
  }

  function find_point_avg_fx( css_part_1_list ) {
    return new Promise((resolve, reject) => {
      
      if( css_part_1_list.length == 0 ){
        resolve(0)
      }else{
        let summary_point = 0 
        for( let i = 0 ; i < css_part_1_list.length ; i++ ){
          summary_point += (+css_part_1_list[i].sd_point_1)
          summary_point += (+css_part_1_list[i].sd_point_2)
          summary_point += (+css_part_1_list[i].sd_point_3)
          summary_point += (+css_part_1_list[i].sd_point_4)
          summary_point += (+css_part_1_list[i].sd_point_5)
          summary_point += (+css_part_1_list[i].sd_point_6)
          summary_point += (+css_part_1_list[i].sd_point_7)
          summary_point += (+css_part_1_list[i].sd_point_8)
          summary_point += (+css_part_1_list[i].sd_point_9)
          summary_point += (+css_part_1_list[i].sd_point_10)
          summary_point += (+css_part_1_list[i].sd_point_11)
          summary_point += (+css_part_1_list[i].sd_point_12)

          if( i == css_part_1_list.length - 1 ){

            console.log("summary_point")
            console.log(summary_point)
            console.log("css_part_1_list.length")
            console.log(css_part_1_list.length)

            resolve(Math.round((summary_point * 100)/(css_part_1_list.length * 120)))
          }
        }
      }
    });
  }

})

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/report_time_filter" , async function(req , res){

  req.session.css_now_page = "report"

  let sql_1 = `SELECT tb_satisfaction_document.* , tb_project_information.* FROM tb_project_information 
  LEFT JOIN tb_satisfaction_document ON tb_satisfaction_document.sd_project_id = tb_project_information.pj_id 
  WHERE (tb_project_information.pj_close_css_1 <> ? OR tb_project_information.pj_close_css_1 <> ?) AND tb_satisfaction_document.sd_status = "ประเมินแล้ว"
  ORDER BY tb_project_information.pj_id DESC;`

  let sql_2 = `SELECT * FROM tb_satisfaction_document WHERE tb_satisfaction_document.sd_project_id = ? AND tb_satisfaction_document.sd_status = "ประเมินแล้ว" AND tb_satisfaction_document.sd_part = "1" 
  ORDER BY tb_satisfaction_document.sd_id DESC;`
  let sql_3 = `SELECT * FROM tb_satisfaction_document WHERE tb_satisfaction_document.sd_project_id = ? AND tb_satisfaction_document.sd_status = "ประเมินแล้ว" AND tb_satisfaction_document.sd_part = "2" 
  ORDER BY tb_satisfaction_document.sd_id DESC;`

  // sql_1 = await function_check_condition_ability_project()

  console.log("sql_1 sql_1 sql_1")
  console.log(sql_1)

  let css_surveyed_list = await query_data( sql_1 , ["" , "0000-00-00"] )

  if( css_surveyed_list.length == 0 ){
    res.render( "report_no_data" , {user_data : req.cookies} )
    
  }else{
    for( let i = 0 ; i < css_surveyed_list.length ; i++ ){

      let find_point_avg = await find_point_avg_fx( css_surveyed_list[i] )
  
      css_surveyed_list[i].point_avg_css = find_point_avg
  
      if( i == css_surveyed_list.length - 1 ){
  
        const division_array = [...new Set(css_surveyed_list.map(item => item.Fulldepartment))];
        const project_array = [...new Set(css_surveyed_list.map(item => item.ProjectCode))];
  
        console.log("css_surveyed_list")
        console.log(css_surveyed_list)

        console.log("css_surveyed_list.length")
        console.log(css_surveyed_list.length)

        console.log("division_array")
        console.log(division_array)
        console.log("project_array")
        console.log(project_array)
  
        res.render( "report_time_filter" , {user_data : req.cookies , division_array : division_array , project_array : project_array , css_surveyed_list : css_surveyed_list} )
      }
    }
  }

  function function_check_condition_ability_project() {
    return new Promise((resolve, reject) => {
      let sql_10 = `SELECT * FROM tb_user WHERE tb_user.us_email = ?`
      let sql_11 = `SELECT * FROM tb_project_information WHERE tb_project_information.PMEmail = ? OR tb_project_information.BUEmail = ?`
      let sql_12 = `SELECT * FROM tb_site_admin WHERE tb_site_admin.sa_email = ?`
      let sql_13 = `SELECT * FROM tb_site_manager WHERE tb_site_manager.sm_email = ?`
      condb.query( sql_10 , req.cookies.css_user_email , async function(err , result){
        if(err){throw reject(err)}
          let user_data = result

          if( user_data.length == 0 ){
            throw reject(err)
          }else if( user_data[0].us_view_report == "true" ){
            resolve(`SELECT pj_id , Fulldepartment , ProjectCode , pj_status_css_doc , OwnerNameTH , OwnerNameEN FROM tb_project_information 
            WHERE tb_project_information.pj_status_css_doc = ? OR tb_project_information.pj_status_css_doc = ? 
            ORDER BY tb_project_information.pj_id DESC;`);
          }else{
            let array_project_id = []
            condb.query( sql_11 , [ req.cookies.css_user_email , req.cookies.css_user_email ] , async function(err , result){
              if(err){throw reject(err)}
                let pm_bu_project_obj = result
      
                condb.query( sql_12 , req.cookies.css_user_email , async function(err , result){
                  if(err){throw reject(err)}
                    let sa_project_obj = result
                    
                    condb.query( sql_13 , req.cookies.css_user_email , async function(err , result){
                      if(err){throw reject(err)}
                        let sm_project_obj = result
                        let text = ``
                        
                        if( pm_bu_project_obj.length == 0 && sa_project_obj.length == 0 && sm_project_obj.length == 0 ){
                          resolve(`SELECT pj_id , Fulldepartment , ProjectCode , pj_status_css_doc , OwnerNameTH , OwnerNameEN FROM tb_project_information 
                          WHERE (tb_project_information.pj_status_css_doc = ? OR tb_project_information.pj_status_css_doc = ? ) AND tb_project_information.pj_id = "0"
                          ORDER BY tb_project_information.pj_id DESC;`);
                        }

                        if( pm_bu_project_obj.length == 0 ){

                        }else{
                          array_project_id.push(...pm_bu_project_obj.map(item => item.pj_id))
                        }

                        if( sa_project_obj.length == 0 ){

                        }else{
                          array_project_id.push(...sa_project_obj.map(item => item.sa_project_id))
                        }

                        if( sa_project_obj.length == 0 ){

                        }else{
                          array_project_id.push(...sm_project_obj.map(item => item.sm_project_id))
                        }

                        if( array_project_id.length == 0 ){

                        }else{
                          let uniq_project_id = [...new Set(array_project_id)];
                          let convent_uniq_project_id = " AND ( " + uniq_project_id.map(num => `tb_project_information.pj_id = "${num}"`).join(' OR ') + " ) ";
                          console.log("convent_uniq_project_id")
                          console.log(convent_uniq_project_id)
                          resolve(`SELECT pj_id , Fulldepartment , ProjectCode , pj_status_css_doc , OwnerNameTH , OwnerNameEN FROM tb_project_information 
                          WHERE (tb_project_information.pj_status_css_doc = ? OR tb_project_information.pj_status_css_doc = ?) ${convent_uniq_project_id} 
                          ORDER BY tb_project_information.pj_id DESC;`);
                        }
                    } )
                } )
            } )
          }
      } )
    });
  }

  function query_data( sql , value ) {
    return new Promise((resolve, reject) => {
      condb.query( sql , value , async function(err , result){
        if(err){throw reject(err)}
          resolve(result);
      } )
    });
  }

  function find_point_avg_fx( css_part_1_list ) {
    return new Promise((resolve, reject) => {
      
      if( css_part_1_list.length == 0 ){
        resolve(0)
      }else{
        let summary_point = (+css_part_1_list.sd_point_1) + (+css_part_1_list.sd_point_2) + (+css_part_1_list.sd_point_3) + (+css_part_1_list.sd_point_4) + (+css_part_1_list.sd_point_5) + (+css_part_1_list.sd_point_6) + (+css_part_1_list.sd_point_7) + (+css_part_1_list.sd_point_8) + (+css_part_1_list.sd_point_9) + (+css_part_1_list.sd_point_10) + (+css_part_1_list.sd_point_11) + (+css_part_1_list.sd_point_12)
        // summary_point += (+css_part_1_list.sd_point_1)
        // summary_point += (+css_part_1_list.sd_point_2)
        // summary_point += (+css_part_1_list.sd_point_3)
        // summary_point += (+css_part_1_list.sd_point_4)
        // summary_point += (+css_part_1_list.sd_point_5)
        // summary_point += (+css_part_1_list.sd_point_6)
        // summary_point += (+css_part_1_list.sd_point_7)
        // summary_point += (+css_part_1_list.sd_point_8)
        // summary_point += (+css_part_1_list.sd_point_9)
        // summary_point += (+css_part_1_list.sd_point_10)
        // summary_point += (+css_part_1_list.sd_point_11)
        // summary_point += (+css_part_1_list.sd_point_12)

        resolve(Math.round((summary_point * 100)/120))
      }
    });
  }

})

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/only_for_run_sql" , function(req , res){
  let sql_1 = req.body.sql_command

  condb.query( sql_1 , function(err , result){
    if(err){throw err}

    res.end();
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/new_template" , function(req , res){
  res.render( "new_template" , {user_data : req.cookies})
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/chat_with_master_admin" , async function(req , res){

  if( req.cookies.css_user_id == null || req.cookies.css_user_email == null ){
    res.cookie( "css_save_page_url", `/chat_with_master_admin` );
    res.redirect( powerapps_link )
  }else{

    let user_data = await reset_cookies( req.cookies.css_user_email )

    if( user_data[0].us_row == "master admin" ){

      let sql_1 = `SELECT * FROM tb_chat_person ORDER BY cp_timestamp DESC`

      condb.query( sql_1 , function(err , result){
        if(err){throw err}

        let person_send_message = result
        res.render("chat_with_master_admin_admin" , {user_data : req.cookies , person_send_message : person_send_message})
      } )

    }else{

      res.render("chat_with_master_admin_user" , {user_data : req.cookies})

    }

  }

  function reset_cookies( user_email ){
    return new Promise ( ( resolve, reject ) => {
      let sql_1 = `SELECT * FROM tb_user WHERE tb_user.us_email = ?`
      let sql_2 = `SELECT * FROM tb_user_iso WHERE tb_user_iso.iso_email = ?`
      let sql_3 = `SELECT * FROM tb_user_coo WHERE tb_user_coo.coo_email = ?`
  
      condb.query( sql_3 , user_email , function(err , result){
        if(err){throw err}
  
        if( result.length == 0 ){
          res.cookie( "css_user_iso", "NO COO" );
        }else{
          res.cookie( "css_user_iso", "COO" );
        }
  
        condb.query( sql_2 , user_email , function(err , result){
          if(err){throw err}
    
          if( result.length == 0 ){
            res.cookie( "css_user_iso", "NO ISO" );
          }else{
            res.cookie( "css_user_iso", "ISO" );
          }
    
          condb.query( sql_1 , user_email , function(err , result){
            if(err){throw err}
            let user_data = result
  
            if( user_data.length == 0 ){
              reject( "ไม่มีข้อมูล User" )
            }else{
  
              res.cookie( "css_user_id", result[0].us_id );
              res.cookie( "css_employee_id", result[0].us_employee_id );
              res.cookie( "css_employee_id_2", result[0].us_employee_id_2 );
              res.cookie( "css_user_email", result[0].us_email );
              res.cookie( "css_user_fullname_th" , result[0].us_fullname_th );
              res.cookie( "css_user_fullname_en", result[0].us_fullname_en );
              res.cookie( "css_user_division", result[0].us_division );
              res.cookie( "css_user_row", result[0].us_row );
              res.cookie( "css_user_enable", result[0].us_enable );
              res.cookie( "css_user_view_report", result[0].us_view_report );
        
              resolve(user_data)
            }
          } )
        } )
      } )
    } )
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/send_message_to_master_admin" , function(req , res){
  let sql_1 = `SELECT * FROM tb_chat_person WHERE tb_chat_person.cp_user_id = ?`

  let sql_2 = `INSERT INTO tb_chat_message (cm_send_person_id , cm_send_user_id , cm_send_employee_id , cm_send_name_th , cm_send_name_en , cm_send_email , cm_send_division , cm_send_timestamp , cm_message) 
  VALUE (? , ? , ? , ? , ? , ? , ? , ? , ?)`

  condb.query( sql_1 , req.cookies.css_user_id , async function(err , result){
    if(err){throw err}

    await check_old_data_and_insert(result)

    condb.query( sql_1 , req.cookies.css_user_id , async function(err , result){
      if(err){throw err}
      let person_send_message = result

      let input_2 = [
        person_send_message[0].cp_id ,
        req.cookies.css_user_id , 
        req.cookies.css_employee_id_2 , 
        req.cookies.css_user_fullname_th , 
        req.cookies.css_user_fullname_en , 
        req.cookies.css_user_email , 
        req.cookies.css_user_division , 
        Date.now() ,
        req.body.message
      ]

      condb.query( sql_2 , input_2 , async function(err , result){
        if(err){throw err}
        
        res.end()
      } )
    } )
  } )

  function check_old_data_and_insert(result){
    return new Promise ( (resolve , reject) => {
      let sql_fx_1 = `INSERT INTO tb_chat_person (cp_user_id , cp_employee_id , cp_user_name_th , cp_user_name_en , cp_user_email , cp_user_division , cp_status , cp_timestamp) VALUE (? , ? , ? , ? , ? , ? , ? , ?)`
      let input_1 = [
        req.cookies.css_user_id , 
        req.cookies.css_employee_id_2 , 
        req.cookies.css_user_fullname_th , 
        req.cookies.css_user_fullname_en , 
        req.cookies.css_user_email , 
        req.cookies.css_user_division , 
        "ยังไม่ได้อ่าน" , 
        Date.now()
      ]

      let sql_fx_2 = `UPDATE tb_chat_person SET cp_status = "ยังไม่ได้อ่าน" , cp_timestamp = ? WHERE tb_chat_person.cp_user_id = ?`
      let input_2 = [
        Date.now() ,
        req.cookies.css_user_id 
      ]

      if( result.length == 0 ){
        condb.query( sql_fx_1 , input_1 , function(err , result){
          if(err){reject(err)}

          resolve()
        } )
      }else{
        condb.query( sql_fx_2 , input_2 , function(err , result){
          if(err){reject(err)}

          resolve()
        } )
      }
    } )
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/call_data_history_chat/:user_id" , function(req , res){
  let user_id = req.params.user_id

  let sql_1 = `SELECT * FROM tb_chat_person WHERE tb_chat_person.cp_user_id = ?`
  // let sql_2 = `SELECT * FROM tb_chat_message WHERE tb_chat_message.cm_send_person_id = ?`
  let sql_2 = `SELECT * FROM tb_chat_message 
  LEFT JOIN tb_chat_person ON tb_chat_person.cp_id = tb_chat_message.cm_send_person_id
  WHERE tb_chat_message.cm_send_person_id = ?`

  condb.query( sql_1 , user_id , function(err , result){
    if(err){throw err}
    let person_send_message = result

    if( person_send_message.length == 0 ){

      return res.json("");
      
    }else{
      condb.query( sql_2 , person_send_message[0].cp_id , function(err , result){
        if(err){throw err}
        let chat_history_all = result
  
        console.log("chat_history_all")
        console.log(chat_history_all)
    
        return res.json(chat_history_all);
      } )
    }
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/call_data_history_chat_from_admin/:user_id" , function(req , res){
  let user_id = req.params.user_id

  
  let sql_1 = `SELECT * FROM tb_chat_person WHERE tb_chat_person.cp_user_id = ?`
  let sql_2 = `UPDATE tb_chat_person SET cp_status = "อ่านแล้ว" WHERE tb_chat_person.cp_user_id = ?`
  let sql_3 = `SELECT * FROM tb_chat_message 
  LEFT JOIN tb_chat_person ON tb_chat_person.cp_id = tb_chat_message.cm_send_person_id
  WHERE tb_chat_message.cm_send_person_id = ?`

  condb.query( sql_1 , user_id , function(err , result){
    if(err){throw err}
    let person_send_message = result

    condb.query( sql_2 , user_id , function(err , result){
      if(err){throw err}
  
      condb.query( sql_3 , person_send_message[0].cp_id , function(err , result){
        if(err){throw err}
        let chat_history_all = result
  
        console.log("chat_history_all")
        console.log(chat_history_all)
    
        return res.json(chat_history_all);
      } )
    } )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/send_message_from_master_admin" , function(req , res){

  let sql_1 = `SELECT * FROM tb_chat_person WHERE tb_chat_person.cp_user_id = ?`

  let sql_2 = `INSERT INTO tb_chat_message (cm_send_person_id , cm_send_user_id , cm_send_employee_id , cm_send_name_th , cm_send_name_en , cm_send_email , cm_send_division , cm_send_timestamp , cm_message) 
  VALUE (? , ? , ? , ? , ? , ? , ? , ? , ?)`

  condb.query( sql_1 , req.body.person_user_id_global , async function(err , result){
    if(err){throw err}
    let person_send_message = result

    let input_2 = [
      person_send_message[0].cp_id ,
      req.cookies.css_user_id , 
      req.cookies.css_employee_id_2 , 
      req.cookies.css_user_fullname_th , 
      req.cookies.css_user_fullname_en , 
      req.cookies.css_user_email , 
      req.cookies.css_user_division , 
      Date.now() ,
      req.body.message
    ]

    condb.query( sql_2 , input_2 , async function(err , result){
      if(err){throw err}
      
      res.end()
    } )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// let input_2 = [
//   person_send_message[0].cp_id ,
//   req.cookies.css_user_id , 
//   req.cookies.css_employee_id_2 , 
//   req.cookies.css_user_fullname_th , 
//   req.cookies.css_user_fullname_en , 
//   req.cookies.css_user_email , 
//   req.cookies.css_user_division , 
//   Date.now() ,
//   req.body.message
// ]

// condb.query( sql_2 , input_2 , async function(err , result){
//   if(err){throw err}
  
//   res.end()
// } )

router.post( "/user_upload_image_in_chat" , function(req , res){

  if( req.cookies.css_user_id == null || req.cookies.css_user_email == null ){
    res.cookie( "css_save_page_url", `/chat_with_master_admin` );
    res.redirect( powerapps_link )
  }else{
    let random_strings = (Math.random() + 1).toString(36).substring(2);
    let timestamp = Date.now()
  
    let sql_1 = `SELECT * FROM tb_chat_person WHERE tb_chat_person.cp_user_id = ?`
    let sql_2 = `INSERT INTO tb_chat_message (cm_send_person_id , cm_send_user_id , cm_send_employee_id , cm_send_name_th , cm_send_name_en , cm_send_email , cm_send_division , cm_send_timestamp , cm_message) 
    VALUE (? , ? , ? , ? , ? , ? , ? , ? , ?)`
  
    condb.query( sql_1 , req.cookies.css_user_id , async function(err , result){
      if(err){throw err}
  
      await check_old_data_and_insert(result)
  
      condb.query( sql_1 , req.cookies.css_user_id , async function(err , result){
        if(err){throw err}
        let person_send_message = result
  
        let dir = 'public/assets/file_upload_in_chat/'

        if (!fs.existsSync(dir)){
          fs.mkdirSync(dir, { recursive: true });
        }

        let form = new formidable.IncomingForm();

        form.parse( req , function(error , fields , file ){
          if (error) {
            res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
            res.end(String(err));
            return;
          }

          let name_split_array = (file.fileupload.originalFilename).split('.');
          let name_split_string = name_split_array[name_split_array.length - 1];
          let filepath = file.fileupload.filepath
          let type_file = ""

          if( name_split_string == "jpeg" || name_split_string == "jpg" || name_split_string == "png" || name_split_string == "JPEG" || name_split_string == "JPG" || name_split_string == "PNG" ){
            type_file = "image"
          }else{
            type_file = "file"
          }

          let path_new = url_now + '/assets/file_upload_in_chat/' + person_send_message[0].cp_id + "_" + timestamp + "_" + random_strings + "." + name_split_string;
          let path_to_delete = 'public/assets/file_upload_in_chat/' + person_send_message[0].cp_id + "_" + timestamp + "_" + random_strings + "." + name_split_string;

          fs.copyFile( filepath , path_to_delete , function(err){
            if( err ){
              throw err 
            }else{
              let sql_3 = `INSERT INTO tb_chat_file_upload ( cfu_create_name_th , cfu_create_name_en , cfu_create_email , cfu_chat_person_id , cfu_file_name , cfu_file_type , cfu_file_part , cfu_file_part_todelete )
              VALUE( ? , ? , ? , ? , ? , ? , ? , ? )`
              let now = new Date()
              let input_3 = [
                req.cookies.css_user_fullname_th , 
                req.cookies.css_user_fullname_en , 
                req.cookies.css_user_email , 
                person_send_message[0].cp_id , 
                file.fileupload.originalFilename , 
                type_file , 
                path_new , 
                path_to_delete 
              ]
              condb.query( sql_3 , input_3 , function( err , result ){
                if( err ){ throw err }

                let input_2 = [
                  person_send_message[0].cp_id ,
                  req.cookies.css_user_id , 
                  req.cookies.css_employee_id_2 , 
                  req.cookies.css_user_fullname_th , 
                  req.cookies.css_user_fullname_en , 
                  req.cookies.css_user_email , 
                  req.cookies.css_user_division , 
                  Date.now() ,
                  `อัพโหลดไฟล์ : <a href="${path_new}" target="_blank">${file.fileupload.originalFilename}</a> ` 
                ]
          
                condb.query( sql_2 , input_2 , async function(err , result){
                  if(err){throw err}
                  
                  res.redirect( `/chat_with_master_admin` )
                } )
              } )
            }
          } )
        } )
      } )
    } )
  
    function check_old_data_and_insert(result){
      return new Promise ( (resolve , reject) => {
        let sql_fx_1 = `INSERT INTO tb_chat_person (cp_user_id , cp_employee_id , cp_user_name_th , cp_user_name_en , cp_user_email , cp_user_division , cp_status , cp_timestamp) VALUE (? , ? , ? , ? , ? , ? , ? , ?)`
        let input_1 = [
          req.cookies.css_user_id , 
          req.cookies.css_employee_id_2 , 
          req.cookies.css_user_fullname_th , 
          req.cookies.css_user_fullname_en , 
          req.cookies.css_user_email , 
          req.cookies.css_user_division , 
          "ยังไม่ได้อ่าน" , 
          Date.now()
        ]
  
        let sql_fx_2 = `UPDATE tb_chat_person SET cp_status = "ยังไม่ได้อ่าน" , cp_timestamp = ? WHERE tb_chat_person.cp_user_id = ?`
        let input_2 = [
          Date.now() ,
          req.cookies.css_user_id 
        ]
  
        if( result.length == 0 ){
          condb.query( sql_fx_1 , input_1 , function(err , result){
            if(err){reject(err)}
  
            resolve()
          } )
        }else{
          condb.query( sql_fx_2 , input_2 , function(err , result){
            if(err){reject(err)}
  
            resolve()
          } )
        }
      } )
    }
  }


  // let dir = 'public/assets/action_plan_file/' + project_code + "/part_" + part

  // if (!fs.existsSync(dir)){
  //   fs.mkdirSync(dir, { recursive: true });
  // }

  // let form = new formidable.IncomingForm();

  // form.parse( req , function(error , fields , file ){
  //   if (error) {
  //     res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
  //     res.end(String(err));
  //     return;
  //   }

  //   let filepath = file.fileupload.filepath
  //   let newpath = 'public/assets/action_plan_file/' + project_code + "/part_" + part + "/";
  //   let newpath1 = '/assets/action_plan_file/' + project_code + "/part_" + part + "/";
  //   newpath += timestamp + "-" + file.fileupload.originalFilename;
  //   newpath1 += timestamp + "-" + file.fileupload.originalFilename;

  //   fs.copyFile( filepath , newpath , function(err){
  //     if( err ){
  //       throw err 
  //     }else{
  //       let sql_1 = `INSERT INTO tb_action_plan_file( apf_create_name_th , apf_create_name_en , apf_create_email , apf_create_timestamp , apf_project_id , apf_project_code , apf_part , apf_old_name , apf_new_name , apf_delete_name )
  //       VALUE( ? , ? , ? , ? , ? , ? , ? , ? , ? , ? )`
  //       let now = new Date()
  //       let input_1 = [
  //         req.cookies.css_user_fullname_th , 
  //         req.cookies.css_user_fullname_en , 
  //         req.cookies.css_user_email , 
  //         timestamp , 
  //         project_id , 
  //         project_code , 
  //         part , 
  //         file.fileupload.originalFilename , 
  //         url_now + newpath1 , 
  //         newpath 
  //       ]
  //       condb.query( sql_1 , input_1 , function( err , result ){
  //         if( err ){ throw err }

  //         res.redirect( `/project_information/${btoa(project_id)}` )
  //       } )
  //     }
  //   } )
  // } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/example_email/:css_id_code" , function(req , res){
  let css_id = atob(req.params.css_id_code)

  let sql_1 = `SELECT * FROM tb_satisfaction_document WHERE tb_satisfaction_document.sd_id = ?`
  let sql_2 = `SELECT * FROM tb_project_information WHERE tb_project_information.pj_id = ?`

  condb.query( sql_1 , css_id , function(err , result){
    if(err){throw err}

    if(result.length == 0){
      res.send("ไม่พบข้อมูลเอกสารดังกล่าว")
    }else{
      let css_doc_data = result

      condb.query( sql_2 , css_doc_data[0].sd_project_id , function(err , result){
        if(err){throw err}
    
        if(result.length == 0){
          res.send("ไม่พบข้อมูลโครงการดังกล่าว")
        }else{
          let project_data = result
          
          if( css_doc_data[0].sd_language_email == "อังกฤษ" ){
            res.render( "example_email_en" , {user_data : req.cookies , css_doc_data : css_doc_data , project_data : project_data} )

          }else{
            res.render( "example_email_th" , {user_data : req.cookies , css_doc_data : css_doc_data , project_data : project_data} )
          }
        }
      } )
    }
  } )
} )

// //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// router.post( "/add_sm_admin_to_db_multiple" , async function(req , res){

//   let type_add = req.body.type_add
//   let user_data_str = (req.body.user_data_str).replace(/\n|\t|\r/g, "")
//   let project_data_str = req.body.project_data_str

//   let user_data_obj = JSON.parse(user_data_str)
//   let project_data_obj = JSON.parse(project_data_str)

//   console.log("type_add")
//   console.log(type_add)

//   console.log("user_data_str")
//   console.log(user_data_str)

//   console.log("project_data_str")
//   console.log(project_data_str)

//   console.log("-------------------------------------")

//   console.log("user_data_obj")
//   console.log(user_data_obj)

//   console.log("project_data_obj")
//   console.log(project_data_obj)

//   if( user_data_obj.length == 0 || project_data_obj.length == 0 || type_add == "" ){

//   }else{

//     let sql_1 = ``
//     let sql_2 = ``

//     if( type_add == "admin" ){
//       sql_1 = `DELETE FROM tb_site_admin WHERE tb_site_admin.sa_project_id = ? AND tb_site_admin.sa_email = ?`
//       sql_2 = `INSERT INTO tb_site_admin 
//       ( sa_create_by_id , sa_create_by_name_th , sa_create_by_name_en , sa_create_by_email , sa_project_id , sa_project_code , sa_employee_id , sa_employee_code , sa_name_th , sa_name_en , sa_email , sa_division ) 
//       VALUE ( ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? )`
//     }else{
//       sql_1 = `DELETE FROM tb_site_manager WHERE tb_site_manager.sm_project_id = ? AND tb_site_manager.sm_email = ?`
//       sql_2 = `INSERT INTO tb_site_manager 
//       ( sm_create_by_id , sm_create_by_name_th , sm_create_by_name_en , sm_create_by_email , sm_project_id , sm_project_code , sm_employee_id , sm_employee_code , sm_name_th , sm_name_en , sm_email , sm_division ) 
//       VALUE ( ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? )`
//     }

//     for( let i = 0 ; i < user_data_obj.length ; i++ ){
//       let user_data_checked = await prepare_user_data(user_data_obj[i])
//       await delete_and_insert_to_db( project_data_obj , user_data_checked , sql_1 , sql_2 )

//       if( i == user_data_obj.length - 1 ){
//         res.end()
//       }
//     }
//   }

//   function delete_and_insert_to_db( project_array , user_data_only_one , sql_1 , sql_2 ){
//     return new Promise( (resolve , reject) => {
//       for( let i = 0 ; i < project_array.length ; i++ ){

//         condb.query( sql_1 , [project_array[i].project_id , user_data_only_one.sa_email] , function(err , result){
//           if(err){reject(err)}
//           let input_2 = [
//             req.cookies.css_user_id , 
//             req.cookies.css_user_fullname_th , 
//             req.cookies.css_user_fullname_en , 
//             req.cookies.css_user_email , 
//             project_array[i].project_id , 
//             project_array[i].project_name , 
//             user_data_only_one.sa_employee_id , 
//             user_data_only_one.sa_employee_code , 
//             user_data_only_one.sa_name_th , 
//             user_data_only_one.sa_name_en , 
//             user_data_only_one.sa_email , 
//             user_data_only_one.sa_division
//           ]

//           condb.query( sql_2 , input_2 , function(err , result){
//             if(err){reject(err)}
            
//             if( i == project_array.length - 1){
//               resolve()
//             }
//           } )
//         } )
//       }
//     } )
//   }

//   async function prepare_user_data(user_data_only_one) {
//     return new Promise(async (resolve, reject) => {
//         try {
//             let same_email_in_hr = await fetchData(user_data_only_one);

//             // console.log("same_email_in_hr:", same_email_in_hr);

//             if (same_email_in_hr.length === 0) {
//                 resolve(user_data_only_one);
//             } else {
//                 // Resolve with modified user data
//                 resolve({
//                     sa_employee_id: same_email_in_hr[0].ed_id,
//                     sa_employee_code: same_email_in_hr[0].ed_employee_id,
//                     sa_name_th: user_data_only_one.sa_name_th,
//                     sa_name_en: user_data_only_one.sa_name_en,
//                     sa_email: user_data_only_one.sa_email,
//                     sa_division: user_data_only_one.sa_division,
//                 });
//             }
//         } catch (error) {
//             console.error("Error in prepare_user_data:", error);
//             reject(error);
//         }
//     });
//   }

//   async function fetchData(user_data_only_one) {
//     try {
//         let employee_ite_data = await axios.get(url_api_employee_ite);
//         return employee_ite_data.data.filter(e => e.ed_email_ite === user_data_only_one.sa_email);
//     } catch (error) {
//         console.error("Error fetching employee data:", error);
//         throw error;
//     }
//   }
// } )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/change_pm_bu_to_db_multiple" , async function(req , res){

  let type_change = req.body.type_change
  let project_data_str = req.body.project_data_str

  let project_data_obj = JSON.parse(project_data_str)
  let user_data_obj = {
    pm_bu_user_id : "0" , 
    pm_bu_employee_id : "0" , 
    pm_bu_name_th : req.body.pm_bu_name_th , 
    pm_bu_name_en : req.body.pm_bu_name_en , 
    pm_bu_email : req.body.pm_bu_email , 
    pm_bu_division : req.body.pm_bu_division
  }

  let user_data_checked = await prepare_user_data(user_data_obj)

  if( project_data_obj.length == 0 || type_change == ""){

  }else{

    let sql_1 = ``

    if( type_change == "pm" ){
      sql_1 = `UPDATE tb_project_information SET PM_us_id = ? , PM_emp_id = ? , PMName = ? , PM_name_th = ? , PMEmail = ? , PM_division = ? WHERE pj_id = ?`
    }else{
      sql_1 = `UPDATE tb_project_information SET BU_us_id = ? , BU_emp_id = ? , BU_name = ? , BU_name_th = ? , BUEmail = ? , BU_division = ? WHERE pj_id = ?`
    }

    for( let i = 0 ; i < project_data_obj.length ; i++ ){
      condb.query( sql_1 , [user_data_checked.pm_bu_user_id , user_data_checked.pm_bu_employee_id , user_data_checked.pm_bu_name_en , user_data_checked.pm_bu_name_th , user_data_checked.pm_bu_email , user_data_checked.pm_bu_division , project_data_obj[i].project_id ] , function(err , result){
        if(err){throw err}

        if( i == project_data_obj.length - 1 ){
          res.end();
        }
      } )
    }
  }

  async function prepare_user_data(user_data_only_one) {
    return new Promise(async (resolve, reject) => {
        try {
            let same_email_in_hr = await fetchData(user_data_only_one);

            if (same_email_in_hr.length === 0) {
                resolve(user_data_only_one);
            } else {
                resolve({
                    pm_bu_user_id : same_email_in_hr[0].ed_id,
                    pm_bu_employee_id : same_email_in_hr[0].ed_employee_id,
                    pm_bu_name_th : req.body.pm_bu_name_th , 
                    pm_bu_name_en : req.body.pm_bu_name_en , 
                    pm_bu_email : req.body.pm_bu_email , 
                    pm_bu_division : req.body.pm_bu_division
                });
            }
        } catch (error) {
            console.error("Error in prepare_user_data:", error);
            reject(error);
        }
    });
  }

  async function fetchData(user_data_only_one) {
    try {
        let employee_ite_data = await axios.get(url_api_employee_ite);
        return employee_ite_data.data.filter(e => e.ed_email_ite === user_data_only_one.pm_bu_email);
    } catch (error) {
        console.error("Error fetching employee data:", error);
        throw error;
    }
  }

} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/add_admin_division_to_db" , async function(req , res){

  let division_id = req.body.division_id
  let division_code = req.body.division_code
  let user_data_obj = {
    user_id : "0" , 
    employee_id : "0" , 
    name_th : req.body.new_admin_division_name_th , 
    name_en : req.body.new_admin_division_name_en , 
    email : req.body.new_admin_division_email , 
    division : req.body.new_admin_division_division
  }

  let user_data_checked = await prepare_user_data(user_data_obj)

  let sql_1 = `DELETE FROM tb_division_admin WHERE tb_division_admin.da_ref_division_id = ? AND tb_division_admin.da_admin_email = ?`
  let sql_2 = `INSERT INTO tb_division_admin (da_create_name_th , da_create_name_en , da_create_email , da_create_division , da_ref_division_id , da_ref_division_name , da_admin_user_id , da_admin_employee_id , da_admin_name_th , da_admin_name_en , da_admin_email , da_admin_division) 
  VALUE (? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ?)`

  let input_2 = [
    req.cookies.css_user_fullname_th , 
    req.cookies.css_user_fullname_en , 
    req.cookies.css_user_email ,
    req.cookies.css_user_division ,

    division_id , 
    division_code , 

    user_data_checked.user_id , 
    user_data_checked.employee_id , 
    user_data_checked.name_th , 
    user_data_checked.name_en , 
    user_data_checked.email , 
    user_data_checked.division
  ]

  condb.query( sql_1 , [ division_id , req.body.new_admin_division_email ] , function(err , result){
    if(err){throw err}

    condb.query( sql_2 , input_2 , function(err , result){
      if(err){throw err}
  
      res.end();
    } )
  } )

  async function prepare_user_data(user_data_obj) {
    return new Promise(async (resolve, reject) => {
        try {
            let same_email_in_hr = await fetchData(user_data_obj);

            if (same_email_in_hr.length === 0) {
                resolve(user_data_obj);
            } else {
                resolve({
                  user_id : same_email_in_hr[0].ed_id,
                  employee_id : same_email_in_hr[0].ed_employee_id,
                  name_th : req.body.new_admin_division_name_th , 
                  name_en : req.body.new_admin_division_name_en , 
                  email : req.body.new_admin_division_email , 
                  division : req.body.new_admin_division_division
                });
            }
        } catch (error) {
            console.error("Error in prepare_user_data:", error);
            reject(error);
        }
    });
  }

  async function fetchData(user_data_obj) {
    try {
        let employee_ite_data = await axios.get(url_api_employee_ite);
        return employee_ite_data.data.filter(e => e.ed_email_ite === user_data_obj.email);
    } catch (error) {
        console.error("Error fetching employee data:", error);
        throw error;
    }
  }
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/user_log_out" , function(req , res){

  res.clearCookie('cr_user_app_id'); 
  res.clearCookie('cr_user_app_name_th'); 
  res.clearCookie('cr_user_app_surname_th'); 
  res.clearCookie('cr_user_app_name_en'); 
  res.clearCookie('cr_user_app_surname_en'); 
  res.clearCookie('cr_user_app_email'); 
  res.clearCookie('cr_user_app_division'); 
  res.clearCookie('cr_user_app_job_title'); 
  res.clearCookie('cr_user_app_office_location'); 

  res.redirect( powerapps_link )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////// FUNCTION SENT EMAIL ///////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const nodemailer = require('nodemailer');
const { resolve } = require('path');
const { rejects } = require('assert');
const { set } = require('local-storage');
const { isError } = require('util');

const transporter = nodemailer.createTransport({
  host : "smtp.office365.com" , 
  post : 587 ,
  secure : false ,
  auth: {
    user: 'tritasasp@synteccon.com',
    pass: 'Tr@903882'
  },
  tls: {
      ciphers:'SSLv3'
  }
});

async function send_email( rec_email , rec_name , email_title , email_description_header , link_title , link_herf , email_description_footer ){
  try {
    const mailOptions = {
      from: 'tritasasp@synteccon.com',
      to: rec_email ,
      subject: `${email_title}` ,
      html: `
      <!doctype html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            <title>Simple Transactional Email</title>
            <style>
              @media only screen and (max-width: 620px) {
                table.body h1 {
                  font-size: 28px !important;
                  margin-bottom: 10px !important;
                }
              
                table.body p,
              table.body ul,
              table.body ol,
              table.body td,
              table.body span,
              table.body a {
                  font-size: 16px !important;
                }
              
                table.body .wrapper,
              table.body .article {
                  padding: 10px !important;
                }
              
                table.body .content {
                  padding: 0 !important;
                }
              
                table.body .container {
                  padding: 0 !important;
                  width: 100% !important;
                }
              
                table.body .main {
                  border-left-width: 0 !important;
                  border-radius: 0 !important;
                  border-right-width: 0 !important;
                }
              
                table.body .btn table {
                  width: 100% !important;
                }
              
                table.body .btn a {
                  width: 100% !important;
                }
              
                table.body .img-responsive {
                  height: auto !important;
                  max-width: 100% !important;
                  width: auto !important;
                }
              }
              @media all {
                .ExternalClass {
                  width: 100%;
                }
              
                .ExternalClass,
              .ExternalClass p,
              .ExternalClass span,
              .ExternalClass font,
              .ExternalClass td,
              .ExternalClass div {
                  line-height: 100%;
                }
              
                .apple-link a {
                  color: inherit !important;
                  font-family: inherit !important;
                  font-size: inherit !important;
                  font-weight: inherit !important;
                  line-height: inherit !important;
                  text-decoration: none !important;
                }
              
                #MessageViewBody a {
                  color: inherit;
                  text-decoration: none;
                  font-size: inherit;
                  font-family: inherit;
                  font-weight: inherit;
                  line-height: inherit;
                }
              
                .btn-primary table td:hover {
                  background-color: #34495e !important;
                }
              
                .btn-primary a:hover {
                  background-color: #04884A !important;
                  border-color: #04884A !important;
                }
              }
            </style>
          </head>
          <body style="background-color: #f6f6f6; font-family: sans-serif; -webkit-font-smoothing: antialiased; font-size: 14px; line-height: 1.4; margin: 0; padding: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
            <span class="preheader" style="color: transparent; display: none; height: 0; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all; visibility: hidden; width: 0;">This is preheader text. Some clients will show this text as a preview.</span>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body" style="max-width: 600px; border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f6f6f6; width: 100%;" width="100%" bgcolor="#f6f6f6">
              <tr>
                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">&nbsp;</td>
                <td class="container" style="font-family: sans-serif; font-size: 14px; vertical-align: top; display: block; max-width: 580px; padding: 10px; width: 580px; margin: 0 auto;" width="580" valign="top">
                  <div class="content" style="box-sizing: border-box; display: block; margin: 0 auto; max-width: 580px; padding: 10px;">
                    <table role="presentation" class="main" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background: #ffffff; border-radius: 3px; width: 100%;" width="100%">
                      <tr>
                        <td class="wrapper" style="font-family: sans-serif; font-size: 14px; vertical-align: top; box-sizing: border-box; padding: 20px;" valign="top">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;" width="100%">
                            <tr>
                              <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                                <p style="font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0; margin-bottom: 15px;">
                                  ${rec_name}
                                </p>
                                <p style="max-width: 520px; font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0; margin-bottom: 15px;">
                                  ${email_description_header}
                                </p>
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="btn btn-primary" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; box-sizing: border-box; width: 100%;" width="100%">
                                  <tbody>
                                    <tr>
                                      <td align="left" style="width: 100%; font-family: sans-serif; font-size: 14px; vertical-align: top; padding-bottom: 15px;" valign="top">
                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100% !important; border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: auto;">
                                          <tbody>
                                            <tr>
                                              <td style="font-family: sans-serif; font-size: 14px; vertical-align: top; border-radius: 5px; text-align: center; background-color: #3498db;" valign="top" align="center" bgcolor="#3498db">
                                                <a href="${link_herf}" target="_blank" style="width: 100% !important; border: solid 1px #50B748; border-radius: 5px; box-sizing: border-box; cursor: pointer; display: inline-block; font-size: 14px; font-weight: bold; margin: 0; padding: 12px 25px; text-decoration: none; text-transform: capitalize; background-color: #50B748; border-color: #50B748; color: #ffffff;">
                                                ${link_title}
                                                </a>
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                                <p style="font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0; margin-bottom: 15px;">
                                  ${email_description_footer}
                                </p>
                                <p style="font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0; margin-bottom: 15px;">ขอแสดงความนับถือ</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <div class="footer" style="clear: both; margin-top: 10px; text-align: center; width: 100%;">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;" width="100%">
                        <tr>
                          <td class="content-block" style="font-family: sans-serif; vertical-align: top; padding-bottom: 10px; padding-top: 10px; color: #999999; font-size: 12px; text-align: center;" valign="top" align="center">
                            <span class="apple-link" style="color: #999999; font-size: 12px; text-align: center;">SYNTECH CONSTRUCTION PUBLIC COMPANY LIMITED</span>
                          </td>
                        </tr>
                        <tr>
                          <td class="content-block powered-by" style="font-family: sans-serif; vertical-align: top; padding-bottom: 10px; padding-top: 10px; color: #999999; font-size: 12px; text-align: center;" valign="top" align="center">
                            พบปัญหาการใช้งาน กรุณาติดต่อ DIS <br> - - - - -
                          </td>
                        </tr>
                      </table>
                    </div>
                  </div>
                </td>
                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">&nbsp;</td>
              </tr>
            </table>
          </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log(`Email sent: ${info.response}`);
  } catch (error) {
    console.log("error to send email");
    console.log(error.toString());
  }
}

module.exports = router;

// 
