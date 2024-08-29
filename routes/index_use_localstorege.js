var express = require('express');
var dayjs = require('dayjs');
var locale_de = require('dayjs/locale/th')
var router = express.Router();
let formidable = require('formidable')
let fs = require('fs');
// let LocalStorage = require('node-localstorage').LocalStorage;
// localStorage = new LocalStorage('./scratch');
const localStorage = require('local-storage');

router.use(express.static(__dirname+"/public"));

let mysql = require('mysql');

let condb = mysql.createConnection({
  host : "localhost" , 
  user : "root" ,
  password : "" ,
  database : "db_recruit"
})

condb.connect( function(e){
  if(e){
    throw e ;
  }
  console.log("connect to db_recruit success 123");
} )

// let condb_employee = mysql.createConnection({
//   host : "localhost" , 
//   user : "root" ,
//   password : "" ,
//   database : "db_employee_ite"
// })

// condb_employee.connect( function(e){
//   if(e){
//     throw e ;
//   }
//   console.log("connect to db_employee_ite success 123");
// } )

let url_now = "http://172.16.7.144:7000"

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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get('/', function(req, res, next) {
  console.log("shdauishdaohdoia")
  res.render('index' , { user_data : JSON.parse(localStorage.get(`user_data`)) });
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get('/table', function(req, res, next) {
  console.log("shdauishdaohdoia")
  res.render('table' , { user_data : JSON.parse(localStorage.get(`user_data`)) });
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/login_from_powerapps/:fullname/:division/:email/:powerapps_id" , function(req , res){

  let fullname = req.params.fullname
  let division = req.params.division
  let email = req.params.email
  let powerapps_id = req.params.powerapps_id

  let sql_1 = `SELECT * FROM tb_user WHERE us_email = ?`
  let sql_2 = `INSERT INTO tb_user ( us_fullname , us_division , us_email , us_powerappID ) VALUE ( ? , ? , ? , ? )`

  condb.query( sql_1 , email , function(err , result){
    if(err){throw err}
    if( result.length > 0 ){
      login_old_user( email )
    }else{
      login_new_user( fullname , division , email , powerapps_id )
    }

    function login_old_user( email ){
      condb.query( sql_1 , email , function(err , result){
        if(err){throw err}
        
        const user_data = {
          user_id : result[0].us_id ,
          user_email : result[0].us_email ,
          user_fullname : result[0].us_fullname ,
          user_division : result[0].us_division ,
          user_powerappID : result[0].us_powerappID ,
          user_row_1 : result[0].us_row_1 , 
          user_row_2 : result[0].us_row_2 , 
          user_row_3 : result[0].us_row_3 ,
          user_enable : result[0].us_enable 
        }

        //// *** USE NODE LOCALSTORAGE *** ///
        // localStorage.setItem(`user_data_${result[0].us_id}`, JSON.stringify(user_data));
        // console.log(`JSON.parse(localStorage.getItem("user_data"))`)
        // console.log(JSON.parse(localStorage.getItem(`user_data_${result[0].us_id}`)))

        localStorage.set('user_data', JSON.stringify(user_data));
        console.log(JSON.parse(localStorage.get(`user_data`)))
        
        res.redirect( "/manpower_doc_list" )
      })
    }

    function login_new_user( fullname , division , email , powerapps_id ){
      condb.query( sql_2 , [ fullname , division , email , powerapps_id ] , function(err , result){
        if(err){throw err}
        login_old_user( email )
      } )
    }
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/user_list" , function(req , res){
  
  let sql_1 = `SELECT * FROM tb_user WHERE tb_user.us_enable = "ใช้งาน" ORDER BY tb_user.us_id DESC`

  condb.query( sql_1 , function(err , result){
    if(err){throw err}
    let user_list = result

    console.log(JSON.parse(localStorage.get(`user_data`)))
    res.render( "user_list" , { user_data : JSON.parse(localStorage.get(`user_data`)) , user_list : user_list } )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/manpower_doc_list" , function(req , res){
  
  let sql_1 = `SELECT * FROM tb_manpower_doc WHERE tb_manpower_doc.md_create_email = ? ORDER BY tb_manpower_doc.md_id DESC`
  let sql_2 = `SELECT * FROM tb_manpower_doc_company_setected WHERE tb_manpower_doc_company_setected.md_cs_enable = "ใช้งาน"`

  condb.query( sql_1 , JSON.parse(localStorage.get(`user_data`)).user_email , function(err , result){
    if(err){throw err}
    let manpower_doc_list_data = result

    condb.query( sql_2 , function(err , result){
      if(err){throw err}
      let company_select_data = result

      res.render( "manpower_doc_list" , { user_data : JSON.parse(localStorage.get(`user_data`)) , manpower_doc_list_data : manpower_doc_list_data , company_select_data : company_select_data , dayjs : dayjs } )
    } )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post( "/create_manpower_doc" , function(req , res){
  let date = new Date();
  let timestamp = Date.now();
  let company_id = req.body.company_id
  let company_code = req.body.company_code

  let sql_1 = `INSERT INTO tb_manpower_doc (md_create_id , md_create_name , md_create_email , md_create_division , md_create_timestamp , md_company_id	, md_company_code ) VALUE ( ? , ? , ? , ? , ? , ? , ? )`
  let input_1 = [ 
    JSON.parse(localStorage.get(`user_data`)).user_id , 
    JSON.parse(localStorage.get(`user_data`)).user_fullname , 
    JSON.parse(localStorage.get(`user_data`)).user_email , 
    JSON.parse(localStorage.get(`user_data`)).user_division ,
    timestamp , 
    company_id , 
    company_code
   ]

   let sql_2 = `SELECT * FROM tb_manpower_doc WHERE tb_manpower_doc.md_create_email = ? AND tb_manpower_doc.md_create_timestamp = ? AND tb_manpower_doc.md_company_id = ?`
   let input_2 = [ 
    JSON.parse(localStorage.get(`user_data`)).user_email , 
    timestamp , 
    company_id 
   ]

   condb.query( sql_1 , input_1 , function(err , result){
    if(err){throw err}
    
    condb.query( sql_2 , input_2 , function(err , result){
      if(err){throw err}
      
      if( result.length > 0 ){
        res.contentType('application/json');
        let nextPage = JSON.stringify(`${url_now}/manpower_doc_edit/${btoa(result[0].md_id)}`)
        res.header('Content-Length', nextPage.length);
        res.end(nextPage);
      }else{
        res.contentType('application/json');
        let nextPage = JSON.stringify(`${url_now}/`)
        res.header('Content-Length', nextPage.length);
        res.end(nextPage);
      }
     } )
   } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get( "/manpower_doc_edit/:manpower_doc_code_id" , function(req , res){
  let manpower_doc_id = atob(req.params.manpower_doc_code_id)

  let sql_1 = `SELECT * FROM tb_manpower_doc WHERE tb_manpower_doc.md_id = ?`

  condb.query( sql_1 , manpower_doc_id , function(err , result){
    if(err){throw err}
    let manpower_doc_data = result

    res.render( "manpower_doc_edit" , {user_data : JSON.parse(localStorage.get(`user_data`)) , manpower_doc_data : manpower_doc_data , dayjs : dayjs} )
  } )
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports = router;
