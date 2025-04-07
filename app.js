//. app.js
var express = require( 'express' ),
    bodyParser = require( 'body-parser' ),
    fs = require( 'fs' ),
    multer = require( 'multer' ),
    OpenAI = require( 'openai' ),
    app = express();

require( 'dotenv' ).config();

//var APIKEY = 'OPENAI_API_KEY' in process.env && process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY : '';
var DEFAULT_PROMPT = 'DEFAULT_PROMPT' in process.env && process.env.DEFAULT_PROMPT ? process.env.DEFAULT_PROMPT : '';
var DEFAULT_MODEL = 'DEFAULT_MODEL' in process.env && process.env.DEFAULT_MODEL ? process.env.DEFAULT_MODEL : 'gpt-4o-mini';
var openai = new OpenAI();

app.use( multer( { dest: './tmp/' } ).single( 'image' ) );
app.use( bodyParser.urlencoded( { extended: true } ) );
app.use( bodyParser.json() );
app.use( express.Router() );
app.use( express.static( __dirname + '/public' ) );

var cors = 'CORS' in process.env ? process.env.CORS : '';
app.all( '/*', function( req, res, next ){
  if( cors ){
    res.setHeader( 'Access-Control-Allow-Origin', cors );
    res.setHeader( 'Access-Control-Allow-Methods', '*' );
    res.setHeader( 'Access-Control-Allow-Headers', '*' );
    res.setHeader( 'Vary', 'Origin' );
  }
  next();
});

app.post( '/api/gptvision-buffer', async function( req, res ){
  res.contentType( 'application/json; charset=utf8' );
  if( req.file && req.file.path ){
    var path = req.file.path;
    var filename = req.file.originalname;
    var mimetype = req.file.mimetype;
    var prompt = req.body.prompt ? req.body.prompt : DEFAULT_PROMPT;
    var model = req.body.model ? req.body.model : DEFAULT_MODEL;

    var base64image = fs.readFileSync( path, "base64" );
    var completion = await openai.chat.completions.create({
      model: model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: 'data:' + mimetype + ';base64,' + base64image
            }
          }
        ]
      }]
    });

    fs.unlinkSync( path );

    if( completion && completion.choices && completion.choices[0] && completion.choices[0].message ){
      res.write( JSON.stringify( { status: true, content: completion.choices[0].message.content }, null, 2 ) );
      res.end();
    }else{
      res.status( 400 );
      console.log( {completion} );
      res.write( JSON.stringify( { status: false, error: 'no completion returned.' }, null, 2 ) );
      res.end();
    }
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: false, error: 'no file uploaded.' }, null, 2 ) );
    res.end();
  }
});

app.post( '/api/gptvision-base64', async function( req, res ){
  res.contentType( 'application/json; charset=utf8' );
  if( req.body && req.body.base64 ){
    var prompt = req.body.prompt ? req.body.prompt : DEFAULT_PROMPT;
    var model = req.body.model ? req.body.model : DEFAULT_MODEL;

    var base64 = req.body.base64; //. 'data:image/png;base64,xxxxx'
    var completion = await openai.chat.completions.create({
      model: model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: base64
            }
          }
        ]
      }]
    });

    if( completion && completion.choices && completion.choices[0] && completion.choices[0].message ){
      res.write( JSON.stringify( { status: true, content: completion.choices[0].message.content }, null, 2 ) );
      res.end();
    }else{
      res.status( 400 );
      console.log( {completion} );
      res.write( JSON.stringify( { status: false, error: 'no completion returned.' }, null, 2 ) );
      res.end();
    }
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: false, error: 'no base64 image found.' }, null, 2 ) );
    res.end();
  }
});

var port = process.env.PORT || 8080;
app.listen( port );
console.log( "server starting on " + port + " ..." );

module.exports = app;
